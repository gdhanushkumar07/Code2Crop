import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

// GET /api/case-image/[id]
// Serves a farmer-uploaded image stored in Firestore or proxies from Twilio
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
    if (!data) {
      return new NextResponse("Image data missing", { status: 404 });
    }

    // Case 1: base64 image data stored directly
    if (data.data) {
      const buffer = Buffer.from(data.data, "base64");
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": data.mimeType || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Case 2: Twilio MediaUrl stored — proxy with auth
    if (data.mediaUrl) {
      const auth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString("base64");
      const proxyRes = await fetch(data.mediaUrl, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!proxyRes.ok) {
        console.error("Twilio media proxy failed:", proxyRes.status);
        return new NextResponse("Image source unavailable", { status: 502 });
      }
      const proxyBuffer = Buffer.from(await proxyRes.arrayBuffer());
      return new NextResponse(proxyBuffer, {
        status: 200,
        headers: {
          "Content-Type": data.mimeType || "image/jpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    return new NextResponse("Image data missing", { status: 404 });
  } catch (error) {
    console.error("Error serving case image:", error);
    return new NextResponse("Failed to serve image", { status: 500 });
  }
}
