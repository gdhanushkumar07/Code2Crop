import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

// GET /api/escalations
// Retrieves all pending escalated crop disease cases from Firestore
export async function GET() {
  try {
    const snapshot = await db
      .collection("cases")
      .where("status", "in", ["pending", "in_progress"])
      .get();

    const cases = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || null,
        farmerName: data.farmerName || "Farmer",
        farmerPhone: data.farmerPhone || "",
        village: data.village || "Unknown",
        crop: data.crop || "Unknown",
        issue: data.issue || "",
        severity: data.severity || "medium",
        confidence: data.confidence || 0.60,
        image: data.image || "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=150&q=80",
        farmerImage: data.farmerImage || null,
        description: data.description || data.issue || "",
        status: data.status || "pending",
        lat: data.lat || null,
        lng: data.lng || null,
        createdAt: data.createdAt || 0,
      };
    });

    // In-memory sorting by createdAt desc
    cases.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ cases });
  } catch (error) {
    console.error("Error fetching escalated cases:", error);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}
