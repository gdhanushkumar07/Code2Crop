import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchAQIAndClimateContext } from "@/lib/climate";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are Crop2Code AI, an expert agricultural advisor for Indian farmers.
Your primary objective is to deliver localized, agronomically sound, and economically viable advice.
You are concise, helpful, and speak in a friendly, conversational tone. Keep responses under 200 words.

Always reply in the farmer's preferred language. If they query in Telugu, reply in Telugu. If in Hindi, reply in Hindi. If in Tamil, reply in Tamil. If in Kannada, reply in Kannada. Otherwise, default to English.

CRITICAL RULES:
1. NEVER output, print, or mention any tool/command names (such as "get_weather_advisory", "get_crop_recommendation", or "escalate_to_human_expert") in your text. Speak ONLY in natural, conversational sentences.
2. If the user asks about crops other than the top 3 recommended ones in your context, DO NOT refuse to answer or immediately offer to escalate. Use your general agronomic knowledge to discuss the suitability, soil types, and water needs of those alternative crops.
3. If you perform a leaf spot analysis and the confidence is low (below 65%) or the issue is severe, OR if you cannot answer a complex query, ask the farmer: "Shall I escalate this to a human expert at Rythu Seva Kendra (RSK)?"
4. ONLY offer escalation when confidence is low or the user specifically requests expert help. Do not escalate automatically or offer it for normal queries.
5. If the farmer wants to escalate their case, but coordinates/location coordinates are not recorded in your context (check user coordinates/location under profile context), you MUST ask the user to share their location coordinates first. Instruct them to click the GPS button or allow location access on the website. Do not confirm or process the escalation until they provide their coordinates.
`;

async function fetchOpenMeteoWeather(lat: number, lon: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return {
      temp: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      rain_today: data.daily.precipitation_sum[0],
      max_temp: data.daily.temperature_2m_max[0],
      min_temp: data.daily.temperature_2m_min[0],
    };
  } catch (err) {
    console.error("Open-Meteo fetch failed:", err);
    return null;
  }
}

// POST /api/chat/message
// Persists farmer message and generates AI response dynamically
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, message } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: "Missing userId or message" },
        { status: 400 }
      );
    }

    const messageData = {
      ...message,
      createdAt: Date.now(),
      platform: "web",
    };

    // Save farmer message to Firestore
    await db.collection("chats").doc(userId).set({
      userId,
      updatedAt: Date.now(),
      lastMessage: message.text,
      platform: "web"
    }, { merge: true });

    await db
      .collection("chats")
      .doc(userId)
      .collection("messages")
      .doc(message.id || String(Date.now()))
      .set(messageData);

    // If the message was sent by AI, just return success
    if (message.sender === "ai") {
      return NextResponse.json({ success: true, id: messageData.id });
    }

    // Load conversation history for Gemini context (sorted in-memory to prevent index requirements)
    const historySnapshot = await db
      .collection("chats")
      .doc(userId)
      .collection("messages")
      .where("platform", "==", "web")
      .get();

    const historyDocs = historySnapshot.docs;
    historyDocs.sort((a, b) => {
      const da = a.data().createdAt;
      const db = b.data().createdAt;
      const timeA = typeof da === "number" ? da : new Date(da || 0).getTime();
      const timeB = typeof db === "number" ? db : new Date(db || 0).getTime();
      return timeB - timeA; // desc
    });

    const limitedDocs = historyDocs.slice(0, 10);

    const history = limitedDocs
      .reverse()
      .map((doc) => {
        const d = doc.data();
        return `${d.sender === "farmer" ? "Farmer" : "AI"}: ${d.text}`;
      })
      .join("\n");

    // Fetch farmer profile context
    const userDoc = await db.collection("users").doc(userId).get();
    const user = userDoc.exists ? userDoc.data() : null;

    let localGrounding = `User profile context:
- Name: ${user?.displayName || "Farmer"}
- Preferred Language: ${user?.language || "en"}
- Village Name: ${user?.villageName || "Unknown"}
- Soil/Crop Details: ${user?.cropDetails || "Unknown"}`;

    if (user?.cropSuitability) {
      localGrounding += `\n- Current Crop Suitability Recommendations:\n${JSON.stringify(user.cropSuitability, null, 2)}`;
    }

    const activeCoordinates = message.location || user?.coordinates;

    if (activeCoordinates) {
      localGrounding += `\n- Coordinates: Latitude ${activeCoordinates.latitude}, Longitude ${activeCoordinates.longitude}`;
      const weather = await fetchOpenMeteoWeather(activeCoordinates.latitude, activeCoordinates.longitude);
      if (weather) {
        localGrounding += `\n- Real-time weather at coordinates: Temp: ${weather.temp}°C, Humidity: ${weather.humidity}%, Rain today: ${weather.rain_today}mm, Forecast: ${weather.min_temp}°C to ${weather.max_temp}°C`;
      }
      
      const climateContext = await fetchAQIAndClimateContext(activeCoordinates.latitude, activeCoordinates.longitude);
      localGrounding += climateContext;
    }

    // Check if the user is confirming a previous escalation request
    let isEscalated = false;
    let systemNotice = "";
    
    // Find the latest AI message before the user's latest message
    const lastAiDoc = limitedDocs.find(doc => doc.data().sender === "ai");
    const lastAiText = lastAiDoc ? lastAiDoc.data().text || "" : "";
    
    // AI offered escalation if keywords are present in previous AI response
    const offeredEscalation = /escalat|rythu seva|rsk|human expert|నిపుణుల|విశేషజ్ఞుడు|विशेषज्ञ/i.test(lastAiText);
    
    // Affirmative response from farmer
    const isConfirming = /^(yes|yep|sure|please|do it|okay|ok|agree|అవును|సరే|హాఁ|ठीक है|करो)/i.test(message.text?.trim() || "");

    // Hoisted to outer scope so it can be returned in the final response payload
    let caseId = "";

    if (offeredEscalation && isConfirming) {
      isEscalated = true;

      // Generate a human-readable Case ID: RSK-YYYYMMDD-XXXX
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randPart = Math.floor(1000 + Math.random() * 9000);
      caseId = `RSK-${datePart}-${randPart}`;

      const coords = activeCoordinates || null;
      
      let finalLat = coords?.latitude || null;
      let finalLng = coords?.longitude || null;
      if (finalLat === null || finalLng === null || isNaN(finalLat) || isNaN(finalLng)) {
        // Fallback coordinates consistently seeded based on timestamp
        const seed = Date.now() % 100;
        finalLat = 18.4386 + (seed / 100) * 0.16 - 0.08;
        finalLng = 79.1288 + (((seed >> 2) % 100) / 100) * 0.16 - 0.08;
      }

      // Fallback location formatting if descriptive villageName is missing
      const locationString = user?.villageName && user.villageName !== "Unknown" && user.villageName !== "Updated Location"
        ? user.villageName 
        : `${finalLat.toFixed(6)}, ${finalLng.toFixed(6)}`;

      await db.collection("cases").doc(caseId).set({
        id: caseId,
        userId: userId,
        farmerName: user?.displayName || "Farmer",
        farmerPhone: user?.phone || "",
        village: locationString,
        crop: user?.cropDetails || "General",
        issue: "Escalated case request by farmer",
        severity: "high",
        confidence: 1.0,
        image: user?.photoURL || "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=150&q=80",
        status: "pending",
        createdAt: Date.now(),
        lat: finalLat,
        lng: finalLng,
        description: `Farmer confirmed escalation. Last AI prompt context: "${lastAiText.substring(0, 200)}..."`,
      });

      systemNotice = `\n\n[SYSTEM NOTICE: Case successfully escalated. The unique case reference ID is: ${caseId}. You MUST include this exact case ID in your response to the farmer so they can reference it later. Example: "Your case has been registered with ID: ${caseId}"]`;
    }

    // Call Gemini to generate response
    let aiResponseText = "";
    let diseaseResultObj = null;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

      const prompt = `${SYSTEM_PROMPT}
      
${localGrounding}
${systemNotice}

Conversation History:
${history}

Farmer's latest message: ${message.text || "[Image attached]"}
${message.imageUrl ? `[The farmer also attached a leaf photo: ${message.imageUrl}. Perform visual disease diagnostic analysis. If confidence is low (< 65%), suggest/ask the farmer if they want to escalate to RSK]` : ""}

Your response (reply directly in the farmer's preferred language):`;

      const result = await model.generateContent(prompt);
      aiResponseText = result.response.text();

      // Check if image disease details need to be parsed
      if (message.imageUrl) {
        const isBlight = aiResponseText.toLowerCase().includes("blight");
        diseaseResultObj = {
          diseaseName: isBlight ? "Early Leaf Spot / Leaf Blight" : "Leaf Spot (Suspicious Symptoms)",
          confidence: isBlight ? 0.88 : 0.58, // Heuristic: low confidence if it's not a clear blight
          severity: isBlight ? "medium" : "high",
          treatment: [
            "Apply Chlorothalonil fungicide (2.0 g/L water) if spread increases.",
            "Remove infected debris immediately to prevent spore dispersal.",
            "Avoid sprinkler irrigation to minimize foliage moisture duration.",
          ],
        };
      }
    } catch (aiError: any) {
      console.error("Gemini processing error:", aiError?.message || aiError, JSON.stringify(aiError?.response?.data || ""));
      aiResponseText = "Namaste! I'm experiencing a temporary connection issue with my AI engine. Please try again in a moment. If this persists, you can reach out to your local Rythu Seva Kendra (RSK) for immediate help.";
    }

    // Sanitize any accidentally leaked command names
    aiResponseText = aiResponseText
      .replace(/get_weather_advisory/gi, "")
      .replace(/get_crop_recommendation/gi, "")
      .replace(/escalate_to_human_expert/gi, "")
      .replace(/`{1,3}/g, "")
      .trim();

    // Save AI response to Firestore
    const aiMessageId = `msg_${Date.now() + 1}`;
    const aiMessageData: any = {
      id: aiMessageId,
      sender: "ai",
      text: aiResponseText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      platform: "web",
      createdAt: Date.now() + 1,
    };
    if (diseaseResultObj) {
      aiMessageData.diseaseResult = diseaseResultObj;
    }

    await db.collection("chats").doc(userId).set({
      userId,
      updatedAt: Date.now(),
      lastMessage: aiResponseText,
      platform: "web"
    }, { merge: true });

    await db
      .collection("chats")
      .doc(userId)
      .collection("messages")
      .doc(aiMessageId)
      .set(aiMessageData);

    return NextResponse.json({
      success: true,
      id: messageData.id,
      caseId: isEscalated ? caseId : null,
      aiMessage: aiMessageData,
    });
  } catch (error) {
    console.error("Error generating chat response:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
