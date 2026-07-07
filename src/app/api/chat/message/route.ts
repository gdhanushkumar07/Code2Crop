import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

// POST /api/chat/message
// Persists a single chat message to Firestore
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
    };

    await db
      .collection("chats")
      .doc(userId)
      .collection("messages")
      .doc(message.id || String(Date.now()))
      .set(messageData);

    return NextResponse.json({ success: true, id: messageData.id });
  } catch (error) {
    console.error("Error saving chat message:", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }
}
