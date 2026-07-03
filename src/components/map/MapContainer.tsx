"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, MapPin, AlertTriangle, Droplets, Grid, Eye, Search, Navigation } from "lucide-react";

export interface MapCase {
  id: string;
  farmerName: string;
  village: string;
  crop: string;
  issue: string;
  severity: "high" | "medium" | "low";
  lat: number; 
  lng: number; 
  confidence: number;
  image: string;
  description: string;
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
  const [hoveredCase, setHoveredCase] = useState<MapCase | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCases = cases.filter(
    (c) =>
      c.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.issue.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`relative w-full h-[540px] rounded-[32px] overflow-hidden shadow-2xl transition-all duration-500 border ${
        isDarkTheme
          ? "bg-rsk-dark border-white/5 text-white"
          : "bg-white border-forest-medium/10 text-forest-dark"
      }`}
    >
      {/* Background simulated telemetry layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        
        {/* Layer: Satellite Mode */}
        {mapLayer === "satellite" && (
          <div className="w-full h-full relative opacity-90">
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-700"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80')`,
                filter: isDarkTheme ? "brightness(0.3) contrast(1.25) saturate(0.9)" : "brightness(0.9) saturate(1.1)",
              }}
            />
            {/* HUD Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px]" />
          </div>
        )}

        {/* Layer: Hotspot heatmap contours */}
        {mapLayer === "hotspot" && (
          <div className={`w-full h-full relative transition-all duration-700 ${isDarkTheme ? "bg-[#090b0e]" : "bg-[#f8f9fa]"}`}>
            {/* Topographic line traces */}
            <svg width="100%" height="100%" className="opacity-20 absolute inset-0">
              <path
                d="M 0 100 C 150 150 250 50 400 150 C 550 250 650 100 800 200 C 950 300 1100 200 1200 250"
                fill="none"
                stroke={isDarkTheme ? "rgba(255,255,255,0.05)" : "rgba(28,63,36,0.05)"}
                strokeWidth="1.5"
              />
              <path
                d="M 0 250 C 200 300 350 150 500 280 C 650 410 800 220 950 350 C 1100 480 1150 300 1200 320"
                fill="none"
                stroke={isDarkTheme ? "rgba(255,255,255,0.06)" : "rgba(28,63,36,0.06)"}
                strokeWidth="2"
              />
              <path
                d="M 0 450 C 300 350 500 480 800 380 C 1100 280 1150 500 1200 460"
                fill="none"
                stroke={isDarkTheme ? "rgba(255,255,255,0.04)" : "rgba(28,63,36,0.04)"}
                strokeWidth="1"
              />
              
              {/* Heatmap rings */}
              {cases.map((c, i) => (
                <g key={i}>
                  <circle
                    cx={`${c.lat}%`}
                    cy={`${c.lng}%`}
                    r={c.severity === "high" ? "75" : "45"}
                    fill={c.severity === "high" ? "rgba(234, 67, 53, 0.08)" : "rgba(251, 188, 5, 0.05)"}
                    className="animate-pulse"
                    style={{ animationDuration: `${3.5 + i * 0.5}s` }}
                  />
                  <circle
                    cx={`${c.lat}%`}
                    cy={`${c.lng}%`}
                    r={c.severity === "high" ? "120" : "75"}
                    fill={c.severity === "high" ? "rgba(234, 67, 53, 0.03)" : "rgba(251, 188, 5, 0.02)"}
                    className="animate-pulse"
                    style={{ animationDuration: `${5 + i * 0.5}s` }}
                  />
                </g>
              ))}
            </svg>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:28px_28px]" />
          </div>
        )}

        {/* Layer: Water stress grid */}
        {mapLayer === "water" && (
          <div className={`w-full h-full relative transition-all duration-700 ${isDarkTheme ? "bg-[#07090c]" : "bg-[#f4f6f8]"}`}>
            <svg width="100%" height="100%" className="opacity-35">
              <ellipse cx="35%" cy="30%" rx="220" ry="140" fill="rgba(234, 67, 53, 0.05)" /> 
              <ellipse cx="80%" cy="55%" rx="280" ry="180" fill="rgba(26, 115, 232, 0.06)" />
              <path
                d="M 0 200 Q 300 100 600 300 T 1200 200"
                fill="none"
                stroke="rgba(26, 115, 232, 0.12)"
                strokeWidth="3.5"
                strokeDasharray="8 8"
              />
            </svg>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:48px_48px]" />
          </div>
        )}
      </div>

      {/* Floating Control: Search Bar */}
      <div className="absolute top-6 left-6 z-10 w-72 max-w-full">
        <div
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-xl border transition-all ${
            isDarkTheme
              ? "bg-slate-900/85 backdrop-blur-xl border-white/10"
              : "bg-white/90 backdrop-blur-xl border-forest-medium/10"
          }`}
        >
          <Search className="w-4 h-4 text-forest-medium/55" />
          <input
            type="text"
            placeholder="Search village records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent border-none outline-none font-bold placeholder:text-forest-medium/35"
          />
        </div>
      </div>

      {/* Floating Control: Layers */}
      <div className="absolute top-6 right-6 z-10">
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
            title="Satellite NDVI Mode"
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
            title="Water Stress Index"
          >
            <Droplets className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map Pins */}
      <div className="absolute inset-0 z-5 pointer-events-auto">
        {filteredCases.map((c) => {
          const isSelected = selectedCaseId === c.id;
          const severityColors =
            c.severity === "high"
              ? "bg-danger-red text-white"
              : c.severity === "medium"
              ? "bg-amber-warning text-forest-dark"
              : "bg-natural-green text-white";

          return (
            <div
              key={c.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${c.lat}%`, top: `${c.lng}%` }}
              onClick={() => onSelectCase && onSelectCase(c)}
              onMouseEnter={() => setHoveredCase(c)}
              onMouseLeave={() => setHoveredCase(null)}
            >
              {/* Double concentric pulsing glow rings */}
              <AnimatePresence>
                {(isSelected || c.severity === "high") && (
                  <>
                    <motion.div
                      className={`absolute inset-0 w-10 h-10 -left-3 -top-3 rounded-full opacity-35 ${
                        c.severity === "high" ? "bg-danger-red" : "bg-google-blue"
                      }`}
                      initial={{ scale: 0.7, opacity: 0.6 }}
                      animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0.05, 0.6] }}
                      transition={{ repeat: Infinity, duration: 2.5 }}
                    />
                    <motion.div
                      className={`absolute inset-0 w-6 h-6 -left-1 -top-1 rounded-full opacity-40 ${
                        c.severity === "high" ? "bg-danger-red" : "bg-google-blue"
                      }`}
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0.1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.8, delay: 0.4 }}
                    />
                  </>
                )}
              </AnimatePresence>

              {/* Central Pin */}
              <motion.div
                whileHover={{ scale: 1.18, rotate: 10 }}
                className={`relative z-10 p-2 rounded-2xl shadow-xl flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-google-blue text-white scale-110 shadow-google-blue/20"
                    : severityColors
                }`}
              >
                {c.severity === "high" ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Floating Info Overlays on hover */}
      <AnimatePresence>
        {hoveredCase && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className={`absolute bottom-6 left-6 z-20 w-80 p-4 rounded-3xl shadow-2xl border flex gap-3.5 ${
              isDarkTheme
                ? "bg-slate-900/95 backdrop-blur-2xl border-white/10 text-white"
                : "bg-white/95 backdrop-blur-2xl border-forest-medium/10 text-forest-dark"
            }`}
          >
            <div
              className="w-16 h-16 rounded-2xl bg-cover bg-center border border-white/10 shrink-0"
              style={{ backgroundImage: `url(${hoveredCase.image})` }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-1">
                <h4 className="text-xs font-black truncate">{hoveredCase.farmerName}</h4>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    hoveredCase.severity === "high"
                      ? "bg-danger-red/10 text-danger-red border border-danger-red/20"
                      : "bg-amber-warning/10 text-amber-600 border border-amber-warning/20"
                  }`}
                >
                  {hoveredCase.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-[10px] text-forest-medium/55 truncate mt-0.5 font-semibold">
                {hoveredCase.village} • {hoveredCase.crop}
              </p>
              <p className="text-[11px] font-medium text-forest-medium/85 mt-1 line-clamp-2">
                {hoveredCase.issue}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-forest-light/10 text-forest-medium font-bold">
                  AI Match: {Math.round(hoveredCase.confidence * 100)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div
        className={`absolute bottom-6 right-6 z-10 px-4 py-3 rounded-2xl border text-[10px] shadow-lg backdrop-blur-xl ${
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
            <span className="w-3 h-1 bg-google-blue shrink-0" />
            <span className="text-[9px]">Command Boundary Limits</span>
          </div>
        </div>
      </div>
    </div>
  );
}
