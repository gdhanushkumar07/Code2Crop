"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  CloudRain,
  Wind,
  Droplet,
  Compass,
  FileText,
  AlertTriangle,
  UploadCloud,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  BrainCircuit,
  Mic,
  Send,
  Sparkles,
  RefreshCw,
  UserCheck,
  Globe,
  Database,
  CloudSun,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";
import VoiceRecorder from "@/components/voice/VoiceRecorder";
import AIPipeline from "@/components/ai/AIPipeline";

// Mock weather forecast
const WEATHER_DATA = [
  { time: "Today", temp: 32 },
  { time: "Sat", temp: 33 },
  { time: "Sun", temp: 31 },
  { time: "Mon", temp: 30 },
  { time: "Tue", temp: 28 },
  { time: "Wed", temp: 29 },
  { time: "Thu", temp: 31 },
];

// Mock crop comparisons
const CROP_REC = [
  {
    id: "groundnut",
    name: "Groundnut",
    suitability: 92,
    waterSaving: 60,
    yield: "1.8 tons/acre",
    profit: "+₹14,500/acre",
    reason: "Your soil moisture is 18% below average, groundwater depth is falling. Groundnut needs 60% less water than paddy.",
    soilHealth: "pH 6.5 | Medium Nitrogen",
    marketTrend: "Upward (+12% demand)",
    details: "Groundnuts are deep-rooting and highly drought-resistant. They enrich soil nitrogen levels organically, reducing the need for chemical fertilizers. Best planted within the next 4 days.",
  },
  {
    id: "maize",
    name: "Maize",
    suitability: 74,
    waterSaving: 40,
    yield: "2.5 tons/acre",
    profit: "+₹9,200/acre",
    reason: "Reasonable option, but requires better fertilization timing. High nitrogen demand matches Soil Health Card proxy.",
    soilHealth: "pH 6.5 | Low Nitrogen",
    marketTrend: "Stable (normal supply)",
    details: "Maize is moderately drought-tolerant but requires high initial nitrogen inputs. Ensure nitrogen application is timed before the dry spell next Tuesday to maximize nutrient uptake.",
  },
  {
    id: "paddy",
    name: "Paddy (Rice)",
    suitability: 38,
    waterSaving: 0,
    yield: "3.1 tons/acre",
    profit: "-₹4,000/acre (risk)",
    reason: "Water intensive. High groundwater deficit creates heavy irrigation electricity costs. Yield risks dry spell failure.",
    soilHealth: "pH 6.2 | High Nitrogen",
    marketTrend: "Downward (-8% price drop)",
    details: "Rice requires continuous flooding. Due to the impending dry spell and low groundwater table in Karimnagar district, irrigation costs will exceed market return thresholds.",
  },
];

interface ChatMessage {
  id: string;
  sender: "farmer" | "ai";
  text: string;
  translation?: string;
  timestamp: string;
  reasoningSteps?: string[];
  confidence?: number;
}

export default function FarmerPortal() {
  const [activeTab, setActiveTab] = useState<"home" | "recommendations" | "disease" | "chat">("home");
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: "Good morning, Ramu! How is your crop doing today? You can write or press the mic button to speak in Telugu, Hindi, or Kannada.",
      timestamp: "09:30 AM",
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState(-1);
  const [isPipelineVisible, setIsPipelineVisible] = useState(false);

  // Disease Scanner State
  const [dragActive, setDragActive] = useState(false);
  const [scanningImage, setScanningImage] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<"idle" | "uploading" | "scanning" | "diagnosed" | "escalated">("idle");
  const [diagnosticResult, setDiagnosticResult] = useState<{
    diseaseName: string;
    confidence: number;
    severity: "low" | "medium" | "high";
    treatment: string[];
  } | null>(null);

  // Trigger alert
  const [showAlert, setShowAlert] = useState(true);

  // Voice Note complete handler
  const handleVoiceNoteResult = (text: string, translation: string, language: string) => {
    setIsVoiceOpen(false);
    
    // Add farmer message
    const farmerMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "farmer",
      text: text,
      translation: translation,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    setChatMessages((prev) => [...prev, farmerMsg]);
    setIsPipelineVisible(true);
    
    // Cycle through pipeline
    let step = 0;
    setActivePipelineStep(0);
    const interval = setInterval(() => {
      step += 1;
      if (step >= 6) {
        clearInterval(interval);
        // Process final response
        setTimeout(() => {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: "ai",
            text: "ఆధారిత సిఫార్సు: వేరుశెనగ (Groundnut) పంటను వేయండి. మీ పొలంలో తేమ 18% తక్కువగా ఉంది, వేరుశెనగకు వరి కంటే 60% తక్కువ నీరు అవసరం మరియు మార్కెట్ ధరలు బాగున్నాయి.",
            translation: "Grounded recommendation: Plant Groundnut. Your soil moisture is 18% below average, groundnut needs 60% less water than paddy, and market prices are favorable.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            confidence: 0.92,
            reasoningSteps: [
              "Soil health card confirms medium pH level (6.5)",
              "Earth Engine NDVI moisture levels are 18% below dry baseline",
              "Agmarknet trends point to a +12% increase in regional groundnut prices",
              "Groundwater deficit flags high energy costs for crop irrigation",
            ],
          };
          setChatMessages((prev) => [...prev, aiMsg]);
          setActivePipelineStep(-1);
          setIsPipelineVisible(false);
        }, 1000);
      } else {
        setActivePipelineStep(step);
      }
    }, 1200);
  };

  const handleSendText = () => {
    if (!inputVal.trim()) return;

    const farmerMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "farmer",
      text: inputVal,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, farmerMsg]);
    setInputVal("");
    
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "I am checking your soil and weather data now. In Karimnagar district, the IMD predicts a dry spell starting next Tuesday. I recommend focusing on drought-resistant crops like Groundnut or Maize.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    }, 1000);
  };

  // Disease Scanner handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processScan = (imageUrl: string) => {
    setScanningImage(imageUrl);
    setScanStatus("scanning");
    
    setTimeout(() => {
      setScanStatus("diagnosed");
      setDiagnosticResult({
        diseaseName: "Early Leaf Spot (Cercospora arachidicola)",
        confidence: 0.58, 
        severity: "medium",
        treatment: [
          "Apply Chlorothalonil fungicide (2.0 g/L water) immediately.",
          "Clear crop debris from infected rows to prevent spore dispersal.",
          "Ensure adequate soil aeration by reducing localized flooding.",
        ],
      });
    }, 2500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          processScan(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          processScan(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const escalateCase = () => {
    setScanStatus("escalated");
    
    const newCase = {
      id: "case_" + Date.now(),
      farmerName: "Ramu Patel",
      village: "Peddapalli Village",
      crop: "Groundnut",
      issue: "Suspected Cercospora Leaf Spot (AI Confidence: 58%)",
      severity: "high",
      lat: 42.5,
      lng: 35.8,
      confidence: 0.58,
      image: scanningImage || "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=150&q=80",
      description: "Low-confidence leaf spot diagnostics flagged. Crop shows yellow spots with brown borders.",
    };
    
    const existing = localStorage.getItem("escalated_cases");
    const cases = existing ? JSON.parse(existing) : [];
    cases.push(newCase);
    localStorage.setItem("escalated_cases", JSON.stringify(cases));
  };

  return (
    <div className="relative min-h-screen bg-warm-bg text-forest-dark selection:bg-forest-light/20 flex flex-col">
      <div className="grain-overlay absolute inset-0 z-0 opacity-15" />
      <div className="glow-blob w-[400px] h-[400px] bg-forest-light top-[-100px] right-[-100px] opacity-10" />

      {/* Floating Header */}
      <header className="sticky top-0 z-40 w-full px-6 py-4 backdrop-blur-xl bg-warm-bg/75 border-b border-forest-medium/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-gradient-to-tr from-forest-medium to-forest-light text-white shadow-md">
              <Compass className="w-5 h-5" />
            </span>
            <div>
              <span className="font-extrabold text-base tracking-tight block">Kisan Alert</span>
              <span className="text-[9px] text-forest-medium/55 block font-bold uppercase tracking-widest mt-0.5">Farmer Assistant</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-forest-light/5 border border-forest-medium/5">
            {[
              { id: "home", label: "Home Hub" },
              { id: "recommendations", label: "Crop Suitability" },
              { id: "disease", label: "Disease Scan" },
              { id: "chat", label: "Agronomist Chat" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-xs font-bold px-4 py-2 rounded-full transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-forest-dark shadow-sm"
                    : "text-forest-medium/60 hover:text-forest-medium"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <Link
            href="/"
            className="text-xs font-bold text-forest-medium/80 hover:text-forest-medium flex items-center gap-1 bg-white border border-forest-medium/10 px-3.5 py-2 rounded-full shadow-sm"
          >
            Exit to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        
        {/* Proactive Dry-Spell Warning Alert banner */}
        <AnimatePresence>
          {showAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 p-4 rounded-[24px] bg-amber-warning/10 border border-amber-warning/25 text-amber-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden shadow-sm backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-amber-warning/20 text-amber-800 animate-pulse shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Dry Spell Warning</h4>
                  <p className="text-xs text-amber-800/80 mt-0.5 font-medium">
                    Karimnagar district predictions: 0mm rainfall expected for next 6 days. Soil moisture indices are dropping.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setActiveTab("chat")}
                  className="text-xs font-bold bg-amber-800 text-white px-4 py-2 rounded-full hover:bg-amber-900 transition-all shadow-sm"
                >
                  Consult AI
                </button>
                <button
                  onClick={() => setShowAlert(false)}
                  className="text-xs text-amber-800 hover:text-amber-950 font-bold"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab content renderer */}
        <div className="w-full">
          {activeTab === "home" && (
            <div className="grid md:grid-cols-3 gap-8 items-start">
              {/* Left Column: Greeting and Status */}
              <div className="md:col-span-2 space-y-8">
                
                {/* Greeting Card */}
                <div className="p-6 rounded-[32px] bg-white border border-forest-medium/5 flex flex-col justify-between relative overflow-hidden shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-forest-medium/50 uppercase tracking-widest bg-forest-light/5 px-2.5 py-1 rounded-full">
                      Farmer Dashboard
                    </span>
                    <h2 className="text-3xl font-black text-forest-dark mt-4">Good Morning, Ramu Patel</h2>
                    <p className="text-xs text-forest-medium/60 mt-1 font-semibold">
                      Plot ID: Karimnagar-Zone 3B • Current Season: Kharif
                    </p>
                  </div>
                  
                  {/* Status Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-forest-medium/5">
                    <div className="space-y-1">
                      <span className="text-[10px] text-forest-medium/40 uppercase block font-bold">Soil Moisture</span>
                      <span className="text-lg font-black text-forest-medium block">24% <span className="text-[10px] font-semibold text-danger-red font-mono">-18% avg</span></span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-forest-medium/40 uppercase block font-bold">NDVI Veg Index</span>
                      <span className="text-lg font-black text-forest-medium block">0.68 <span className="text-[10px] font-bold text-natural-green bg-natural-green/10 px-1.5 py-0.5 rounded-full uppercase">Healthy</span></span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-forest-medium/40 uppercase block font-bold">Groundwater</span>
                      <span className="text-lg font-black text-forest-medium block">6.2m <span className="text-[10px] font-semibold text-forest-medium/50">Deficit</span></span>
                    </div>
                  </div>
                </div>

                {/* Weather Hub Card */}
                <div className="p-6 rounded-[32px] bg-white border border-forest-medium/5 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-forest-dark">Weather Telemetry</h3>
                      <p className="text-xs text-forest-medium/60 mt-0.5">Karimnagar station IMD telemetry</p>
                    </div>
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-forest-light/5 text-xs text-forest-medium border border-forest-medium/10 font-bold">
                      <Sun className="w-4 h-4 text-amber-warning" /> 32°C Sunny
                    </div>
                  </div>

                  {/* Temperature Chart */}
                  <div className="h-48 w-full -ml-4 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={WEATHER_DATA}>
                        <XAxis dataKey="time" stroke="#1C3F24" fontSize={10} tickLine={false} axisLine={false} opacity={0.6} />
                        <YAxis stroke="#1C3F24" fontSize={10} tickLine={false} axisLine={false} opacity={0.6} />
                        <Tooltip />
                        <Line type="monotone" dataKey="temp" stroke="#1A73E8" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Weather Info Widgets */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-forest-medium/5 text-left">
                    <div className="flex items-center gap-2">
                      <span className="p-2.5 rounded-xl bg-forest-light/5 text-forest-medium shrink-0">
                        <Wind className="w-4 h-4 animate-pulse" />
                      </span>
                      <div>
                        <span className="text-[9px] text-forest-medium/40 block uppercase font-bold">Wind</span>
                        <span className="text-xs font-bold block">12 km/h NE</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="p-2.5 rounded-xl bg-forest-light/5 text-forest-medium shrink-0">
                        <Droplet className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="text-[9px] text-forest-medium/40 block uppercase font-bold">Humidity</span>
                        <span className="text-xs font-bold block">68%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="p-2.5 rounded-xl bg-forest-light/5 text-forest-medium shrink-0">
                        <CloudRain className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="text-[9px] text-forest-medium/40 block uppercase font-bold">Rain Prob</span>
                        <span className="text-xs font-bold block">5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Insights & Quick Actions */}
              <div className="space-y-8">
                
                {/* AI Agronomist Quick Panel */}
                <div className="p-6 rounded-[32px] bg-gradient-to-tr from-forest-medium to-forest-light text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[320px]">
                  <div className="absolute right-[-40px] bottom-[-40px] w-48 h-48 rounded-full bg-white/5 blur-xl pointer-events-none" />
                  
                  <div className="space-y-4 text-left">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-natural-green bg-white/10 px-3 py-1 rounded-full w-fit block">
                      AI Agronomist
                    </span>
                    <h3 className="text-2xl font-black leading-tight mt-4">Got a crop query? Tap to speak in Telugu.</h3>
                    <p className="text-xs text-white/70 leading-relaxed font-medium">
                      Our system transcribes speech instantly, fetches satellite indexes, and yields recommendations.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      setIsVoiceOpen(true);
                    }}
                    className="w-full py-3.5 rounded-full bg-white text-forest-dark text-xs font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-md mt-6 magnetic-btn"
                  >
                    <Mic className="w-4 h-4 text-forest-medium" /> Speak to Agronomist
                  </button>
                </div>

                {/* Quick Navigation Card list */}
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab("recommendations")}
                    className="w-full p-4 rounded-2xl bg-white border border-forest-medium/5 hover:border-forest-light/20 flex justify-between items-center transition-all group shadow-sm text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-xl bg-forest-light/5 text-forest-medium">
                        <Compass className="w-5 h-5" />
                      </span>
                      <div>
                        <span className="text-xs font-bold block text-forest-dark">Compare Crop Suitabilities</span>
                        <span className="text-[10px] text-forest-medium/40 block font-medium mt-0.5">Evaluate expected yield vs water needs</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-forest-medium/50 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => setActiveTab("disease")}
                    className="w-full p-4 rounded-2xl bg-white border border-forest-medium/5 hover:border-forest-light/20 flex justify-between items-center transition-all group shadow-sm text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-xl bg-forest-light/5 text-forest-medium">
                        <FileText className="w-5 h-5" />
                      </span>
                      <div>
                        <span className="text-xs font-bold block text-forest-dark">Leaf Diagnostic Scan</span>
                        <span className="text-[10px] text-forest-medium/40 block font-medium mt-0.5">Upload leaf photos for treatment guides</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-forest-medium/50 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "recommendations" && (
            <div className="space-y-8">
              <div className="mb-4">
                <h2 className="text-2xl font-black text-forest-dark">AI Crop Recommendations</h2>
                <p className="text-xs text-forest-medium/60 mt-1">
                  Correlated with Soil Health Cards, groundwater tables, and Agmarknet price indices.
                </p>
              </div>

              {/* Grid cards */}
              <div className="grid md:grid-cols-3 gap-8">
                {CROP_REC.map((crop, idx) => {
                  const isExpanded = expandedCrop === crop.id;
                  
                  return (
                    <motion.div
                      key={crop.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-6 rounded-[32px] bg-white border border-forest-medium/5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[440px] text-left"
                    >
                      {/* Suitability score badge */}
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-lg font-black text-forest-dark">{crop.name}</span>
                        <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-forest-light/5">
                          <span className="text-xs font-extrabold text-forest-medium">{crop.suitability}%</span>
                          <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              fill="none"
                              stroke="rgba(28, 63, 36, 0.05)"
                              strokeWidth="3.5"
                            />
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              fill="none"
                              stroke="#1C3F24"
                              strokeWidth="3.5"
                              strokeDasharray={2 * Math.PI * 20}
                              strokeDashoffset={2 * Math.PI * 20 * (1 - crop.suitability / 100)}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Suitability metrics */}
                      <div className="space-y-4 flex-1">
                        <div className="p-3.5 rounded-2xl bg-forest-light/5 border border-forest-medium/5">
                          <span className="text-[9px] text-forest-medium/40 block uppercase font-bold">Soil Health check</span>
                          <span className="text-xs font-bold block text-forest-dark mt-0.5">{crop.soilHealth}</span>
                        </div>
                        
                        <div className="p-3.5 rounded-2xl bg-forest-light/5 border border-forest-medium/5">
                          <span className="text-[9px] text-forest-medium/40 block uppercase font-bold">Market Returns</span>
                          <span className="text-xs font-bold block text-natural-green mt-0.5">{crop.profit}</span>
                        </div>

                        <p className="text-xs text-forest-medium/70 italic leading-relaxed pt-2 font-medium">
                          "{crop.reason}"
                        </p>

                        {/* Expandable Details container */}
                        <div className="pt-2">
                          <button
                            onClick={() => setExpandedCrop(isExpanded ? null : crop.id)}
                            className="flex items-center gap-1 text-[10px] font-bold text-google-blue uppercase tracking-wider"
                          >
                            {isExpanded ? "Hide Details" : "Read Grounding Details"}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-[11px] text-forest-medium/60 mt-2 leading-relaxed font-medium bg-forest-light/5 p-3 rounded-xl border border-forest-medium/5"
                              >
                                {crop.details}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-forest-medium/5 mt-6 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] text-forest-medium/40 uppercase block font-bold">Expected Yield</span>
                          <span className="text-xs font-bold block text-forest-dark">{crop.yield}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-forest-medium/40 uppercase block font-bold">Water Savings</span>
                          <span className="text-xs font-extrabold text-google-blue block">{crop.waterSaving}% less</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "disease" && (
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-black text-forest-dark">Leaf Disease Diagnostic Scanner</h2>
                <p className="text-xs text-forest-medium/60 mt-1">
                  Upload leaf/crop pictures to get immediate treatment summaries or escalate to RSK officers.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div className="w-full">
                {scanStatus === "idle" && (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`w-full h-64 rounded-3xl border border-dashed flex flex-col items-center justify-center p-6 transition-all ${
                      dragActive
                        ? "border-forest-medium bg-forest-light/5 scale-[1.01]"
                        : "border-forest-medium/15 bg-white hover:border-forest-light/35"
                    }`}
                  >
                    <input
                      type="file"
                      id="leaf-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <UploadCloud className="w-12 h-12 text-forest-medium/35 mb-4" />
                    <p className="text-sm font-bold text-forest-dark">Drag leaf photo here, or click to browse</p>
                    <p className="text-xs text-forest-medium/45 mt-1 font-semibold">Supports JPG, PNG up to 10MB</p>
                    <label
                      htmlFor="leaf-upload"
                      className="mt-6 px-5 py-2.5 rounded-full bg-forest-medium hover:bg-forest-dark text-white text-xs font-bold cursor-pointer transition-all shadow-sm magnetic-btn"
                    >
                      Select leaf image
                    </label>
                  </div>
                )}

                {/* Scanning overlay */}
                {scanStatus === "scanning" && (
                  <div className="w-full h-64 rounded-[32px] bg-white border border-forest-medium/10 shadow-md flex flex-col items-center justify-center p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-google-blue via-ai-purple to-natural-green animate-[shimmer_2s_infinite]" />
                    {scanningImage && (
                      <div
                        className="w-32 h-32 rounded-2xl bg-cover bg-center border border-forest-medium/10 mb-4 relative overflow-hidden"
                        style={{ backgroundImage: `url(${scanningImage})` }}
                      >
                        <motion.div
                          className="absolute left-0 w-full h-[3px] bg-natural-green shadow-[0_0_8px_#34A853]"
                          animate={{ top: ["0%", "100%", "0%"] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-forest-medium font-bold text-xs uppercase tracking-widest animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin text-forest-medium" />
                      AI Multimodal Vision Scan Active...
                    </div>
                  </div>
                )}

                {/* Diagnostic Result */}
                {scanStatus === "diagnosed" && diagnosticResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 rounded-[32px] bg-white border border-forest-medium/5 shadow-md space-y-6 text-left"
                  >
                    <div className="flex justify-between items-start gap-4 pb-4 border-b border-forest-medium/5">
                      <div>
                        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded bg-amber-warning/10 text-amber-600 border border-amber-warning/20">
                          DIAGNOSTIC SUMMARY
                        </span>
                        <h3 className="text-lg font-black text-forest-dark mt-1.5">{diagnosticResult.diseaseName}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-forest-medium/40 block font-bold">AI Confidence</span>
                        <span className="text-sm font-extrabold text-danger-red block mt-0.5">
                          {Math.round(diagnosticResult.confidence * 100)}% (Low Confidence)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-xs font-bold text-forest-dark block">Treatment Actions</span>
                        <ul className="list-disc list-inside text-xs text-forest-medium/70 mt-1.5 space-y-1 font-medium">
                          {diagnosticResult.treatment.map((t, idx) => (
                            <li key={idx}>{t}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Escalation Warning block */}
                      <div className="p-4 rounded-2xl bg-danger-red/10 border border-danger-red/20 text-danger-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-6 h-6 text-danger-red shrink-0" />
                          <div>
                            <span className="text-xs font-bold block text-danger-red">AI Confidence below threshold (&lt;65%)</span>
                            <span className="text-[10px] text-danger-900/80 block mt-0.5 font-medium">
                              This case contains visual ambiguities. We recommend escalating to a physical RSK Officer.
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={escalateCase}
                          className="px-4.5 py-2.5 rounded-full bg-danger-red hover:bg-danger-red/90 text-white text-xs font-bold transition-all shadow-sm shrink-0 w-full sm:w-auto"
                        >
                          Escalate to RSK
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Escalated state */}
                {scanStatus === "escalated" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 rounded-[32px] bg-white border border-forest-medium/10 shadow-md text-center space-y-4 flex flex-col items-center"
                  >
                    <span className="p-4 rounded-full bg-natural-green/10 text-natural-green inline-block shadow-sm">
                      <UserCheck className="w-8 h-8" />
                    </span>
                    <h3 className="text-lg font-black text-forest-dark">Case file Escalated successfully</h3>
                    <p className="text-xs text-forest-medium/60 max-w-sm mx-auto leading-relaxed font-semibold">
                      Your query, GPS coordinates, and photo have been transmitted to the nearest Rythu Seva Kendra (RSK) officer. You will receive an SMS alert when they reply.
                    </p>
                    <button
                      onClick={() => {
                        setScanStatus("idle");
                        setScanningImage(null);
                        setDiagnosticResult(null);
                      }}
                      className="px-5 py-2.5 rounded-full bg-forest-light/10 text-forest-medium text-xs font-bold hover:bg-forest-light/20 transition-all mt-4"
                    >
                      Scan another leaf
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {activeTab === "chat" && (
            <div className="grid md:grid-cols-3 gap-8 items-start">
              {/* Chat Interface Column */}
              <div className="md:col-span-2 space-y-4">
                <div className="p-6 rounded-[32px] bg-white border border-forest-medium/5 shadow-md h-[480px] flex flex-col justify-between">
                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[380px]">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[80%] ${
                          msg.sender === "farmer" ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <div
                          className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed text-left ${
                            msg.sender === "farmer"
                              ? "bg-forest-medium text-white rounded-tr-none"
                              : "bg-forest-light/5 text-forest-dark border border-forest-medium/5 rounded-tl-none"
                          }`}
                        >
                          {msg.text}
                          {msg.translation && (
                            <span className="block text-[10px] opacity-75 border-t border-current/10 pt-1.5 mt-1.5 font-mono italic">
                              Translation: {msg.translation}
                            </span>
                          )}
                        </div>

                        {/* Inline AI Reasoning steps */}
                        {msg.reasoningSteps && (
                          <div className="w-full mt-2.5 p-3.5 rounded-2xl bg-forest-light/5 border border-forest-medium/5 text-[10px] text-forest-medium text-left">
                            <span className="font-bold flex items-center gap-1 text-ai-purple uppercase mb-1.5">
                              <BrainCircuit className="w-3.5 h-3.5" /> AI Grounding pipeline:
                            </span>
                            <ul className="list-decimal list-inside space-y-1 font-semibold">
                              {msg.reasoningSteps.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <span className="text-[9px] text-forest-medium/40 mt-1 block">
                          {msg.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Input area */}
                  <div className="pt-4 border-t border-forest-medium/5 flex items-center gap-2 mt-4">
                    <button
                      onClick={() => setIsVoiceOpen(true)}
                      className="p-3.5 rounded-full bg-forest-light/5 hover:bg-forest-light/10 text-forest-medium border border-forest-medium/10 transition-all shadow-sm"
                      title="Speak Telugu"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      placeholder="Type query in Telugu or English..."
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                      className="flex-1 text-xs font-semibold px-4 py-3 rounded-full bg-forest-light/5 border border-forest-medium/5 outline-none placeholder:text-forest-medium/40"
                    />
                    <button
                      onClick={handleSendText}
                      className="p-3.5 rounded-full bg-forest-medium hover:bg-forest-dark text-white transition-all shadow-md magnetic-btn"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Thought Pipeline Overlay */}
              <div className="md:col-span-1 space-y-6">
                {isPipelineVisible ? (
                  <AIPipeline currentStep={activePipelineStep} />
                ) : (
                  <div className="p-6 rounded-[32px] bg-white border border-forest-medium/5 text-center py-16 text-forest-medium/50 space-y-4">
                    <Sparkles className="w-8 h-8 text-ai-purple mx-auto animate-pulse" />
                    <p className="text-xs font-bold">AI Pipeline status: Idle</p>
                    <p className="text-[10px] text-forest-medium/40 max-w-[200px] mx-auto leading-relaxed font-semibold">
                      Use the microphone button and complete a simulated audio query to see the real-time AI reasoning.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Voice Recorder Overlay Modal */}
      <AnimatePresence>
        {isVoiceOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md relative"
            >
              <button
                onClick={() => setIsVoiceOpen(false)}
                className="absolute top-3.5 right-3.5 text-forest-medium hover:text-forest-dark text-xs font-extrabold z-30"
              >
                Close
              </button>
              <VoiceRecorder
                onTranscriptComplete={handleVoiceNoteResult}
                onClose={() => setIsVoiceOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
