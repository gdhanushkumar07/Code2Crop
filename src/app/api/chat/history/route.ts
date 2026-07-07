import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

// GET /api/chat/history?userId=<id>
// Retrieves chat history from Firestore, ordered by creation time
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId query parameter" },
        { status: 400 }
      );
    }

    const snapshot = await db
      .collection("chats")
      .doc(userId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();

    const messages = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        sender: data.sender,
        text: data.text,
        translation: data.translation || undefined,
        timestamp: data.timestamp,
        reasoningSteps: data.reasoningSteps || undefined,
        confidence: data.confidence || undefined,
        imageUrl: data.imageUrl || undefined,
        diseaseResult: data.diseaseResult || undefined,
        platform: data.platform || "web",
      };
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}
