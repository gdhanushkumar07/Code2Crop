import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchAQIAndClimateContext } from "@/lib/climate";
import { db } from "@/lib/firebase";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// GET /api/crop/recommend?lat=<lat>&lon=<lon>
// Uses Gemini to generate live grounded crop recommendations
export async function GET(request: NextRequest) {
  let userId: string | null = null;
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    userId = searchParams.get("userId");

    if (!lat || lat === "null" || lat === "undefined" || !lon || lon === "null" || lon === "undefined") {
      return NextResponse.json({ error: "Missing or invalid coordinate parameters" }, { status: 400 });
    }

    const numLat = parseFloat(lat);
    const numLon = parseFloat(lon);

    // 1. Fetch real weather metrics
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${numLat}&longitude=${numLon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,surface_pressure,precipitation&daily=precipitation_sum&timezone=auto`;
    let weatherInfo = `Latitude: ${lat}, Longitude: ${lon}`;
    try {
      const res = await fetch(weatherUrl);
      if (res.ok) {
        const data = await res.json();
        weatherInfo = `Latitude: ${lat}, Longitude: ${lon}, Temp: ${data.current.temperature_2m}°C, Humidity: ${data.current.relative_humidity_2m}%, Wind Speed: ${data.current.wind_speed_10m} km/h, Precipitation: ${data.current.precipitation} mm, Surface Pressure: ${data.current.surface_pressure} hPa, Daily Rainfall sum: ${data.daily.precipitation_sum[0]}mm`;
      }
    } catch (e) {
      console.warn("Open-Meteo fetch failed during crop recommend, using baseline info");
    }

    // 2. Fetch AQI and Climate context
    let climateInfo = "";
    try {
      climateInfo = await fetchAQIAndClimateContext(numLat, numLon);
    } catch (e) {
      console.warn("AQI/Climate fetch failed during crop recommend");
    }

    // 3. Call Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `You are a crop recommendation engine for Indian agriculture. Generate the top 3 crop recommendations based on the following weather, location and historical climate trend context:
    
Weather Context:
"${weatherInfo}"

Climate & AQI Context:
"${climateInfo}"

Output a JSON array containing exactly 3 crop objects. Each object must have these exact keys and format:
- "id": string (unique ID, lowercase alphanumeric, e.g. "groundnut", "maize", "sunflower")
- "name": string (crop name, e.g. "Groundnut")
- "suitability": number (percentage suitability score based on weather, 0 to 100)
- "waterSaving": number (percentage of water saved compared to paddy/rice crop, 0 to 100)
- "yield": string (expected yield per acre in Indian farming, e.g. "1.8 tons/acre")
- "profit": string (expected profit/returns in Indian Rupees (INR) per acre, e.g. "+₹22,500/acre")
- "reason": string (short reason explaining why it suits current temperature, humidity, rainfall and AQI conditions)
- "soilHealth": string (soil health requirement, e.g. "pH 6.5 | Medium Nitrogen")
- "marketTrend": string (market price projection, e.g. "Upward (+12% demand)")
- "details": string (longer detail explaining agronomic actions or fertilizer/irrigation management)

Ensure the output is valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const recommendations = JSON.parse(text);

    if (userId && userId !== "null" && userId !== "undefined") {
      try {
        await db.collection("users").doc(userId).set({
          cropSuitability: recommendations
        }, { merge: true });
        console.log(`Saved Crop Suitability to Firestore for user ${userId}`);
      } catch (saveErr) {
        console.error("Failed to save Crop Suitability stats to Firestore:", saveErr);
      }
    }

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Crop recommend error:", error);
    // Safe fallback if JSON parsing or API calls fail
    const fallbackRecs = [
      {
        id: "groundnut",
        name: "Groundnut",
        suitability: 90,
        waterSaving: 60,
        yield: "1.2 tons/acre",
        profit: "+₹22,500/acre",
        reason: "Requires low water and matches sandy loam soil conditions.",
        soilHealth: "pH 6.0-6.5 | Sandy Loam",
        marketTrend: "Upward (+12% demand)",
        details: "Groundnuts enrich soil nitrogen levels and are drought resistant.",
      },
      {
        id: "maize",
        name: "Maize",
        suitability: 78,
        waterSaving: 45,
        yield: "2.2 tons/acre",
        profit: "+₹18,200/acre",
        reason: "Optimal temperature and moderate humidity align with vegetative phase.",
        soilHealth: "pH 6.0-7.0 | High Organic Matter",
        marketTrend: "Stable",
        details: "Maize responds well to early fertilization before dry spells.",
      },
      {
        id: "sunflower",
        name: "Sunflower",
        suitability: 84,
        waterSaving: 55,
        yield: "0.8 tons/acre",
        profit: "+₹15,000/acre",
        reason: "Thrives in these temperate, semi-humid conditions, showing high drought tolerance.",
        soilHealth: "pH 6.5-7.5 | Well-drained Loamy",
        marketTrend: "Upward",
        details: "Sunflower requires minimal irrigation and has a short crop cycle.",
      }
    ];

    if (userId && userId !== "null" && userId !== "undefined") {
      try {
        await db.collection("users").doc(userId).set({
          cropSuitability: fallbackRecs
        }, { merge: true });
      } catch (saveErr) {
        console.error("Failed to save fallback crop recommendations:", saveErr);
      }
    }

    return NextResponse.json({ recommendations: fallbackRecs });
  }
}
