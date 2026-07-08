import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import twilio from "twilio";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// POST /api/escalations/send-reply
// RSK Officer sends a chat reply to the farmer — does NOT close the case
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, replyText } = body;

    if (!caseId || !replyText) {
      return NextResponse.json({ error: "Missing caseId or replyText" }, { status: 400 });
    }

    // 1. Fetch case from Firestore
    const caseDocRef = db.collection("cases").doc(caseId);
    const caseDoc = await caseDocRef.get();

    if (!caseDoc.exists) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const caseData = caseDoc.data();
    if (!caseData) {
      return NextResponse.json({ error: "Case data is empty" }, { status: 404 });
    }

    // 2. Determine if this is the first RSK reply
    const rskReplyCount = (caseData.rskReplyCount as number) || 0;
    const isFirstReply = rskReplyCount === 0;

    const messageBody = isFirstReply
      ? `👨‍🌾 RSK Advisory Response regarding your escalated case:\n\n"${replyText}"\n\n- Local RSK Command Center`
      : replyText;

    // 3. Try sending WhatsApp — gracefully handle rate limits / failures
    let twilioSent = false;
    let twilioError = "";
    const phone = caseData.farmerPhone;
    let userId = "";

    if (phone) {
      const cleanPhone = phone.replace("+", "").replace(/\s+/g, "").trim();
      userId = `wa_${cleanPhone}`;
      const whatsappTo = `whatsapp:+${cleanPhone}`;

      try {
        await twilioClient.messages.create({
          from: process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886",
          to: whatsappTo,
          body: messageBody,
        });
        twilioSent = true;
      } catch (twilioErr: any) {
        twilioError = twilioErr?.message || "Twilio send failed";
        console.error("Twilio send failed (reply still saved to chat):", twilioError);
      }
    }

    // 4. Always log reply message to user's chat history (regardless of Twilio success)
    if (userId) {
      const msgId = `msg_${Date.now()}_rsk`;
      await db
        .collection("chats")
        .doc(userId)
        .collection("messages")
        .doc(msgId)
        .set({
          id: msgId,
          sender: "ai",
          text: messageBody,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          platform: "whatsapp",
          createdAt: Date.now(),
        });

      // 5. Track reply count and mark case as in_progress (disables AI responses)
      if (rskReplyCount === 0) {
        await caseDocRef.update({ rskReplyCount: 1, status: "in_progress" });
      } else {
        await caseDocRef.update({ rskReplyCount: rskReplyCount + 1 });
      }
    }

    return NextResponse.json({
      success: true,
      twilioSent,
      ...(twilioError ? { warning: `Reply saved to chat but WhatsApp delivery failed: ${twilioError}` } : {}),
    });
  } catch (error) {
    console.error("Error sending reply:", error);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}
