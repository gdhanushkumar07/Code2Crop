"use client";

import React, { useState, useEffect, useRef } from "react";
import { Layers, AlertTriangle, Droplets, Grid, MapPin } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapCase {
  id: string;
  userId?: string | null;
  farmerName: string;
  village: string;
  crop: string;
  issue: string;
  severity: "high" | "medium" | "low";
  lat: number | null; 
  lng: number | null; 
  confidence: number;
  image: string;
  farmerImage?: string | null;
  description: string;
  createdAt?: number;
}

interface MapContainerProps {
  cases: MapCase[];
  selectedCaseId?: string;
  onSelectCase?: (c: MapCase) => void;
  isDarkTheme?: boolean;
}

export default function MapContainer({
  cases,
  selectedCaseId,
  onSelectCase,
  isDarkTheme = true,
}: MapContainerProps) {
  const [mapLayer, setMapLayer] = useState<"satellite" | "hotspot" | "water">("hotspot");
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center around Karimnagar, Telangana, India
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([18.4386, 79.1288], 9);

      // Add CartoDB Dark Matter tile layer by default for dark dashboard
      const tileUrl = isDarkTheme
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      const tiles = L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);

      mapInstanceRef.current = map;
      tileLayerRef.current = tiles;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map tile layer style dynamically when mapLayer toggle is clicked
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing tile layer
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
      tileLayerRef.current = null;
    }

    let tileUrl = "";
    let maxZoom = 19;
    let maxNativeZoom = 19;
    let attribution = "";

    if (mapLayer === "satellite") {
      tileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      maxZoom = 18;
      maxNativeZoom = 18;
      attribution = "Tiles &copy; Esri &mdash; Source: USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";
    } else if (mapLayer === "water") {
      tileUrl = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
      maxZoom = 16;
      maxNativeZoom = 16;
      attribution = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>';
    } else {
      tileUrl = isDarkTheme
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      maxZoom = 19;
      maxNativeZoom = 19;
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      maxNativeZoom: maxNativeZoom,
      attribution: attribution,
    }).addTo(map);

    tileLayerRef.current = tiles;

    // Safety zoom check: zoom out to fit layer limits if map zoom is currently too close
    if (map.getZoom() > maxZoom) {
      map.setZoom(maxZoom);
    }
  }, [mapLayer, isDarkTheme]);

  // Sync markers on coordinates / cases change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    // Map null lat/lng to pseudorandom consistent coordinates around Karimnagar district
    const validCases = cases.map((c) => {
      if (c.lat === null || c.lng === null || isNaN(c.lat) || isNaN(c.lng)) {
        // Seeded pseudo-random coordinates based on case ID character values
        const charSum = c.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const seedOffsetLat = ((charSum % 100) / 100) * 0.16 - 0.08;
        const seedOffsetLng = (((charSum >> 2) % 100) / 100) * 0.16 - 0.08;
        return {
          ...c,
          lat: 18.4386 + seedOffsetLat,
          lng: 79.1288 + seedOffsetLng,
        };
      }
      return c;
    });

    validCases.forEach((c) => {
      const lat = c.lat as number;
      const lng = c.lng as number;
      const isSelected = selectedCaseId === c.id;

      // Color coding depending on severity
      const color = c.severity === "high" ? "#EA4335" : c.severity === "medium" ? "#FBBC05" : "#34A853";
      const size = isSelected ? 40 : 30;
      const border = isSelected ? "stroke='#4285F4' stroke-width='3'" : "stroke='#ffffff' stroke-width='1.5'";

      // Generate custom HTML marker wrapper
      const customIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
            ${c.severity === "high" || isSelected ? `
              <div class="absolute inset-0 rounded-full animate-ping opacity-25" style="background-color: ${color}; width: ${size * 1.5}px; height: ${size * 1.5}px; transform: translate(-16%, -16%);"></div>
            ` : ""}
            <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="${color}" ${border}/>
            </svg>
          </div>
        `,
        className: "custom-leaflet-marker",
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      // Bind custom styled dark popup info on click with autoPan: false to keep marker in center
      marker.bindPopup(`
        <div class="custom-popup-content">
          <h4>${c.farmerName}</h4>
          <div class="popup-meta">
            <span>Crop: <strong>${c.crop}</strong></span>
            <span class="severity-badge" style="background-color: ${color}20; color: ${color}; border: 1px solid ${color}35;">
              ${c.severity.toUpperCase()}
            </span>
          </div>
          <p class="popup-issue">${c.issue}</p>
        </div>
      `, { autoPan: false });

      marker.on("click", () => {
        if (onSelectCase) onSelectCase(c);
      });

      markersRef.current[c.id] = marker;
    });

  }, [cases, selectedCaseId]);

  // Zoom / Focus on selected case when changed in sidebar
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedCaseId) return;

    const caseObj = cases.find((c) => c.id === selectedCaseId);
    if (caseObj) {
      let lat = caseObj.lat;
      let lng = caseObj.lng;
      if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
        // Resolve pseudo-random coordinate fallback consistently
        const charSum = caseObj.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const seedOffsetLat = ((charSum % 100) / 100) * 0.16 - 0.08;
        const seedOffsetLng = (((charSum >> 2) % 100) / 100) * 0.16 - 0.08;
        lat = 18.4386 + seedOffsetLat;
        lng = 79.1288 + seedOffsetLng;
      }

      map.setView([lat, lng], 16, {
        animate: true,
        duration: 1.0,
      });

      // Auto-open marker popup details
      const marker = markersRef.current[selectedCaseId];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedCaseId, cases]);

  return (
    <div
      className={`relative w-full h-[540px] rounded-[32px] overflow-hidden shadow-2xl transition-all duration-500 border ${
        isDarkTheme
          ? "bg-rsk-dark border-white/5 text-white"
          : "bg-white border-forest-medium/10 text-forest-dark"
      }`}
    >
      {/* CSS Styles Overrides for Leaflet Popups */}
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-popup-content-wrapper {
          background: ${isDarkTheme ? "#090b0e" : "#ffffff"} !important;
          color: ${isDarkTheme ? "#f8fafc" : "#0f172a"} !important;
          border-radius: 20px !important;
          border: 1px solid ${isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"} !important;
          padding: 12px 14px !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, ${isDarkTheme ? "0.7" : "0.15"}) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          font-family: inherit !important;
        }
        .leaflet-popup-tip {
          background: ${isDarkTheme ? "#090b0e" : "#ffffff"} !important;
          border: 1px solid ${isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"} !important;
        }
        .leaflet-popup-close-button {
          color: ${isDarkTheme ? "#94a3b8" : "#64748b"} !important;
          top: 8px !important;
          right: 8px !important;
        }
        .custom-popup-content h4 {
          margin: 0 0 6px 0 !important;
          font-size: 13px !important;
          font-weight: 800 !important;
          color: ${isDarkTheme ? "#ffffff" : "#0f172a"} !important;
        }
        .custom-popup-content .popup-meta {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          font-size: 10px !important;
          color: ${isDarkTheme ? "#94a3b8" : "#64748b"} !important;
          margin-bottom: 8px !important;
        }
        .custom-popup-content .severity-badge {
          font-size: 9px !important;
          font-weight: 800 !important;
          padding: 1px 6px !important;
          border-radius: 4px !important;
          text-transform: uppercase !important;
        }
        .custom-popup-content .popup-issue {
          margin: 6px 0 0 0 !important;
          font-size: 11px !important;
          color: ${isDarkTheme ? "#cbd5e1" : "#334155"} !important;
          line-height: 1.45 !important;
          border-top: 1px solid ${isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"} !important;
          padding-top: 6px !important;
        }
      `}} />

      {/* Real map mount div */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Floating Control: Layers */}
      <div className="absolute top-6 right-6 z-[1000]">
        <div
          className={`flex gap-1.5 p-1 rounded-2xl shadow-xl border backdrop-blur-xl ${
            isDarkTheme ? "bg-slate-900/85 border-white/10" : "bg-white/90 border-forest-medium/10"
          }`}
        >
          <button
            onClick={() => setMapLayer("hotspot")}
            className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
              mapLayer === "hotspot"
                ? isDarkTheme
                  ? "bg-white/10 text-white"
                  : "bg-forest-medium text-white"
                : "text-forest-medium/50 hover:bg-forest-light/10"
            }`}
            title="Outbreak Hotspots"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMapLayer("satellite")}
            className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
              mapLayer === "satellite"
                ? isDarkTheme
                  ? "bg-white/10 text-white"
                  : "bg-forest-medium text-white"
                : "text-forest-medium/50 hover:bg-forest-light/10"
            }`}
            title="Satellite Imagery"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMapLayer("water")}
            className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
              mapLayer === "water"
                ? isDarkTheme
                  ? "bg-white/10 text-white"
                  : "bg-forest-medium text-white"
                : "text-forest-medium/50 hover:bg-forest-light/10"
            }`}
            title="Topographical Relief"
          >
            <Droplets className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div
        className={`absolute bottom-6 right-6 z-[1000] px-4 py-3 rounded-2xl border text-[10px] shadow-lg backdrop-blur-xl ${
          isDarkTheme ? "bg-slate-900/80 border-white/10" : "bg-white/80 border-forest-medium/10"
        }`}
      >
        <div className="flex flex-col gap-2 font-bold uppercase tracking-wider text-forest-medium/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-danger-red shrink-0 animate-pulse" />
            <span className="text-[9px]">High Severity Outbreak</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-warning shrink-0" />
            <span className="text-[9px]">Medium Severity Cases</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-natural-green shrink-0" />
            <span className="text-[9px]">Low Severity Cases</span>
          </div>
        </div>
      </div>
    </div>
  );
}
