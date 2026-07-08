import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import twilio from "twilio";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const CLOSURE_MESSAGES: Record<string, string> = {
  te: "ధన్యవాదాలు. మీరు నివేదించిన సమస్యను సమీక్షించి, పరిష్కరించబడినట్లు గుర్తించాము. మీ సహకారం మరియు ఓర్పును అభినందిస్తున్నాము. భవిష్యత్తులో ఏవైనా సమస్యలు ఎదురైనా, దయచేసి మమ్మల్ని మళ్ళీ సంప్రదించండి. మీకు విజయవంతమైన మరియు ఆరోగ్యకరమైన పంట కాలం కావాలని కోరుకుంటున్నాము.",
  hi: "आपका धन्यवाद। आपकी रिपोर्ट की गई समस्या की समीक्षा कर ली गई है और इसे हल किए जाने के रूप में चिह्नित किया गया है। हम आपके धैर्य और सहयोग की सराहना करते हैं। यदि आपको भविष्य में कोई और समस्या होती है, तो कृपया हमसे दोबारा संपर्क करें। आपको एक सफल और स्वस्थ फसल मौसम की शुभकामनाएं।",
  kn: "ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ವರದಿ ಮಾಡಿದ ಸಮಸ್ಯೆಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ ಮತ್ತು ಪರಿಹರಿಸಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ತಾಳ್ಮೆ ಮತ್ತು ಸಹಕಾರವನ್ನು ನಾವು ಪ್ರಶಂಸಿಸುತ್ತೇವೆ. ಭವಿಷ್ಯದಲ್ಲಿ ನೀವು ಯಾವುದೇ ಹೆಚ್ಚಿನ ಕಾಳಜಿಯನ್ನು ಎದುರಿಸಿದರೆ, ದಯವಿಟ್ಟು ಮತ್ತೆ ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ. ನಿಮಗೆ ಯಶಸ್ವಿ ಮತ್ತು ಆರೋಗ್ಯಕರ ಬೆಳೆ ಋತುವನ್ನು ಬಯಸುತ್ತೇವೆ.",
  ta: "நன்றி. நீங்கள் புகாரளித்த சிக்கல் மதிப்பாய்வு செய்யப்பட்டு தீர்க்கப்பட்டதாகக் குறிக்கப்பட்டுள்ளது. உங்கள் பொறுமை மற்றும் ஒத்துழைப்பை நாங்கள் பாராட்டுகிறோம். எதிர்காலத்தில் ஏதேனும் மேலும் கவலைகள் ஏற்பட்டால், தயவுசெய்து எங்களை மீண்டும் தொடர்பு கொள்ளவும். உங்களுக்கு வெற்றிகரமான மற்றும் ஆரோக்கியமான பருவத்தை விரும்புகிறோம்.",
  mr: "धन्यवाद. आपण नोंदवलेल्या समस्येचे पुनरावलोकन करून ते निराकरण केल्याचे चिन्हांकित केले आहे. आम्ही तुमच्या संयम आणि सहकार्याचे कौतुक करतो. भविष्यात तुम्हाला काही अडचणी आल्यास, कृपया पुन्हा आमच्याशी संपर्क साधा. आम्ही तुम्हाला यशस्वी आणि निरोगी पीक हंगामाची शुभेच्छा देतो.",
  en: "Thank you for contacting Code2Crop Support. Your reported issue has been reviewed and marked as resolved. We appreciate your patience and cooperation. If you experience any further concerns, please feel free to contact us again. Wishing you a successful and healthy crop season.",
};

// POST /api/escalations/resolve
// RSK Officer explicitly closes a case — sends localized WhatsApp closure message, marks case resolved
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId } = body;

    if (!caseId) {
      return NextResponse.json({ error: "Missing caseId" }, { status: 400 });
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

    // 2. Detect farmer's preferred language
    let language = "en";
    const phone = caseData.farmerPhone;
    if (phone) {
      const cleanPhone = phone.replace("+", "").replace(/\s+/g, "").trim();
      const userId = `wa_${cleanPhone}`;
      try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          language = userData?.language || userData?.preferredLanguage || "en";
        }
      } catch {
        // ignore — fall back to English
      }
    }

    // Normalise language code
    const langCode = CLOSURE_MESSAGES[language] ? language : "en";
    const closureMessage = CLOSURE_MESSAGES[langCode];

    // 3. Send localized WhatsApp closure message
    if (phone) {
      const cleanPhone = phone.replace("+", "").replace(/\s+/g, "").trim();
      const whatsappTo = `whatsapp:+${cleanPhone}`;
      const header = langCode === "en"
        ? "✅ Case Resolved – Code2Crop Support"
        : "✅ కేసు పరిష్కరించబడింది – కోడ్‌2క్రాప్ సపోర్ట్";

      await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886",
        to: whatsappTo,
        body: `${header}\n\n${closureMessage}`,
      });

      // Log closure message to chat history
      const logUserId = `wa_${cleanPhone}`;
      const msgId = `msg_${Date.now()}_closed`;
      await db
        .collection("chats")
        .doc(logUserId)
        .collection("messages")
        .doc(msgId)
        .set({
          id: msgId,
          sender: "ai",
          text: `${header}\n\n${closureMessage}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          platform: "whatsapp",
          createdAt: Date.now(),
        });
    }

    // 4. Mark case resolved in Firestore
    await caseDocRef.update({
      status: "resolved",
      resolvedAt: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resolving case:", error);
    return NextResponse.json({ error: "Failed to resolve case" }, { status: 500 });
  }
}
