/**
 * Exposes 5-Year Climate Trend analytics (2021-2025) using Open-Meteo Archive API.
 */
export async function fetch5YearClimateTrend(lat: number, lon: number) {
  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2021-01-01&end_date=2025-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Archive API error ${res.status}`);
    const data = await res.json();
    
    if (!data.daily || !data.daily.time) {
      return null;
    }

    const dailyTime = data.daily.time; // array of "YYYY-MM-DD"
    const tempMax = data.daily.temperature_2m_max;
    const tempMin = data.daily.temperature_2m_min;
    const precip = data.daily.precipitation_sum;

    // 1. Yearly Aggregation for grounding & baseline stats
    const yearlyAgg: Record<string, { totalTempMax: number; totalTempMin: number; totalRain: number; count: number }> = {};
    
    // 2. Weekly Aggregation for 2025 (52 weeks)
    const weeklyAgg: Record<number, { totalTemp: number; count: number; month: string }> = {};
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const startOf2025 = new Date("2025-01-01").getTime();

    // 3. Monthly Aggregation for 5 years (2021-2025) (60 months)
    const monthly5YrAgg: Record<string, { totalTemp: number; count: number }> = {};

    for (let i = 0; i < dailyTime.length; i++) {
      const dateStr = dailyTime[i];
      const year = dateStr.substring(0, 4);
      const tMax = tempMax[i];
      const tMin = tempMin[i];
      const p = precip[i];

      // A. Yearly aggregation
      if (!yearlyAgg[year]) {
        yearlyAgg[year] = { totalTempMax: 0, totalTempMin: 0, totalRain: 0, count: 0 };
      }
      if (tMax !== null && tMax !== undefined) {
        yearlyAgg[year].totalTempMax += tMax;
        yearlyAgg[year].totalTempMin += tMin;
        yearlyAgg[year].totalRain += p || 0;
        yearlyAgg[year].count += 1;
      }

      // B. Weekly aggregation for 2025
      if (year === "2025") {
        const date = new Date(dateStr);
        const dayOfYear = Math.floor((date.getTime() - startOf2025) / (24 * 60 * 60 * 1000));
        const weekIdx = Math.max(0, Math.min(51, Math.floor(dayOfYear / 7)));
        
        const monthIdx = parseInt(dateStr.substring(5, 7)) - 1;
        const monthName = monthsShort[monthIdx];

        if (!weeklyAgg[weekIdx]) {
          weeklyAgg[weekIdx] = { totalTemp: 0, count: 0, month: monthName };
        }
        if (tMax !== null && tMin !== null) {
          weeklyAgg[weekIdx].totalTemp += (tMax + tMin) / 2;
          weeklyAgg[weekIdx].count += 1;
        }
      }

      // C. Monthly aggregation for 5 years
      const monthStr = dateStr.substring(5, 7); // "01", "02" etc.
      const monthKey = `${year}-${monthStr}`;
      if (!monthly5YrAgg[monthKey]) {
        monthly5YrAgg[monthKey] = { totalTemp: 0, count: 0 };
      }
      if (tMax !== null && tMin !== null) {
        monthly5YrAgg[monthKey].totalTemp += (tMax + tMin) / 2;
        monthly5YrAgg[monthKey].count += 1;
      }
    }

    // Build yearly summary for grounding
    const yearlySummary: Record<string, { avgTempMax: string; avgTempMin: string; totalPrecipitation: string }> = {};
    for (const year of Object.keys(yearlyAgg)) {
      const agg = yearlyAgg[year];
      if (agg.count > 0) {
        yearlySummary[year] = {
          avgTempMax: (agg.totalTempMax / agg.count).toFixed(1) + "°C",
          avgTempMin: (agg.totalTempMin / agg.count).toFixed(1) + "°C",
          totalPrecipitation: Math.round(agg.totalRain) + "mm",
        };
      }
    }

    // Build weekly array for 2025 (52 weeks)
    let lastMonth = "";
    const weekly2025 = [];
    for (let w = 0; w < 52; w++) {
      const agg = weeklyAgg[w];
      const temp = agg && agg.count > 0 ? Math.round(agg.totalTemp / agg.count) : 25;
      const monthName = agg ? agg.month : "Jan";
      
      let showLabel = "";
      if (monthName !== lastMonth) {
        showLabel = monthName;
        lastMonth = monthName;
      }

      weekly2025.push({
        time: `W${w + 1}`,
        temp,
        monthLabel: showLabel,
      });
    }

    // Build monthly array for 5 years (60 months)
    const monthly5Year = [];
    const yearList = ["2021", "2022", "2023", "2024", "2025"];
    const monthList = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    
    for (const yr of yearList) {
      for (let mIdx = 0; mIdx < 12; mIdx++) {
        const mStr = monthList[mIdx];
        const key = `${yr}-${mStr}`;
        const agg = monthly5YrAgg[key];
        const temp = agg && agg.count > 0 ? Math.round(agg.totalTemp / agg.count) : 25;
        
        // Show year label only for January
        const showLabel = mIdx === 0 ? yr : "";
        
        monthly5Year.push({
          time: key,
          temp,
          yearLabel: showLabel,
        });
      }
    }

    return {
      yearly: yearlySummary,
      weekly2025,
      monthly5Year
    };
  } catch (err) {
    console.error("Failed to fetch 5-year climate trend:", err);
    return null;
  }
}

/**
 * Fetches both AQI and 5-Year Climate Trend and returns a formatted string for AI prompt grounding.
 */
export async function fetchAQIAndClimateContext(lat: number, lon: number): Promise<string> {
  let context = "";
  
  // 1. Fetch AQI
  try {
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto`;
    const res = await fetch(aqiUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.current?.us_aqi !== undefined) {
        context += `\n- Local Air Quality Index (AQI): ${data.current.us_aqi} (US AQI scale)`;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch AQI for prompt grounding:", err);
  }

  // 2. Fetch 5-Year Climate Trend
  try {
    const climate = await fetch5YearClimateTrend(lat, lon);
    if (climate && climate.yearly) {
      context += `\n- Historical 5-Year Climate Trend (2021-2025) at coordinates:`;
      for (const year of Object.keys(climate.yearly)) {
        context += `\n  * Year ${year}: Avg Daily High: ${climate.yearly[year].avgTempMax}, Avg Daily Low: ${climate.yearly[year].avgTempMin}, Total Annual Precipitation: ${climate.yearly[year].totalPrecipitation}`;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch climate trend for prompt grounding:", err);
  }

  return context;
}
