import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

// GET /api/user/profile?uid=<uid>
// Fetches profile from Firestore
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile: doc.data() });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// POST /api/user/profile
// Creates or updates the user profile (syncs Google Auth and links Phone number)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, displayName, photoURL, phone, language, coordinates } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const docRef = db.collection("users").doc(uid);
    const doc = await docRef.get();

    let profileData: any = {
      uid,
      updatedAt: Date.now()
    };

    if (email !== undefined) profileData.email = email;
    if (displayName !== undefined) profileData.displayName = displayName;
    if (photoURL !== undefined) profileData.photoURL = photoURL;
    if (language !== undefined) profileData.language = language;
    if (coordinates !== undefined) profileData.coordinates = coordinates;

    if (phone) {
      const cleanPhone = phone.replace("+", "").replace(/\s+/g, "").trim();
      profileData.phone = phone;

      // Handle account merging (WhatsApp + Google Auth)
      // Check both raw clean phone and country code padded version
      let waUserId = `wa_${cleanPhone}`;
      let waDoc = await db.collection("users").doc(waUserId).get();

      if (!waDoc.exists && cleanPhone.length === 10) {
        waUserId = `wa_91${cleanPhone}`;
        waDoc = await db.collection("users").doc(waUserId).get();
      }

      if (waDoc.exists) {
        const waData = waDoc.data();
        
        if (waData) {
          // Merge profile fields from WhatsApp onboarding
          profileData = {
            villageName: waData.villageName || "",
            cropDetails: waData.cropDetails || "",
            coordinates: waData.coordinates || null,
            ...profileData,
            linkedWhatsAppId: waUserId,
            onboardingStatus: "COMPLETE"
          };
        }

        // Link the WhatsApp user document to the Google UID (do NOT delete, so WhatsApp webhook can resolve it!)
        await db.collection("users").doc(waUserId).set({
          linkedGoogleUid: uid,
          onboardingStatus: "COMPLETE"
        }, { merge: true });

        console.log(`Successfully linked WhatsApp session ${waUserId} to Google Auth profile ${uid}`);
      } else {
        // If the WhatsApp user document does not exist yet, we still save the placeholder pointer
        await db.collection("users").doc(waUserId).set({
          linkedGoogleUid: uid,
          onboardingStatus: "COMPLETE"
        }, { merge: true });
        profileData.linkedWhatsAppId = waUserId;
      }
    }

    await docRef.set(profileData, { merge: true });
    const updatedDoc = await docRef.get();

    return NextResponse.json({ success: true, profile: updatedDoc.data() });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
