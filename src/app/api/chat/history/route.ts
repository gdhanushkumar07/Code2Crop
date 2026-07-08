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

    let query = db.collection("chats").doc(userId).collection("messages");
    const platform = searchParams.get("platform");

    if (platform) {
      query = query.where("platform", "==", platform) as any;
    }

    const snapshot = await query.get();

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
        createdAt: data.createdAt,
      };
    });

    // Sort in-memory to prevent Firestore index requirements
    messages.sort((a: any, b: any) => {
      const timeA = typeof a.createdAt === "number" ? a.createdAt : new Date(a.createdAt || 0).getTime();
      const timeB = typeof b.createdAt === "number" ? b.createdAt : new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
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
