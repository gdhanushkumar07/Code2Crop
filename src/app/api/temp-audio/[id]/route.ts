import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

// GET /api/temp-audio/[id]
// Serves a previously generated TTS audio blob stored in Firestore
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await db.collection("temp_audio").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Audio not found" }, { status: 404 });
    }

    const data = doc.data();
    if (!data || !data.data) {
      return NextResponse.json({ error: "Audio data is empty" }, { status: 404 });
    }

    const buffer = Buffer.from(data.data as string, "base64");
    const mimeType = (data.mimeType as string) || "audio/mpeg";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving temp audio:", error);
    return NextResponse.json({ error: "Failed to serve audio" }, { status: 500 });
  }
}
