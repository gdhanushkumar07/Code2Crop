import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

// GET /api/escalations/chat?userId=<userId>
// Retrieves the conversation history for a farmer case file inspect view
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    const messagesSnapshot = await db
      .collection("chats")
      .doc(userId)
      .collection("messages")
      .get();

    const messages = messagesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        sender: data.sender || "farmer",
        text: data.text || "",
        imageUrl: data.imageUrl || data.image || null,
        audioUrl: data.audioUrl || null,
        timestamp: data.timestamp || "",
        createdAt: data.createdAt || 0,
      };
    });

    // Sort by createdAt ascending so it flows as a conversation thread
    messages.sort((a, b) => a.createdAt - b.createdAt);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching chat logs for officer:", error);
    return NextResponse.json({ error: "Failed to fetch chat logs" }, { status: 500 });
  }
}
