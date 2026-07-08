import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

// GET /api/case-image/[id]
// Serves a farmer-uploaded image stored in Firestore
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await db.collection("case-images").doc(id).get();

    if (!doc.exists) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const data = doc.data();
    if (!data || !data.data) {
      return new NextResponse("Image data missing", { status: 404 });
    }

    const buffer = Buffer.from(data.data, "base64");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": data.mimeType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving case image:", error);
    return new NextResponse("Failed to serve image", { status: 500 });
  }
}
