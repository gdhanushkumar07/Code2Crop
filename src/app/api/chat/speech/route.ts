import { NextRequest, NextResponse } from "next/server";
import { synthesize, VOICE_MAP } from "@/lib/tts";

// GET /api/chat/speech?text=<text>&lang=<lang>&rate=<rate>
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get("text");
    const lang = searchParams.get("lang") || "en";
    const rate = searchParams.get("rate") || "1";

    if (!text) {
      return NextResponse.json({ error: "Missing text parameter" }, { status: 400 });
    }

    const voiceName = VOICE_MAP[lang.toLowerCase()] || VOICE_MAP["en"];

    let rateString = "+0%";
    const numericRate = parseFloat(rate);
    if (numericRate > 1) {
      rateString = `+${Math.round((numericRate - 1) * 100)}%`;
    } else if (numericRate < 1) {
      rateString = `-${Math.round((1 - numericRate) * 100)}%`;
    }

    const audioBuffer = await synthesize(text, voiceName, rateString);

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    console.error("Edge Speech API error:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}
