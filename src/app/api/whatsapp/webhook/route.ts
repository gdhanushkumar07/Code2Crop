import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import twilio from "twilio";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Normalize the WhatsApp number by stripping spaces to ensure E.164 format
// e.g. "whatsapp:+1 415 523 8886" -> "whatsapp:+14155238886"
function getFromWhatsAppNumber(): string {
  const raw = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
  return raw.replace(/\s+/g, "");
}
import { fetchAQIAndClimateContext } from "@/lib/climate";
import { synthesize, VOICE_MAP } from "@/lib/tts";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are Crop2Code AI, an expert agricultural advisor for Indian farmers.
Your primary objective is to deliver localized, agronomically sound, and economically viable advice.
You are concise, helpful, and speak in a friendly, conversational tone. Keep responses under 200 words.

Always reply in the farmer's preferred language. If their preference is Telugu, reply in Telugu. If Hindi, reply in Hindi. If Tamil, reply in Tamil. If Kannada, reply in Kannada. Otherwise, default to English.

CLASSIFICATION RULE (CRITICAL):
If the farmer sends an image, you MUST evaluate it and prepend one of the following exact tags to your reply:
- [NO_CROP_IMAGE] - Use this if the uploaded photo is NOT a crop, plant, leaf, agricultural scene, or farm item (e.g. if it is a dog, a car, a selfie, a laptop screen, etc.). Explain politely that you can only analyze crops and plants.
- [HEALTHY_CROP] - Use this if the photo is a crop/plant but it looks healthy and there is no sign of disease, pest, or damage.
- [DISEASED_CROP] - Use this if the photo is a crop/plant and shows signs of disease, pests, damage, low classification confidence (<65%), or requires expert/human intervention.
For text-only messages, always prepend [TEXT_ONLY].

CRITICAL RULES:
1. NEVER output, print, or mention any tool/command names (such as "get_weather_advisory", "get_crop_recommendation", or "escalate_to_human_expert") in your text. Speak ONLY in natural, conversational sentences.
2. If the user asks about crops other than the top 3 recommended ones in your context, DO NOT refuse to answer or immediately offer to escalate. Use your general agronomic knowledge to discuss the suitability, soil types, and water needs of those alternative crops.
3. If you perform a leaf spot analysis and the confidence is low (below 65%) or the issue is severe, OR if you cannot answer a complex query, ask the farmer: "Shall I escalate this to a human expert at Rythu Seva Kendra (RSK)?"
4. ONLY offer escalation when confidence is low or the user specifically requests expert help. Do not escalate automatically or offer it for normal queries.
5. If the farmer wants to escalate their case, but coordinates/location coordinates are not recorded in your context (check Coordinates under user profile context), you MUST ask the user to share their location coordinates first. Instruct them to use WhatsApp's 'Share Location' feature. Do not confirm or process the escalation until they provide their coordinates.
`;

// Weather helper using Open-Meteo API
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

// Handler for incoming Twilio messages
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const from = formData.get("From") as string; // e.g. "whatsapp:+919876543210"
    const body = (formData.get("Body") as string || "").trim();
    const mediaUrl = formData.get("MediaUrl0") as string | null;
    const mediaContentType = formData.get("MediaContentType0") as string | null;
    const numMedia = formData.get("NumMedia") as string | null;
    const latitude = formData.get("Latitude") as string | null;
    const longitude = formData.get("Longitude") as string | null;

    if (!from) {
      return NextResponse.json({ error: "Missing From parameter" }, { status: 400 });
    }

    const phone = from.replace("whatsapp:", "").trim();
    const userId = `wa_${phone.replace("+", "").replace(/\s+/g, "")}`;
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // 1. Fetch or initialize the user's profile
    const userDocRef = db.collection("users").doc(userId);
    const userDoc = await userDocRef.get();
    let user = userDoc.exists ? userDoc.data() : null;

    // Resolve linked Google profile if synced
    let linkedUser: any = null;
    if (user && user.linkedGoogleUid) {
      try {
        const linkedDoc = await db.collection("users").doc(user.linkedGoogleUid).get();
        if (linkedDoc.exists) {
          linkedUser = linkedDoc.data();
          console.log(`Loaded synced Google profile ${user.linkedGoogleUid} for WhatsApp user ${userId}`);
        }
      } catch (err) {
        console.error("Failed to load linked Google profile:", err);
      }
    }

    // Check if we need to start onboarding
    if (!user) {
      user = {
        uid: userId,
        phone,
        onboardingStatus: "IN_PROGRESS",
        onboardingStep: "NAME",
        createdAt: Date.now(),
      };
      await userDocRef.set(user);

      const reply = "Welcome to Crop2Code AI! 🌾 Let's get you registered. What is your full name?";
      await saveMessage(userId, "ai", reply, timestamp);
      await sendWhatsAppMessage(from, reply);
      return returnTwiML();
    }

    // 2. Process onboarding if in progress
    if (user.onboardingStatus === "IN_PROGRESS") {
      let reply = "";
      const step = user.onboardingStep;

      if (step === "NAME") {
        if (!body) {
          reply = "Please enter your name to proceed.";
        } else {
          user.displayName = body;
          user.onboardingStep = "LANGUAGE";
          reply = `Nice to meet you, ${body}! What language would you like to chat in? \n\nPlease reply with: English, Hindi, Telugu, Tamil, or Kannada.`;
        }
      } else if (step === "LANGUAGE") {
        const choice = body.toLowerCase();
        let lang = "en";
        if (choice.includes("telugu") || choice.includes("తెలుగు")) lang = "te";
        else if (choice.includes("hindi") || choice.includes("हिंदी")) lang = "hi";
        else if (choice.includes("tamil") || choice.includes("தமிழ்")) lang = "ta";
        else if (choice.includes("kannada") || choice.includes("ಕನ್ನಡ")) lang = "kn";

        user.language = lang;
        user.onboardingStep = "LOCATION";
        reply = "Got it! Please share your current location (click the 📎 attachment icon, select Location -> Send current location) or reply typing your village name.";
      } else if (step === "LOCATION") {
        if (latitude && longitude) {
          user.coordinates = {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          };
          user.villageName = "Shared Coordinates";
          user.onboardingStep = "CROP";
          reply = "Location successfully linked! 📍 What crop are you growing this season, and what is your soil type if known (e.g. Paddy on Clay soil)?";
        } else if (body) {
          user.villageName = body;
          user.onboardingStep = "CROP";
          reply = `Location saved as "${body}". What crop are you growing this season, and what is your soil type if known (e.g. Paddy on Clay soil)?`;
        } else {
          reply = "Please share your location coordinates or type your village name.";
        }
      } else if (step === "CROP") {
        if (!body) {
          reply = "Please tell me what crops you grow to finish registration.";
        } else {
          user.cropDetails = body;
          user.onboardingStatus = "COMPLETE";
          user.onboardingStep = null;
          reply = "Setup complete! 🎉 I am Crop2Code AI, your personal agricultural assistant. You can ask me about weather, crop choices, or send a photo of a diseased leaf for instant diagnostics. How can I help you today?";
        }
      }

      await userDocRef.set(user);
      await saveMessage(userId, "farmer", body || "[Media/Location shared]", timestamp);
      await saveMessage(userId, "ai", reply, timestamp);
      await sendWhatsAppMessage(from, reply);
      return returnTwiML();
    }

    // 3. Normal conversation flow - detect media type
    let mediaType: "none" | "image" | "audio" = "none";
    let transcribedAudioText = "";
    let imageBase64: { mimeType: string; data: string } | null = null;

    if (mediaContentType) {
      if (mediaContentType.startsWith("audio/")) mediaType = "audio";
      else if (mediaContentType.startsWith("image/")) mediaType = "image";
    } else if (mediaUrl && numMedia && parseInt(numMedia) > 0) {
      mediaType = "image";
    }

    // If audio, download and transcribe via Groq Whisper with auto language detection
    let detectedLanguage = "";
    if (mediaType === "audio" && mediaUrl) {
      try {
        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
        const audioRes = await fetch(mediaUrl, { headers: { Authorization: `Basic ${auth}` } });

        if (!audioRes.ok) {
          console.error("Twilio media download failed:", audioRes.status, "for", mediaUrl);
        } else {
          const contentType = audioRes.headers.get("content-type") || "audio/ogg";
          const arrayBuffer = await audioRes.arrayBuffer();
          console.log("Audio downloaded:", arrayBuffer.byteLength, "bytes, type:", contentType);

          // Use global Blob constructor (not the undici-internal one from response.blob())
          // to ensure compatibility with FormData multipart serialization
          const audioFile = new Blob([arrayBuffer], { type: contentType });
          const groqForm = new FormData();
          groqForm.append("file", audioFile, "audio.ogg");
          groqForm.append("model", "whisper-large-v3");
          groqForm.append("response_format", "verbose_json");

          const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
            body: groqForm,
          });

          if (groqRes.ok) {
            const groqData = await groqRes.json();
            transcribedAudioText = groqData.text || "";
            detectedLanguage = (groqData.language || "").toLowerCase().trim();
            console.log("Groq transcription success:", { text: transcribedAudioText?.substring(0, 100), language: detectedLanguage });
          } else {
            const errText = await groqRes.text();
            console.error("Groq Whisper API error:", groqRes.status, errText);
          }
        }
      } catch (err) {
        console.error("Audio transcription error:", err);
      }
    }

    // Map Groq language names to ISO codes
    const LANG_MAP: Record<string, string> = {
      "telugu": "te", "te": "te",
      "hindi": "hi", "hi": "hi",
      "kannada": "kn", "kn": "kn",
      "tamil": "ta", "ta": "ta",
      "marathi": "mr", "mr": "mr",
      "english": "en", "en": "en",
    };
    const voiceLang = LANG_MAP[detectedLanguage] || user?.language || "en";

    // If image, download for Gemini Vision analysis and persist to Firestore
    let persistentImageUrl = "";
    if (mediaType === "image" && mediaUrl) {
      try {
        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
        const imgRes = await fetch(mediaUrl, { headers: { Authorization: `Basic ${auth}` } });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const mime = imgRes.headers.get("content-type") || "image/jpeg";
          imageBase64 = { mimeType: mime, data: buffer.toString("base64") };

          // Save image to Firestore and serve via API route (works on Railway)
          const imageId = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          await db.collection("case-images").doc(imageId).set({
            mimeType: mime,
            data: buffer.toString("base64"),
            createdAt: Date.now(),
          });
          persistentImageUrl = `/api/case-image/${imageId}`;
        }
      } catch (err) {
        console.error("Failed to fetch image for vision analysis:", err);
      }
    }

    // Determine effective message text for the AI
    let effectiveMessage = body;
    let mediaContext = "";

    if (latitude && longitude) {
      effectiveMessage = effectiveMessage || "[Location Shared]";
      mediaContext = `\n[The farmer shared location: Latitude ${latitude}, Longitude ${longitude}]`;
    } else if (mediaType === "audio") {
      if (transcribedAudioText) {
        effectiveMessage = transcribedAudioText;
        const detectedInfo = detectedLanguage ? ` (detected: ${detectedLanguage})` : "";
        mediaContext = `\n[The farmer sent a voice message. Transcription: "${transcribedAudioText}"${detectedInfo}]`;
      } else {
        effectiveMessage = effectiveMessage || "[Voice message received]";
        mediaContext = `\n[The farmer sent a voice message but transcription failed. Ask them to try again or type their query.]`;
      }
    } else if (mediaType === "image") {
      effectiveMessage = effectiveMessage || "[Image Uploaded]";
      mediaContext = `\n[The farmer attached a leaf photo. Perform visual disease diagnostic analysis.]`;
    } else if (mediaUrl && mediaType === "none") {
      effectiveMessage = effectiveMessage || "[Media shared]";
      mediaContext = `\n[The farmer shared a file (${mediaContentType || "unknown type"})]`;
    }

    // Save incoming farmer message
    const incomingText = effectiveMessage || "[Media shared]";
    await saveMessage(userId, "farmer", incomingText, timestamp, mediaType === "image" ? persistentImageUrl || undefined : undefined);

    // Check if location shared during chat
    if (latitude && longitude) {
      user.coordinates = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      };
      user.villageName = "Updated Location";
      await userDocRef.set(user);
    }

    // Check for active admin-escalated case — disable AI if admin is already chatting
    const activeCasesSnapshot = await db
      .collection("cases")
      .where("userId", "==", userId)
      .get();

    const activeCase = activeCasesSnapshot.docs.find((doc) => {
      const data = doc.data();
      return data.status !== "resolved" && (data.rskReplyCount || 0) > 0;
    });

    if (activeCase) {
      // Admin is actively chatting on this case — disable AI, just acknowledge and log
      await saveMessage(userId, "ai", "Your case is being reviewed by an RSK officer. They will respond to you shortly.", timestamp);
      await sendWhatsAppMessage(from, "Your case is being reviewed by an RSK officer. They will respond to you shortly.");
      return returnTwiML();
    }

    // 4. Generate AI response
    let aiResponseText = "";
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ],
      });

      // Gather last 10 messages for context (sorted in-memory to prevent index requirements)
      const historySnapshot = await db
        .collection("chats")
        .doc(userId)
        .collection("messages")
        .where("platform", "==", "whatsapp")
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

      // Custom weather & crop grounding context (syncs with website dashboard if linked)
      let localGrounding = `User profile context:
- Name: ${linkedUser?.displayName || user.displayName || "Farmer"}
- Preferred Language: ${user.language || "en"}
- Village Name: ${linkedUser?.villageName || user.villageName || "Unknown"}
- Soil/Crop Details: ${linkedUser?.cropDetails || user.cropDetails || "Unknown"}`;

      const activeCoords = linkedUser?.coordinates || user.coordinates;

      if (linkedUser && linkedUser.homeHub) {
        localGrounding += `\n- Synced Website Home Hub metrics (use this telemetry for weather or soil status if requested):
  * Temperature: ${linkedUser.homeHub.currentTemp}
  * Humidity: ${linkedUser.homeHub.humidity}
  * Wind Speed: ${linkedUser.homeHub.windSpeed}
  * Rain Probability: ${linkedUser.homeHub.rainProbability}
  * Soil Moisture: ${linkedUser.homeHub.soilMoisture}
  * Vegetation Index (NDVI): ${linkedUser.homeHub.ndvi}
  * Groundwater level: ${linkedUser.homeHub.groundwater}
  * Air Quality (AQI): ${linkedUser.homeHub.aqi}
  * UV Index: ${linkedUser.homeHub.uvIndex}
  * Precipitation: ${linkedUser.homeHub.precipitation}
  * Surface Pressure: ${linkedUser.homeHub.pressure}`;
      }

      if (linkedUser && linkedUser.cropSuitability) {
        localGrounding += `\n- Synced Website Crop Suitability Recommendations (always refer to these exact options and details if the user asks for crop choices or recommendations):`;
        linkedUser.cropSuitability.forEach((c: any) => {
          localGrounding += `\n  * Crop: ${c.name} (${c.suitability}% suitability, Expected Yield: ${c.yield}, Market Returns: ${c.profit}, Soil Requirement: ${c.soilHealth}, Details: ${c.details})`;
        });
      }

      if (activeCoords) {
        localGrounding += `\n- Coordinates: Latitude ${activeCoords.latitude}, Longitude ${activeCoords.longitude}`;
        if (!linkedUser?.homeHub) {
          const weather = await fetchOpenMeteoWeather(activeCoords.latitude, activeCoords.longitude);
          if (weather) {
            localGrounding += `\n- Real-time weather at coordinates: Temp: ${weather.temp}°C, Humidity: ${weather.humidity}%, Rain today: ${weather.rain_today}mm, Forecast: ${weather.min_temp}°C to ${weather.max_temp}°C`;
          }
        }
        if (!linkedUser?.cropSuitability) {
          const climateContext = await fetchAQIAndClimateContext(activeCoords.latitude, activeCoords.longitude);
          localGrounding += climateContext;
        }
      }

      const prompt = `${SYSTEM_PROMPT}

${localGrounding}

Conversation History:
${history}

Farmer's latest query: ${effectiveMessage}
${mediaContext}

Your response (reply directly in ${detectedLanguage ? `the detected language: ${detectedLanguage}` : "the farmer's preferred language"}):`;

      let result;
      if (imageBase64) {
        result = await model.generateContent([
          { text: prompt },
          { inlineData: { mimeType: imageBase64.mimeType, data: imageBase64.data } },
        ]);
      } else {
        result = await model.generateContent(prompt);
      }
      aiResponseText = result.response.text();

      // Parse the classification classification tag
      let finalResponseText = aiResponseText;
      let classification = "text";

      if (aiResponseText.startsWith("[NO_CROP_IMAGE]")) {
        classification = "no_crop";
        finalResponseText = aiResponseText.replace("[NO_CROP_IMAGE]", "").trim();
      } else if (aiResponseText.startsWith("[HEALTHY_CROP]")) {
        classification = "healthy";
        finalResponseText = aiResponseText.replace("[HEALTHY_CROP]", "").trim();
      } else if (aiResponseText.startsWith("[DISEASED_CROP]")) {
        classification = "diseased";
        finalResponseText = aiResponseText.replace("[DISEASED_CROP]", "").trim();
      } else if (aiResponseText.startsWith("[TEXT_ONLY]")) {
        classification = "text";
        finalResponseText = aiResponseText.replace("[TEXT_ONLY]", "").trim();
      }

      aiResponseText = finalResponseText;

      // Only escalate when it is explicitly classified as a diseased crop/issue
      const coords = linkedUser?.coordinates || user.coordinates;
      const shouldEscalate = mediaType === "image" && classification === "diseased";

      if (shouldEscalate) {
        // Generate a human-readable Case ID: RSK-YYYYMMDD-XXXX
        const nowEsc = new Date();
        const datePart = nowEsc.toISOString().slice(0, 10).replace(/-/g, "");
        const randPart = Math.floor(1000 + Math.random() * 9000);
        const caseId = `RSK-${datePart}-${randPart}`;
        
        let finalLat = coords?.latitude || null;
        let finalLng = coords?.longitude || null;
        if (finalLat === null || finalLng === null || isNaN(finalLat) || isNaN(finalLng)) {
          const seed = Date.now() % 100;
          finalLat = 18.4386 + (seed / 100) * 0.16 - 0.08;
          finalLng = 79.1288 + (((seed >> 2) % 100) / 100) * 0.16 - 0.08;
        }

        const locationString = user.villageName && user.villageName !== "Unknown" && user.villageName !== "Updated Location"
          ? user.villageName
          : `${finalLat.toFixed(6)}, ${finalLng.toFixed(6)}`;

        await db.collection("cases").doc(caseId).set({
          id: caseId,
          userId: userId,
          farmerName: user.displayName || "WhatsApp Farmer",
          farmerPhone: phone,
          village: locationString,
          crop: user.cropDetails || "General",
          issue: body || "AI-detected crop issue requiring expert review",
          severity: "medium",
          confidence: 0.55,
          image: persistentImageUrl || "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=150&q=80",
          farmerImage: persistentImageUrl || null,
          status: "pending",
          createdAt: Date.now(),
          lat: finalLat,
          lng: finalLng,
          description: aiResponseText.substring(0, 500),
        });

        // Append the case ID to the AI response so the farmer can track it
        aiResponseText += `\n\n📋 *Your Case Reference ID: ${caseId}*\nPlease save this ID. You or the officer can use it to track your escalation at the Rythu Seva Kendra (RSK).`;
      }

    } catch (aiError) {
      console.error("Gemini processing error:", aiError);
      aiResponseText = "Namaste, I am having trouble connecting to my brain right now. If this is urgent, please visit your local Rythu Seva Kendra (RSK) center.";
    }

    // Guard: never send an empty response to the farmer
    if (!aiResponseText || !aiResponseText.trim()) {
      aiResponseText = "Namaste! I received your message. Could you please try again or share more details about your crop?";
    }

    // Save AI response to chat history
    await saveMessage(userId, "ai", aiResponseText, timestamp);

    // Always send the text reply first so the farmer gets a guaranteed response
    await sendWhatsAppMessage(from, aiResponseText);

    // If the input was audio and transcription succeeded, also attempt to send
    // a synthesized voice message as a follow-up in the same language
    if (mediaType === "audio") {
      if (!transcribedAudioText) {
        console.log("Audio reply skipped: transcription was empty");
      } else {
        console.log("Audio reply: starting TTS pipeline", { voiceLang, textLength: aiResponseText.length });
        // Build a publicly accessible audio URL
        const publicUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
        const host = publicUrl || request.headers.get("host") || "";
        const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || !host;

        if (isLocal) {
          console.log("Skipping audio reply: host is localhost, Twilio cannot reach it. Set NEXT_PUBLIC_BASE_URL for audio replies.");
        } else {
          try {
            const voiceName = VOICE_MAP[voiceLang] || VOICE_MAP["en"];
            console.log("TTS synthesizing with voice:", voiceName);

            let rateString = "+0%";
            const numericRate = 1.0;
            if (numericRate > 1) {
              rateString = `+${Math.round((numericRate - 1) * 100)}%`;
            } else if (numericRate < 1) {
              rateString = `-${Math.round((1 - numericRate) * 100)}%`;
            }

            const audioBuffer = await synthesize(aiResponseText, voiceName, rateString);
            console.log("TTS synthesis succeeded, size:", audioBuffer.length, "bytes");

            const audioId = `audio_${Date.now()}`;
            const fs = await import("fs");
            const path = await import("path");
            const publicDir = path.join(process.cwd(), "public", "tts");
            fs.mkdirSync(publicDir, { recursive: true });
            fs.writeFileSync(path.join(publicDir, `${audioId}.mp3`), audioBuffer);

            const audioUrl = `${host.startsWith("http") ? "" : "https://"}${host}/tts/${audioId}.mp3`;
            console.log("Sending audio via Twilio media URL:", audioUrl);

            await twilioClient.messages.create({
              from: getFromWhatsAppNumber(),
              to: from,
              body: aiResponseText,
              mediaUrl: [audioUrl],
            });
            console.log("Audio message sent successfully via Twilio");
          } catch (ttsError: any) {
            console.error("TTS or audio send error (text was already sent):", ttsError?.message || ttsError);
          }
        }
      }
    }

    return returnTwiML();
  } catch (error) {
    console.error("WhatsApp webhook server error:", error);
    return NextResponse.json({ error: "Webhook execution failed" }, { status: 500 });
  }
}

// GET handler for verification
export async function GET() {
  return NextResponse.json({ status: "WhatsApp Webhook is active" });
}

// Helpers
async function saveMessage(userId: string, sender: "farmer" | "ai", text: string, timestamp: string, imageUrl?: string) {
  const msgId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const messageData: any = {
    id: msgId,
    sender,
    text,
    timestamp,
    platform: "whatsapp",
    createdAt: Date.now(),
  };
  if (imageUrl) {
    messageData.imageUrl = imageUrl;
  }
  
  // Ensure the parent chats/{userId} document exists concretely in Firestore
  await db.collection("chats").doc(userId).set({
    userId,
    updatedAt: Date.now(),
    lastMessage: text,
    platform: "whatsapp",
  }, { merge: true });

  await db
    .collection("chats")
    .doc(userId)
    .collection("messages")
    .doc(msgId)
    .set(messageData);
}

async function sendWhatsAppMessage(to: string, body: string) {
  try {
    const fromNumber = getFromWhatsAppNumber();
    console.log(`Sending WhatsApp message from ${fromNumber} to ${to}, body length: ${body.length}`);
    const message = await twilioClient.messages.create({
      from: fromNumber,
      to,
      body,
    });
    console.log(`WhatsApp message sent successfully, SID: ${message.sid}`);
  } catch (err: any) {
    console.error(`Failed to send WhatsApp message to ${to}:`, err?.message || err);
    throw err; // Re-throw so the caller knows the send failed
  }
}

function returnTwiML() {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    }
  );
}
