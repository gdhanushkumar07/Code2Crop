"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Search,
  Bell,
  Clock,
  CheckCircle,
  MapPin,
  User,
  ArrowLeft,
  Send,
  ImageIcon,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { MapCase } from "@/components/map/MapContainer";
import dynamic from "next/dynamic";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const MapContainer = dynamic(() => import("@/components/map/MapContainer"), { ssr: false });

const ADMIN_EMAIL = "anachipravalgupta@gmail.com";

export default function RSKOfficerPortal() {
  const [cases, setCases] = useState<MapCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<MapCase | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "medium">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [notifications, setNotifications] = useState<string[]>([
    "Operations Center initialized successfully",
    "Advisory Update: Dry-spell warning broadcast successfully",
  ]);
  const [hasUnseenNotifications, setHasUnseenNotifications] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedCaseChat, setSelectedCaseChat] = useState<any[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const previousUserIdRef = useRef<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const knownCaseIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Helper to calculate exact time ago dynamically
  const formatTimeAgo = (createdAt: number | undefined) => {
    if (!createdAt) return "Just now";
    const diffMs = Date.now() - createdAt;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Auth state — check if current user is admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        // Check Firestore for admin role first, fall back to email match
        let admin = firebaseUser.email === ADMIN_EMAIL;
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists() && userDoc.data().role === "admin") {
            admin = true;
          }
        } catch {}
        setIsAdmin(admin);
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Deduplicate messages by ID before merging
  const deduplicateMessages = (existing: any[], incoming: any[]) => {
    const seen = new Set(existing.map((m) => m.id));
    const merged = [...existing];
    for (const msg of incoming) {
      if (!seen.has(msg.id)) {
        merged.push(msg);
        seen.add(msg.id);
      }
    }
    return merged;
  };

  // Fetch chat history only when userId changes (not on every poll)
  useEffect(() => {
    if (selectedCase && selectedCase.userId) {
      if (previousUserIdRef.current !== selectedCase.userId) {
        previousUserIdRef.current = selectedCase.userId;
        fetchChatHistory(selectedCase.userId);
      }
    } else {
      setSelectedCaseChat([]);
      previousUserIdRef.current = null;
    }
  }, [selectedCase?.userId]);

  // Auto-scroll chat to latest message when chat updates
  useEffect(() => {
    if (selectedCaseChat.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedCaseChat.length]);

  // Reset image loading/error states when case changes
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
  }, [selectedCase?.farmerImage]);

  const fetchChatHistory = async (caseUserId: string) => {
    if (isLoadingChat) return;
    setIsLoadingChat(true);
    try {
      const res = await fetch(`/api/escalations/chat?userId=${caseUserId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setSelectedCaseChat((prev) => deduplicateMessages(prev, data.messages));
        }
      }
    } catch (e) {
      console.error("Error loading chat transcript history:", e);
    } finally {
      setIsLoadingChat(false);
    }
  };

  useEffect(() => {
    fetchCases();
    const interval = setInterval(fetchCases, 8000); // refresh every 8 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchCases = async () => {
    try {
      const res = await fetch("/api/escalations");
      if (res.ok) {
        const data = await res.json();
        if (data.cases) {
          // Only show real Firestore cases — never fall back to mock/dummy data
          const dbCases = data.cases;
          setCases(dbCases);
          
          setSelectedCase((prev) => {
            if (prev && dbCases.some((c: any) => c.id === prev.id)) {
              return dbCases.find((c: any) => c.id === prev.id);
            }
            return dbCases[0] || null;
          });

          // Detect new arrivals
          let addedAny = false;
          const newAlerts: string[] = [];

          dbCases.forEach((c: any) => {
            if (!knownCaseIdsRef.current.has(c.id)) {
              knownCaseIdsRef.current.add(c.id);
              if (!isFirstLoadRef.current) {
                newAlerts.push(`New case escalated by ${c.farmerName} (${c.crop})`);
                addedAny = true;
              }
            }
          });

          if (isFirstLoadRef.current) {
            isFirstLoadRef.current = false;
          }

          if (addedAny) {
            setNotifications((prev) => [...newAlerts, ...prev]);
            setHasUnseenNotifications(true);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching cases from Firestore:", e);
    }
  };

  const handleResolveCase = async (caseId: string) => {
    try {
      const res = await fetch("/api/escalations/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId })
      });

      if (res.ok) {
        setCases((prev) => prev.filter((c) => c.id !== caseId));
        setSelectedCase(null);
        setNotifications((prev) => [`Case ${caseId} resolved — closure message sent to farmer`, ...prev]);
      }
    } catch (e) {
      console.error("Error resolving case:", e);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedCase) return;
    const text = replyText.trim();
    setReplyText("");

    try {
      const res = await fetch("/api/escalations/send-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCase.id,
          replyText: text
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.warning) {
          setNotifications((prev) => [`Reply saved to chat. ${data.warning}`, ...prev]);
        } else {
          setNotifications((prev) => [`Reply dispatched to ${selectedCase.farmerName} on WhatsApp`, ...prev]);
        }
        // Re-fetch chat to show the new message
        if (selectedCase.userId) {
          fetchChatHistory(selectedCase.userId);
        }
      }
    } catch (e) {
      console.error("Error dispatching advisory response:", e);
    }
  };

  const filteredCases = cases
    .filter((c) => (filter === "all" ? true : c.severity === filter))
    .filter(
      (c) =>
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.crop.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-google-blue/20 font-sans">
      {/* Top Operations Header */}
      <header className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-all border border-slate-200"
            title="Back to Landing Page"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="h-2.5 w-2.5 rounded-full bg-danger-red animate-pulse" />
          <div className="text-left">
            <h1 className="text-sm font-extrabold tracking-wider uppercase flex items-center gap-1.5 text-slate-950">
              RSK Operations Center
            </h1>
          </div>
        </div>

        {/* Telemetry metrics */}
        <div className="hidden lg:flex items-center gap-8 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <div>
            <span className="block text-slate-400">Active queue size</span>
            <span className="text-xs font-black text-slate-800 mt-0.5">{cases.length} pending</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div>
            <span className="block text-slate-400">AI Resolution rate</span>
            <span className="text-xs font-black text-natural-green mt-0.5">84.2% Auto-approved</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div>
            <span className="block text-slate-400">Target Response</span>
            <span className="text-xs font-black text-slate-800 mt-0.5">&lt; 15 mins</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4 relative">
          <div className="relative">
            <button 
              onClick={() => {
                setIsNotificationOpen(!isNotificationOpen);
                setHasUnseenNotifications(false);
              }}
              className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 relative transition-all border border-slate-200"
            >
              <Bell className="w-4 h-4" />
              {hasUnseenNotifications && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-danger-red border border-white" />
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-white border border-slate-200 shadow-2xl p-4.5 z-[9999] space-y-3.5 text-slate-800">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">Operations Feed</span>
                  <button 
                    onClick={() => {
                      setNotifications([]);
                      setHasUnseenNotifications(false);
                    }}
                    className="text-[9px] uppercase font-black text-danger-red hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="text-[11px] text-slate-400 py-8 text-center font-bold">No active alerts.</div>
                  ) : (
                    notifications.map((notif, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 leading-relaxed font-semibold">
                        {notif}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>{currentUser?.displayName || currentUser?.email?.split("@")[0] || "Officer"}</span>
            {isAdmin && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-wider border border-amber-200">
                <ShieldCheck className="w-2.5 h-2.5" /> Admin
              </span>
            )}
          </div>
          {currentUser && (
            <button onClick={() => signOut(auth)} className="text-[9px] text-slate-400 hover:text-danger-red font-bold ml-1">
              Sign out
            </button>
          )}
        </div>
      </header>

      {/* Main Command Dashboard Layout */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative z-10">
        
        {/* Left Side: Cases Queue sidebar */}
        <div className="w-full xl:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Filters & Search */}
          <div className="p-4 border-b border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by RSK ID, name, crop..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 font-semibold"
              />
            </div>
            
            {/* Severity selectors */}
            <div className="flex gap-1.5">
              <button
                onClick={() => setFilter("all")}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  filter === "all" ? "bg-slate-200 text-slate-800" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                All ({cases.length})
              </button>
              <button
                onClick={() => setFilter("high")}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  filter === "high"
                    ? "bg-danger-red/10 text-danger-red border border-danger-red/20"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                High
              </button>
              <button
                onClick={() => setFilter("medium")}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  filter === "medium"
                    ? "bg-amber-warning/10 text-amber-650 border border-amber-warning/20"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Medium
              </button>
            </div>
          </div>

          {/* Scrollable Case Queue */}
          <div className="flex-grow overflow-y-auto divide-y divide-slate-100">
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
                        ? "bg-slate-100/90 border-l-4 border-google-blue"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-slate-900">{c.farmerName}</span>
                      <span className="text-[9px] text-slate-450 flex items-center gap-1 font-mono font-bold">
                        <Clock className="w-3 h-3 text-slate-400" /> {formatTimeAgo(c.createdAt)}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-google-blue/80 mt-0.5 block">{c.id}</span>
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                      {c.lat !== null && c.lng !== null
                        ? `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`
                        : (c.village && c.village !== "Updated Location" ? c.village : "Unknown Coordinates")} • {c.crop}
                    </p>
                    <p className="text-xs font-medium text-slate-600 mt-1 line-clamp-1 leading-relaxed">{c.issue}</p>
                    
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[9px] px-2 py-0.5 rounded bg-slate-100 text-slate-550 font-semibold uppercase">
                        AI Conf: {Math.round(c.confidence * 100)}%
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          c.severity === "high"
                            ? "bg-danger-red/10 text-danger-red border border-danger-red/20"
                            : "bg-amber-warning/10 text-amber-600 border border-amber-warning/20"
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
              <div className="p-8 text-center py-16 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-xs font-bold text-slate-400">No active escalations</p>
                <p className="text-[10px] text-slate-350 font-medium max-w-[160px] leading-relaxed">
                  All clear. Escalated farmer cases will appear here when submitted via website or WhatsApp.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Center: District Maps Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
          <div className="flex-1 p-6 relative">
            <MapContainer
              cases={cases}
              selectedCaseId={selectedCase?.id}
              onSelectCase={(c) => setSelectedCase(c)}
              isDarkTheme={false}
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
              className="w-full xl:w-96 bg-white border-l border-slate-200 flex flex-col justify-between shrink-0"
            >
              {/* Header */}
              <div className="p-4.5 border-b border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-danger-red animate-pulse" /> Case File Inspector
                </span>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="text-xs text-slate-400 hover:text-slate-700 font-bold"
                >
                  Close
                </button>
              </div>

              {/* Scrollable details */}
              <div className="flex-grow overflow-y-auto p-4 space-y-6">
                {/* Visual Overview */}
                <div
                  className="w-full h-44 rounded-2xl bg-cover bg-center border border-slate-200 relative overflow-hidden shadow-md"
                  style={{ backgroundImage: `url(${selectedCase.image})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-left">
                    <span className="text-[9px] font-bold bg-danger-red px-2 py-0.5 rounded text-white block w-fit mb-1 uppercase tracking-wider">
                      Confidence Mismatch (&lt;65%)
                    </span>
                    <h3 className="text-sm font-black text-white">{selectedCase.farmerName}</h3>
                    <span className="text-[10px] font-mono font-bold text-white/70 mt-0.5 block">{selectedCase.id}</span>
                  </div>
                </div>

                {/* Farmer Details */}
                <div className="space-y-4 text-left">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Village Coordinates</span>
                      <span className="text-xs font-bold text-slate-700 block flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {selectedCase.lat !== null && selectedCase.lng !== null
                          ? `${selectedCase.lat.toFixed(6)}, ${selectedCase.lng.toFixed(6)}`
                          : (selectedCase.village && selectedCase.village !== "Updated Location" ? selectedCase.village : "Unknown Coordinates")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Target Crop</span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5">{selectedCase.crop}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">AI Diagnosis Outcome</span>
                    <span className="text-xs font-bold text-slate-700 block mt-0.5">{selectedCase.issue}</span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Speech Transcription / Issue</span>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200 font-semibold">
                      "{selectedCase.description}"
                    </p>
                  </div>

                  {/* Farmer-uploaded image if available */}
                  {selectedCase.farmerImage && (
                    <div className="space-y-2">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Farmer-Uploaded Image</span>
                      {imageLoading && (
                        <div className="w-full h-48 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center animate-pulse">
                          <ImageIcon className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                      {imageError && (
                        <div className="w-full h-48 rounded-2xl bg-red-50 border border-red-200 flex flex-col items-center justify-center gap-2 text-red-400">
                          <AlertTriangle className="w-6 h-6" />
                          <span className="text-[10px] font-bold">Image failed to load</span>
                        </div>
                      )}
                      <img
                        key={selectedCase.farmerImage}
                        src={selectedCase.farmerImage}
                        alt="Farmer uploaded crop image"
                        className={`w-full rounded-2xl object-cover max-h-48 border border-slate-200 shadow-sm ${imageLoading ? 'hidden' : 'block'}`}
                        onLoad={() => setImageLoading(false)}
                        onError={() => { setImageLoading(false); setImageError(true); }}
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Conversation History Log — admin only */}
                  {isAdmin && (
                    <div className="space-y-2">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Farmer-AI Chat Log</span>
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl max-h-72 overflow-y-auto space-y-3.5 scrollbar-thin">
                        {isLoadingChat ? (
                          <div className="text-[11px] text-slate-400 text-center py-6 font-bold">Loading conversation logs...</div>
                        ) : !selectedCase.userId ? (
                          <div className="text-[11px] text-slate-450 text-center py-6 font-bold">
                            Chat history unavailable — this case was created before user tracking was enabled.
                          </div>
                        ) : selectedCaseChat.length === 0 ? (
                          <div className="text-[11px] text-slate-450 text-center py-6 font-bold">No messages found for this farmer.</div>
                        ) : (
                          <>
                            {selectedCaseChat.map((msg, idx) => {
                              const isAI = msg.sender === "ai";
                              return (
                                <div key={msg.id || idx} className={`flex flex-col ${isAI ? 'items-end' : 'items-start'}`}>
                                  <span className="text-[8px] text-slate-400 font-bold mb-0.5 px-1">{isAI ? 'AI' : 'Farmer'}</span>
                                  <div className={`p-3 rounded-2xl max-w-[85%] text-xs font-semibold leading-relaxed ${
                                    isAI 
                                      ? 'bg-google-blue/10 text-google-blue border border-google-blue/15' 
                                      : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                                  }`}>
                                    {msg.imageUrl && (
                                      <img 
                                        src={msg.imageUrl} 
                                        alt="Uploaded leaf spot" 
                                        className="rounded-lg max-h-36 object-cover mb-2 border border-slate-100" 
                                      />
                                    )}
                                    <div className="whitespace-pre-wrap">{msg.text}</div>
                                  </div>
                                  <span className="text-[8px] text-slate-400 mt-0.5 px-1 font-mono">{msg.timestamp}</span>
                                </div>
                              );
                            })}
                            <div ref={chatEndRef} />
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Telemetry Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-left">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    <span>AI Classifier Confidence</span>
                    <span className="font-mono text-danger-red font-black text-xs">
                      {Math.round(selectedCase.confidence * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    <span>Required action</span>
                    <span className="text-slate-800 font-extrabold">Expert prescription note</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions — admin only */}
              {isAdmin && (
                <div className="p-4.5 border-t border-slate-200 bg-slate-50 space-y-4">
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block text-left">
                    Decision & Response Broadcast
                  </span>
                  
                  {/* Input area */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type prescription dosage..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                      className="flex-1 text-xs font-semibold px-4 py-3.5 rounded-full bg-white border border-slate-200 outline-none placeholder:text-slate-400 text-slate-800 shadow-sm"
                    />
                    <button
                      onClick={handleSendReply}
                      className="p-3.5 rounded-full bg-google-blue hover:bg-blue-600 text-white transition-all shadow-md animate-pulse"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <button
                      onClick={() => handleResolveCase(selectedCase.id)}
                      className="w-full py-3 rounded-full bg-natural-green hover:bg-green-600 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve & Resolve
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
