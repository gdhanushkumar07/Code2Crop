import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

// GET /api/weather?lat=<lat>&lon=<lon>
// Fetches real weather from Open-Meteo and formats for charts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const userId = searchParams.get("userId");

    if (!lat || lat === "null" || lat === "undefined" || !lon || lon === "null" || lon === "undefined") {
      return NextResponse.json({ error: "Missing or invalid coordinate parameters" }, { status: 400 });
    }

    // Request weather_code, surface_pressure, precipitation, and hourly UV/soil moisture
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,surface_pressure,precipitation&hourly=uv_index,soil_moisture_0_to_7cm,soil_moisture_7_to_28cm&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`;
    const res = await fetch(weatherUrl);
    if (!res.ok) throw new Error("Failed to fetch weather from Open-Meteo");
    
    const data = await res.json();
    
    // Fetch AQI from Air Quality API
    let aqiVal = 42; // default fallback
    try {
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto`;
      const aqiRes = await fetch(aqiUrl);
      if (aqiRes.ok) {
        const aqiData = await aqiRes.json();
        if (aqiData.current?.us_aqi !== undefined) {
          aqiVal = aqiData.current.us_aqi;
        }
      }
    } catch (e) {
      console.warn("AQI fetch failed:", e);
    }
    
    // Extract current hour index from hourly arrays
    const currentHourStr = data.current.time; // "YYYY-MM-DDTHH:MM"
    const hourlyTimes = data.hourly.time; // array of "YYYY-MM-DDTHH:00"
    const currentHourIdx = hourlyTimes.findIndex((t: string) => t.substring(0, 13) === currentHourStr.substring(0, 13)) ?? 0;
    const safeIdx = currentHourIdx === -1 ? 0 : currentHourIdx;

    const rawSoilMoisture = data.hourly.soil_moisture_0_to_7cm[safeIdx] ?? 0.24;
    const rawSubsoil = data.hourly.soil_moisture_7_to_28cm[safeIdx] ?? 0.18;
    const uvIndexVal = data.hourly.uv_index[safeIdx] ?? 0;
    const surfacePressure = data.current.surface_pressure ?? 1013.2;
    const precipitationNow = data.current.precipitation ?? 0;

    // Volumetric soil moisture percentage
    const soilMoisturePct = Math.round(rawSoilMoisture * 100);

    // Groundwater Deficit calculated empirically (lower subsoil moisture = higher deficit)
    const groundwaterDeficit = Math.max(1.0, Math.min(15.0, (0.45 - rawSubsoil) * 15)).toFixed(1);

    // NDVI Veg Index calculated dynamically from soil moisture & temperature range damping
    const maxTemp = data.daily.temperature_2m_max[0] ?? 32;
    const minTemp = data.daily.temperature_2m_min[0] ?? 24;
    const tempRange = Math.max(1, maxTemp - minTemp);
    const ndviVal = Math.max(0.1, Math.min(0.9, 0.82 - tempRange * 0.015 - (0.45 - rawSoilMoisture) * 0.25));
    const ndviLabel = ndviVal >= 0.6 ? "Healthy" : ndviVal >= 0.4 ? "Moderate" : "Sparse";

    // Format daily data for charts
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const forecast = data.daily.time.map((timeStr: string, idx: number) => {
      const date = new Date(timeStr);
      const dayLabel = idx === 0 ? "Today" : days[date.getDay()];
      return {
        time: dayLabel,
        temp: Math.round(data.daily.temperature_2m_max[idx]),
      };
    });

    // Sum precipitation for the next 6 days (excluding index 6 if necessary, index 0 to 5)
    const precipSum6Days = data.daily.precipitation_sum.slice(0, 6).reduce((sum: number, val: number) => sum + (val || 0), 0);

    const homeHubData = {
      currentTemp: `${Math.round(data.current.temperature_2m)}°C`,
      humidity: `${data.current.relative_humidity_2m}%`,
      windSpeed: `${data.current.wind_speed_10m} km/h`,
      rainProbability: `${data.daily.precipitation_probability_max[0] || 0}%`,
      soilMoisture: `${soilMoisturePct}%`,
      ndvi: `${ndviVal.toFixed(2)} ${ndviLabel}`,
      groundwater: `${groundwaterDeficit}m Deficit`,
      aqi: aqiVal,
      uvIndex: uvIndexVal,
      precipitation: `${precipitationNow} mm`,
      pressure: `${surfacePressure} hPa`,
      updatedAt: Date.now()
    };

    if (userId && userId !== "null" && userId !== "undefined") {
      try {
        await db.collection("users").doc(userId).set({
          homeHub: homeHubData,
          coordinates: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lon)
          }
        }, { merge: true });
        console.log(`Saved Home Hub telemetry and coordinates (${lat}, ${lon}) to Firestore for user ${userId}`);
      } catch (saveErr) {
        console.error("Failed to save Home Hub stats to Firestore:", saveErr);
      }
    }

    return NextResponse.json({
      current_temp: Math.round(data.current.temperature_2m),
      humidity: data.current.relative_humidity_2m,
      wind_speed: data.current.wind_speed_10m,
      rain_probability: data.daily.precipitation_probability_max[0] || 0,
      forecast,
      soil_moisture: `${soilMoisturePct}%`,
      groundwater: `${groundwaterDeficit}m Deficit`,
      ndvi: `${ndviVal.toFixed(2)} ${ndviLabel}`,
      aqi: aqiVal,
      uv_index: uvIndexVal,
      precipitation: `${precipitationNow} mm`,
      pressure: `${surfacePressure} hPa`,
      precip_sum_6_days: Math.round(precipSum6Days * 10) / 10
    });
  } catch (error) {
    console.error("Weather endpoint error:", error);
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}
