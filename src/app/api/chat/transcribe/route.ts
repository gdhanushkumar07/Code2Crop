import { NextRequest, NextResponse } from "next/server";

// Map full language name or raw ISO code back to standard 2-letter codes
const languageMapping: Record<string, string> = {
  "telugu": "te",
  "te": "te",
  "hindi": "hi",
  "hi": "hi",
  "kannada": "kn",
  "kn": "kn",
  "tamil": "ta",
  "ta": "ta",
  "marathi": "mr",
  "mr": "mr",
  "english": "en",
  "en": "en"
};

// POST /api/chat/transcribe
// Forwards the user's recorded audio file to the Groq Whisper transcription API with auto-detect support
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const language = formData.get("language") as string;

    if (!file) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
    }

    // Build the request body for Groq Whisper transcription
    const groqFormData = new FormData();
    groqFormData.append("file", file);
    groqFormData.append("model", "whisper-large-v3");
    groqFormData.append("response_format", "verbose_json");
    
    // Only pass language parameter if it is not "auto"
    if (language && language !== "auto") {
      groqFormData.append("language", language);
    }

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: groqFormData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Groq Whisper API error:", errText);
      throw new Error(`Failed to transcribe via Groq: ${res.status}`);
    }

    const data = await res.json();
    const rawLang = data.language?.toLowerCase() || "";
    const detectedLanguage = languageMapping[rawLang] || "en";

    return NextResponse.json({ 
      text: data.text || "",
      language: detectedLanguage
    });
  } catch (error: any) {
    console.error("Transcription endpoint error:", error);
    return NextResponse.json({ error: error.message || "Failed to process audio" }, { status: 500 });
  }
}
