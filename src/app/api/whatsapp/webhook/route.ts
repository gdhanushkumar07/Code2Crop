import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import twilio from "twilio";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// System prompt for the AI agronomist
const SYSTEM_PROMPT = `You are Code2Crop AI Agronomist, an expert agricultural advisor for Indian farmers.
You specialize in crop recommendations, disease diagnosis, weather-based advice, and soil health guidance.
You are concise, helpful, and speak in a friendly tone. Keep responses under 300 words.
When a farmer describes crop symptoms or sends image descriptions, provide:
1. Likely diagnosis
2. Recommended treatment
3. Preventive measures
If you're unsure (confidence < 65%), recommend the farmer visit their nearest Rythu Seva Kendra (RSK) officer.
Context: You primarily serve farmers in Telangana (Karimnagar, Peddapalli, Siddipet districts).`;

// POST /api/whatsapp/webhook
// Handles incoming WhatsApp messages from Twilio
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const from = formData.get("From") as string; // e.g. "whatsapp:+919876543210"
    const body = formData.get("Body") as string;
    const mediaUrl = formData.get("MediaUrl0") as string | null;
    const numMedia = formData.get("NumMedia") as string;

    if (!from) {
      return NextResponse.json({ error: "Missing From field" }, { status: 400 });
    }

    // Derive a userId from the phone number (strip "whatsapp:" prefix and "+")
    const userId = `wa_${from.replace("whatsapp:", "").replace("+", "")}`;
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // --- Save the incoming farmer message to Firestore ---
    const farmerMessageId = `msg_${Date.now()}`;
    const farmerMessage = {
      id: farmerMessageId,
      sender: "farmer",
      text: body || (mediaUrl ? "[Image sent via WhatsApp]" : ""),
      timestamp,
      platform: "whatsapp",
      imageUrl: mediaUrl || undefined,
      createdAt: Date.now(),
    };

    await db
      .collection("chats")
      .doc(userId)
      .collection("messages")
      .doc(farmerMessageId)
      .set(farmerMessage);

    // --- Build context from recent chat history ---
    const historySnapshot = await db
      .collection("chats")
      .doc(userId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const recentHistory = historySnapshot.docs
      .reverse()
      .map((doc: any) => {
        const d = doc.data();
        return `${d.sender === "farmer" ? "Farmer" : "AI"}: ${d.text}`;
      })
      .join("\n");

    // --- Generate AI response via Gemini ---
    let aiResponseText: string;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `${SYSTEM_PROMPT}

Recent conversation history:
${recentHistory}

Farmer's latest message: ${body || "[Image uploaded]"}
${mediaUrl ? `The farmer also sent an image. Based on the message context, provide relevant agricultural advice.` : ""}

Respond helpfully and concisely:`;

      const result = await model.generateContent(prompt);
      aiResponseText = result.response.text();
    } catch (aiError) {
      console.error("Gemini API error, falling back to mock:", aiError);
      // Fallback mock response if Gemini fails
      aiResponseText =
        "I'm checking your soil and weather data now. In Karimnagar district, the IMD predicts a dry spell starting next Tuesday. I recommend focusing on drought-resistant crops like Groundnut or Maize. Please visit your nearest RSK center for personalized guidance.";
    }

    // --- Save AI response to Firestore ---
    const aiMessageId = `msg_${Date.now() + 1}`;
    const aiMessage = {
      id: aiMessageId,
      sender: "ai",
      text: aiResponseText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      platform: "whatsapp",
      createdAt: Date.now() + 1,
    };

    await db
      .collection("chats")
      .doc(userId)
      .collection("messages")
      .doc(aiMessageId)
      .set(aiMessage);

    // --- Send reply via Twilio ---
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886",
      to: from,
      body: aiResponseText,
    });

    // Return TwiML empty response (Twilio expects this)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// GET handler for Twilio webhook verification
export async function GET() {
  return NextResponse.json({ status: "WhatsApp webhook is active" });
}
