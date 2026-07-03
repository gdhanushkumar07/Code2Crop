"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Search,
  Bell,
  Clock,
  CheckCircle,
  MapPin,
  FileText,
  User,
  Compass,
  ArrowLeft,
  ChevronRight,
  Send,
  Mic,
  PhoneCall,
  Volume2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import MapContainer, { MapCase } from "@/components/map/MapContainer";

// Mock baseline escalated cases
const BASE_CASES: MapCase[] = [
  {
    id: "case_1",
    farmerName: "Mallaiah Goud",
    village: "Karimnagar Rural",
    crop: "Cotton",
    issue: "Severe leaf reddening and wilting",
    severity: "high",
    lat: 35.2,
    lng: 48.5,
    confidence: 0.45,
    image: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=150&q=80",
    description: "Leaves show severe reddish spots spreading from outer edges. AI Vision flagged low confidence between Leaf Reddening vs Magnesium deficiency.",
  },
  {
    id: "case_2",
    farmerName: "Anasuya Devi",
    village: "Siddipet District",
    crop: "Rice (Paddy)",
    issue: "Brown plant hopper signs",
    severity: "medium",
    lat: 68.4,
    lng: 55.2,
    confidence: 0.62,
    image: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=150&q=80",
    description: "Yellowing stems near base. Stretches of crop lodging observed. AI suggests Brown Plant Hopper with 62% confidence; expert verification required.",
  },
  {
    id: "case_3",
    farmerName: "Bheem Reddy",
    village: "Peddapalli Mandal",
    crop: "Maize",
    issue: "Fall Armyworm damage",
    severity: "high",
    lat: 48.9,
    lng: 28.3,
    confidence: 0.51,
    image: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=150&q=80",
    description: "Ragged holes in whorls and leaves. Large amount of frass present. Suspected high severity outbreak.",
  },
];

export default function RSKOfficerPortal() {
  const [cases, setCases] = useState<MapCase[]>(BASE_CASES);
  const [selectedCase, setSelectedCase] = useState<MapCase | null>(BASE_CASES[0]);
  const [filter, setFilter] = useState<"all" | "high" | "medium">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [notifications, setNotifications] = useState<string[]>([
    "New Case: Mallaiah Goud escalated Cotton issue",
    "Advisory Update: Dry-spell warning broadcast successfully",
  ]);

  useEffect(() => {
    const local = localStorage.getItem("escalated_cases");
    if (local) {
      try {
        const parsed = JSON.parse(local) as MapCase[];
        const combined = [...BASE_CASES];
        parsed.forEach((c) => {
          if (!combined.some((x) => x.id === c.id)) {
            combined.unshift(c); 
          }
        });
        setCases(combined);
        if (combined.length > 0) {
          setSelectedCase(combined[0]);
        }
      } catch (e) {
        console.error("Error reading escalated cases", e);
      }
    }
  }, []);

  const handleResolveCase = (caseId: string) => {
    setCases((prev) => prev.filter((c) => c.id !== caseId));
    
    const local = localStorage.getItem("escalated_cases");
    if (local) {
      try {
        const parsed = JSON.parse(local) as MapCase[];
        const filtered = parsed.filter((c) => c.id !== caseId);
        localStorage.setItem("escalated_cases", JSON.stringify(filtered));
      } catch (e) {
        console.error(e);
      }
    }

    setSelectedCase(null);
    setNotifications((prev) => [`Case resolved and feedback pushed to farmer`, ...prev]);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedCase) return;
    
    setNotifications((prev) => [`Reply sent to ${selectedCase.farmerName}`, ...prev]);
    setReplyText("");
    
    setTimeout(() => {
      handleResolveCase(selectedCase.id);
    }, 1000);
  };

  const filteredCases = cases
    .filter((c) => (filter === "all" ? true : c.severity === filter))
    .filter(
      (c) =>
        c.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.crop.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-rsk-dark text-slate-100 flex flex-col selection:bg-google-blue/30 font-sans">
      {/* Top Operations Header */}
      <header className="px-6 py-4 bg-[#090b0e] border-b border-white/5 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
            title="Back to Landing Page"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="h-2 w-2 rounded-full bg-danger-red animate-pulse" />
          <div className="text-left">
            <h1 className="text-sm font-extrabold tracking-wider uppercase flex items-center gap-1.5">
              RSK Operations Center
            </h1>
            <span className="text-[10px] text-slate-400 block font-bold mt-0.5">
              Karimnagar East Command Unit
            </span>
          </div>
        </div>

        {/* Telemetry metrics */}
        <div className="hidden lg:flex items-center gap-8 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <div>
            <span className="block text-slate-500">Active queue size</span>
            <span className="text-xs font-black text-slate-200 mt-0.5">{cases.length} pending</span>
          </div>
          <div className="h-6 w-[1px] bg-white/5" />
          <div>
            <span className="block text-slate-500">AI Resolution rate</span>
            <span className="text-xs font-black text-natural-green mt-0.5">84.2% Auto-approved</span>
          </div>
          <div className="h-6 w-[1px] bg-white/5" />
          <div>
            <span className="block text-slate-500">Target Response</span>
            <span className="text-xs font-black text-slate-200 mt-0.5">&lt; 15 mins</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <button className="p-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 relative transition-all border border-white/5">
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger-red" />
            )}
          </button>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300">Officer S. Rao</span>
          </div>
        </div>
      </header>

      {/* Main Command Dashboard Layout */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative z-10">
        
        {/* Left Side: Cases Queue sidebar */}
        <div className="w-full xl:w-96 bg-[#090b0e] border-r border-white/5 flex flex-col shrink-0">
          {/* Filters & Search */}
          <div className="p-4 border-b border-white/5 space-y-4">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-400">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search case records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 font-semibold"
              />
            </div>
            
            {/* Severity selectors */}
            <div className="flex gap-1.5">
              <button
                onClick={() => setFilter("all")}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  filter === "all" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                All ({cases.length})
              </button>
              <button
                onClick={() => setFilter("high")}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  filter === "high"
                    ? "bg-danger-red/20 text-danger-red border border-danger-red/35"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                High
              </button>
              <button
                onClick={() => setFilter("medium")}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  filter === "medium"
                    ? "bg-amber-warning/20 text-amber-500 border border-amber-warning/35"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Medium
              </button>
            </div>
          </div>

          {/* Scrollable Case Queue */}
          <div className="flex-grow overflow-y-auto divide-y divide-white/5">
            <AnimatePresence>
              {filteredCases.map((c) => {
                const isSelected = selectedCase?.id === c.id;
                
                return (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onClick={() => setSelectedCase(c)}
                    className={`p-4.5 cursor-pointer text-left transition-all ${
                      isSelected
                        ? "bg-white/5 border-l-4 border-google-blue"
                        : "hover:bg-[#12161b]"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-slate-200">{c.farmerName}</span>
                      <span className="text-[9px] text-slate-500 flex items-center gap-1 font-mono font-bold">
                        <Clock className="w-3 h-3" /> 2m ago
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">{c.village} • {c.crop}</p>
                    <p className="text-xs font-medium text-slate-300 mt-1 line-clamp-1 leading-relaxed">{c.issue}</p>
                    
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-slate-400 font-semibold uppercase">
                        AI Conf: {Math.round(c.confidence * 100)}%
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          c.severity === "high"
                            ? "bg-danger-red/10 text-danger-red border border-danger-red/20"
                            : "bg-amber-warning/10 text-amber-500 border border-amber-warning/20"
                        }`}
                      >
                        {c.severity.toUpperCase()}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredCases.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs py-16">
                No escalated cases in current queue.
              </div>
            )}
          </div>
        </div>

        {/* Center: District Maps Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#06080b]">
          <div className="flex-1 p-6 relative">
            <MapContainer
              cases={cases}
              selectedCaseId={selectedCase?.id}
              onSelectCase={(c) => setSelectedCase(c)}
              isDarkTheme={true}
            />
          </div>
        </div>

        {/* Right Side: Case Details Drawer */}
        <AnimatePresence>
          {selectedCase && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full xl:w-96 bg-[#090b0e] border-l border-white/5 flex flex-col justify-between shrink-0"
            >
              {/* Header */}
              <div className="p-4.5 border-b border-white/5 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-danger-red animate-pulse" /> Case File Inspector
                </span>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="text-xs text-slate-500 hover:text-slate-300 font-bold"
                >
                  Close
                </button>
              </div>

              {/* Scrollable details */}
              <div className="flex-grow overflow-y-auto p-4 space-y-6">
                {/* Visual Overview */}
                <div
                  className="w-full h-44 rounded-2xl bg-cover bg-center border border-white/10 relative overflow-hidden shadow-md"
                  style={{ backgroundImage: `url(${selectedCase.image})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-left">
                    <span className="text-[9px] font-bold bg-danger-red px-2 py-0.5 rounded text-white block w-fit mb-1 uppercase tracking-wider">
                      Confidence Mismatch (&lt;65%)
                    </span>
                    <h3 className="text-sm font-black text-white">{selectedCase.farmerName}</h3>
                  </div>
                </div>

                {/* Farmer Details */}
                <div className="space-y-4 text-left">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Village Coordinates</span>
                      <span className="text-xs font-bold text-slate-300 block flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {selectedCase.village}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Target Crop</span>
                      <span className="text-xs font-bold text-slate-300 block mt-0.5">{selectedCase.crop}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">AI Diagnosis Outcome</span>
                    <span className="text-xs font-bold text-slate-300 block mt-0.5">{selectedCase.issue}</span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Speech Transcription</span>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed bg-white/5 p-3.5 rounded-2xl border border-white/5 font-semibold">
                      "{selectedCase.description}"
                    </p>
                  </div>
                </div>

                {/* Telemetry Summary */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2.5 text-left">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <span>AI Classifier Confidence</span>
                    <span className="font-mono text-danger-red font-black text-xs">
                      {Math.round(selectedCase.confidence * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <span>Required action</span>
                    <span className="text-slate-200 font-extrabold">Expert prescription note</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-4.5 border-t border-white/5 bg-[#0b0d10] space-y-4">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block text-left">
                  Decision & Response Broadcast
                </span>
                
                {/* Input area */}
                <div className="flex gap-2">
                  <button
                    className="p-3.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 transition-all"
                    title="Record voice reply note"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    placeholder="Type prescription dosage..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                    className="flex-1 text-xs font-semibold px-4 py-3.5 rounded-full bg-white/5 border border-white/5 outline-none placeholder:text-slate-600 text-slate-200"
                  />
                  <button
                    onClick={handleSendReply}
                    className="p-3.5 rounded-full bg-google-blue hover:bg-blue-600 text-white transition-all shadow-md"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolveCase(selectedCase.id)}
                    className="flex-1 py-3 rounded-full bg-natural-green hover:bg-green-600 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve & Resolve
                  </button>
                  <button
                    onClick={() => setSelectedCase(null)}
                    className="px-5 py-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold transition-all border border-white/5"
                  >
                    Defer
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
