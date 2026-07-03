"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Smartphone,
  Cpu,
  Database,
  ArrowRight,
  RefreshCw,
  Mic,
  MessageSquare,
  AlertTriangle,
  Layers,
  Send,
  Languages,
  CheckCircle,
  Clock,
  ShieldCheck,
  Eye,
  Navigation,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface DemoStep {
  num: number;
  title: string;
  gcpTech: string[];
  farmerAction: string;
  systemAction: string;
  description: string;
  view: "whatsapp" | "farmer_portal" | "rsk_portal" | "sms";
}

const DEMO_STEPS: DemoStep[] = [
  {
    num: 1,
    title: "Multilingual Crop Query",
    gcpTech: ["Speech-to-Text", "Translation API", "Gemini 1.5 Pro"],
    farmerAction: "Farmer sends a Telugu voice note asking what to plant.",
    systemAction: "AI transcribes, translates, calls grounding tools, and replies with grounded recommendation.",
    description: "Demonstrates Indic Speech-to-Text, Translation, and Gemini function-calling to check NDVI satellite indicators and Soil Health data before deciding.",
    view: "whatsapp",
  },
  {
    num: 2,
    title: "Proactive Dry-Spell Warning",
    gcpTech: ["Cloud Scheduler", "Pub/Sub", "Gemini API"],
    farmerAction: "Receives push notification warning about a dry-spell.",
    systemAction: "Cloud Scheduler runs checks, flags rain deficit, Gemini generates localized advisory.",
    description: "Proactive warning delivery to help the farmer irrigate fields 2 days before the dry-spell arrives, saving the crop.",
    view: "farmer_portal",
  },
  {
    num: 3,
    title: "Leaf Disease Diagnostic Scan",
    gcpTech: ["Gemini 1.5 Flash (Vision)"],
    farmerAction: "Farmer uploads leaf photo + voice note describing yellow spots.",
    systemAction: "AI analyzes photo; confidence score falls below 65% threshold.",
    description: "Fuses image and voice symptoms. Since confidence is low, the AI flags a risk and prepares expert escalation.",
    view: "farmer_portal",
  },
  {
    num: 4,
    title: "RSK Case Escalation",
    gcpTech: ["Firebase Firestore", "Google Maps Platform"],
    farmerAction: "Case is auto-transmitted to the Rythu Seva Kendra dashboard.",
    systemAction: "Case appears on RSK officer's map with coordinates, photo, and AI notes.",
    description: "End-to-end human-in-the-loop fallback. Officer gets notified of a low-confidence case needing manual prescription.",
    view: "rsk_portal",
  },
  {
    num: 5,
    title: "Expert Resolution Broadcast",
    gcpTech: ["Firebase Realtime SDK", "WhatsApp Business API"],
    farmerAction: "Officer sends voice/text prescription; farmer receives it instantly.",
    systemAction: "Pushes resolved instructions back to farmer; updates training dataset.",
    description: "Closes the feedback loop. Officer's verified solution helps retrain the local classifier for next season.",
    view: "rsk_portal",
  },
  {
    num: 6,
    title: "Low-Connectivity SMS Fallback",
    gcpTech: ["Dialogflow CX", "SMS Gateway Webhook"],
    farmerAction: "Offline farmer queries crop recommendations using plain text.",
    systemAction: "Replies in local language over SMS using structured Dialogflow CX loops.",
    description: "Proves inclusivity. Farmers with standard feature phones can access the same recommendation engine offline.",
    view: "sms",
  },
];

export default function DemoPage() {
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [whatsappMessages, setWhatsappMessages] = useState<any[]>([
    { sender: "system", text: "Connecting to WhatsApp Business API Sandbox..." },
  ]);
  const [smsMessages, setSmsMessages] = useState<any[]>([
    { sender: "system", text: "SMS Fallback Gateway Active" },
  ]);
  const [simulatedStatus, setSimulatedStatus] = useState<string>("Ready to begin demo...");
  const [isProcessing, setIsProcessing] = useState(false);

  // States for simulated screens
  const [leafScanned, setLeafScanned] = useState(false);
  const [scanConfidence, setScanConfidence] = useState(0);
  const [rskNotification, setRskNotification] = useState(false);

  const activeStep = DEMO_STEPS[activeStepIdx];

  const runStepSimulation = (idx: number) => {
    setIsProcessing(true);
    setSimulatedStatus("Executing step simulation...");

    if (idx === 0) {
      setWhatsappMessages([
        { sender: "system", text: "Connecting to WhatsApp Business API Sandbox..." },
        { sender: "farmer", text: "🎙️ Telugu Voice Note (0:04)", translation: "What crop should I plant next season?" },
      ]);
      setTimeout(() => {
        setSimulatedStatus("STT transcribing Telugu...");
        setTimeout(() => {
          setSimulatedStatus("Grounded reasoning on Soil Health & NDVI data...");
          setTimeout(() => {
            setWhatsappMessages((prev) => [
              ...prev,
              {
                sender: "ai",
                text: "ఆధారిత సిఫార్సు: వేరుశెనగ (Groundnut) పంటను వేయండి. మీ పొలంలో తేమ 18% తక్కువగా ఉంది, వేరుశెనగకు వరి కంటే 60% తక్కువ నీరు అవసరం మరియు మార్కెట్ ధరలు బాగున్నాయి.",
                translation: "Plant Groundnut. Soil moisture is 18% below average, groundnut needs 60% less water than paddy, and prices are favorable (+12%).",
                confidence: 92,
              },
            ]);
            setSimulatedStatus("Step 1 complete: Multilingual crop query resolved.");
            setIsProcessing(false);
          }, 1500);
        }, 1200);
      }, 1000);
    } else if (idx === 1) {
      setSimulatedStatus("Simulating scheduler trigger for dry-spell...");
      setTimeout(() => {
        setSimulatedStatus("Dry-spell risk flagged (deficits over 6 days)...");
        setTimeout(() => {
          setSimulatedStatus("Step 2 complete: Proactive dry-spell warning pushed.");
          setIsProcessing(false);
        }, 1200);
      }, 1000);
    } else if (idx === 2) {
      setLeafScanned(true);
      setScanConfidence(58);
      setSimulatedStatus("Gemini Multimodal Vision scanning leaf photo...");
      setTimeout(() => {
        setSimulatedStatus("Leaf spot blight identified. Confidence: 58% (<65% threshold)");
        setTimeout(() => {
          setSimulatedStatus("Step 3 complete: AI diagnostic flagged for escalation.");
          setIsProcessing(false);
        }, 1200);
      }, 1500);
    } else if (idx === 3) {
      setRskNotification(true);
      setSimulatedStatus("Creating case file in Firestore collection...");
      setTimeout(() => {
        setSimulatedStatus("Case pin pushed to Karimnagar East Command Unit Map...");
        setTimeout(() => {
          setSimulatedStatus("Step 4 complete: Case escalated to RSK Officer dashboard.");
          setIsProcessing(false);
        }, 1200);
      }, 1000);
    } else if (idx === 4) {
      setSimulatedStatus("Officer S. Rao reviewing escalated details...");
      setTimeout(() => {
        setSimulatedStatus("Broadcasting resolved prescription back to farmer...");
        setWhatsappMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: "📞 RSK Officer response: Apply Chlorothalonil fungicide (2.0 g/L) immediately. Clear infected rows to prevent spore spread.",
            translation: "Officer Rao resolved: Leaf spot blight confirmed. Apply fungicide, clear infected rows.",
          },
        ]);
        setRskNotification(false);
        setSimulatedStatus("Step 5 complete: Closed feedback loop.");
        setIsProcessing(false);
      }, 1500);
    } else if (idx === 5) {
      setSmsMessages([
        { sender: "farmer", text: "CROP IN-TS-738" },
      ]);
      setSimulatedStatus("Dialogflow CX routing SMS keyword...");
      setTimeout(() => {
        setSmsMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: "KISAN ALERT: Top crop: Groundnut (92% fit). Water required: 60% less than Paddy. Expected return: +₹14,500/acre. Reply ALERT ON for warnings.",
          },
        ]);
        setSimulatedStatus("Step 6 complete: Offline crop query resolved via SMS.");
        setIsProcessing(false);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-warm-bg text-forest-dark flex flex-col font-sans relative overflow-hidden">
      <div className="grain-overlay absolute inset-0 z-0 opacity-15" />
      <div className="glow-blob w-[500px] h-[500px] bg-forest-light top-[-100px] left-[-150px] opacity-15" />
      <div className="glow-blob w-[500px] h-[500px] bg-ai-purple bottom-[-100px] right-[-150px] opacity-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full px-6 py-4 backdrop-blur-xl bg-warm-bg/75 border-b border-forest-medium/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-forest-medium to-forest-light text-white shadow-md">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <span className="font-extrabold text-base tracking-tight block">Code2Crop</span>
              <span className="text-[9px] text-forest-medium/55 block font-bold uppercase tracking-widest mt-0.5">Live Demo</span>
            </div>
          </Link>
          <div className="flex gap-4">
            <Link href="/farmer" className="text-xs font-bold text-forest-medium">Farmer Portal</Link>
            <Link href="/rsk" className="text-xs font-bold text-forest-medium">RSK Dashboard</Link>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid lg:grid-cols-12 gap-8 items-stretch z-10">
        
        {/* Left Side Controllers (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="text-left">
              <span className="text-[9px] font-bold text-ai-purple uppercase tracking-widest bg-ai-purple/10 px-2.5 py-1 rounded-full">
                Interactive Walkthrough
              </span>
              <h2 className="text-2xl font-black text-forest-dark mt-3 flex items-center gap-1.5 uppercase">
                <Sparkles className="w-5 h-5 text-ai-purple" />
                Judges Panel
              </h2>
              <p className="text-xs text-forest-medium/60 mt-1 font-semibold">
                Simulate the entire agricultural loop step-by-step.
              </p>
            </div>

            {/* Steps Nav List */}
            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {DEMO_STEPS.map((step, idx) => {
                const isActive = activeStepIdx === idx;
                return (
                  <div
                    key={step.num}
                    onClick={() => {
                      setActiveStepIdx(idx);
                      runStepSimulation(idx);
                    }}
                    className={`p-4 rounded-3xl border text-left cursor-pointer transition-all ${
                      isActive
                        ? "bg-white border-forest-medium/30 shadow-lg shadow-forest-medium/5"
                        : "bg-white/40 border-forest-medium/5 hover:border-forest-light/20"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-xs font-black text-forest-dark">
                        Step {step.num}: {step.title}
                      </span>
                      <span className="text-[8px] font-extrabold text-forest-medium/50 uppercase bg-forest-light/5 px-2 py-0.5 rounded">
                        {step.view}
                      </span>
                    </div>
                    
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3.5 space-y-3 pt-2.5 border-t border-forest-medium/5"
                      >
                        <p className="text-[11px] text-forest-medium/70 leading-relaxed font-semibold">
                          {step.description}
                        </p>
                        
                        <div className="space-y-1">
                          <span className="text-[9px] text-forest-medium/40 uppercase block font-bold">Farmer Action</span>
                          <p className="text-[10px] font-bold text-forest-medium">{step.farmerAction}</p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] text-forest-medium/40 uppercase block font-bold">System Response</span>
                          <p className="text-[10px] font-bold text-forest-medium">{step.systemAction}</p>
                        </div>

                        <div className="flex flex-wrap gap-1 pt-1.5">
                          {step.gcpTech.map((tech) => (
                            <span key={tech} className="text-[8px] font-bold px-2 py-0.5 rounded bg-forest-light/10 text-forest-medium">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Simulation Status */}
          <div className="p-4 rounded-[20px] bg-white border border-forest-medium/10 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isProcessing ? "bg-ai-purple animate-ping" : "bg-natural-green"}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-forest-medium/70 truncate max-w-[200px]">
                {simulatedStatus}
              </span>
            </div>
            <button
              onClick={() => runStepSimulation(activeStepIdx)}
              disabled={isProcessing}
              className="text-[10px] font-bold bg-forest-medium hover:bg-forest-dark text-white px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
            >
              Re-run
            </button>
          </div>
        </div>

        {/* Right Side: Simulated Device Preview (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col justify-center items-center">
          <div className="w-full max-w-sm h-[580px] rounded-[44px] border-[10px] border-forest-dark bg-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {/* Top notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-forest-dark rounded-b-xl z-30 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
            </div>

            {/* Screen Content */}
            <div className="flex-1 pt-8 overflow-y-auto px-4 bg-[#F0F2F0] relative">
              {activeStep.view === "whatsapp" && (
                <div className="h-full flex flex-col justify-between pb-4">
                  {/* Header */}
                  <div className="p-2.5 rounded-2xl bg-forest-medium text-white text-xs font-bold mb-4 flex justify-between items-center shadow-sm">
                    <span className="flex items-center gap-1">🎙️ Kisan Alert Agronomist</span>
                    <span className="text-[8px] opacity-75">WhatsApp API</span>
                  </div>

                  {/* Messages */}
                  <div className="flex-grow space-y-3 overflow-y-auto text-xs pr-1">
                    {whatsappMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex flex-col max-w-[85%] ${
                          msg.sender === "farmer" ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <div
                          className={`p-3 rounded-2xl text-left font-semibold ${
                            msg.sender === "farmer"
                              ? "bg-forest-medium text-white rounded-tr-none"
                              : msg.sender === "system"
                              ? "bg-forest-light/10 text-forest-medium italic text-center w-full max-w-none text-[10px]"
                              : "bg-white text-forest-dark border border-forest-medium/5 rounded-tl-none"
                          }`}
                        >
                          {msg.text}
                          {msg.translation && (
                            <span className="block text-[9px] opacity-75 border-t border-current/10 pt-1 mt-1 font-mono italic">
                              Translation: {msg.translation}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input bar */}
                  <div className="flex gap-1.5 pt-2 border-t border-slate-300/30">
                    <input
                      type="text"
                      disabled
                      placeholder="Simulated text..."
                      className="flex-1 bg-white border border-slate-200 rounded-full px-3 py-2 text-[10px] outline-none"
                    />
                    <button disabled className="p-2.5 rounded-full bg-forest-medium text-white">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeStep.view === "farmer_portal" && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="p-3.5 bg-white rounded-2xl border border-forest-medium/5 shadow-sm text-left">
                    <span className="text-[8px] font-bold text-forest-medium/50 uppercase block">Farmer Hub</span>
                    <span className="text-xs font-black block text-forest-dark">Ramu Patel (Karimnagar)</span>
                  </div>

                  {/* Proactive Dry spell Warning */}
                  {activeStepIdx >= 1 && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-3.5 rounded-2xl bg-amber-warning/10 border border-amber-warning/25 text-amber-900 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4.5 h-4.5 text-amber-700 animate-bounce" />
                        <div>
                          <span className="text-[10px] font-bold block">IMD Dry Spell Warning</span>
                          <span className="text-[9px] block text-amber-850/80 font-medium mt-0.5">Irrigate field in 2 days. 0mm rain predicted next 6 days.</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Disease scan results */}
                  {activeStepIdx >= 2 && leafScanned && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-3.5 rounded-2xl bg-white border border-forest-medium/5 shadow-sm space-y-2.5 text-left"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-forest-dark">Leaf Spot Blight Diagnosis</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-danger-red/10 text-danger-red">
                          {scanConfidence}% Match
                        </span>
                      </div>
                      <p className="text-[10px] text-forest-medium/70 leading-relaxed font-semibold">
                        AI Vision detected Cercospora leaf spot but with low confidence. Expert escalation recommended.
                      </p>
                      
                      <div className="flex gap-1.5 mt-2">
                        <button
                          disabled={activeStepIdx >= 3}
                          className="flex-1 py-2 rounded-full bg-danger-red hover:bg-danger-dark text-white text-[9px] font-bold transition-all"
                        >
                          {activeStepIdx >= 3 ? "Escalated to RSK ✅" : "Escalate to RSK"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {activeStep.view === "rsk_portal" && (
                <div className="h-full bg-slate-900 text-white p-3.5 rounded-2xl flex flex-col justify-between overflow-hidden">
                  <div className="text-left">
                    {/* Console heading */}
                    <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">RSK Command Console</span>
                      <span className="text-[8px] bg-danger-red px-1.5 py-0.5 rounded text-white animate-pulse">
                        LIVE QUEUE
                      </span>
                    </div>

                    {/* RSK notifications */}
                    {rskNotification && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-danger-red/10 border border-danger-red/20 text-danger-400 mb-4"
                      >
                        <span className="text-[10px] font-bold block flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> High Severity Escalation
                        </span>
                        <span className="text-[9px] block text-danger-300/80 mt-0.5 font-semibold">
                          Ramu Patel (Peddapalli) uploaded leaf. AI confidence: 58%
                        </span>
                      </motion.div>
                    )}

                    {/* Case list overview */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-300">
                        <span>Farmer: Ramu Patel</span>
                        <span className="text-[9px] text-slate-500">Mandal: Peddapalli</span>
                      </div>
                      <span className="text-[9px] block text-slate-400 font-semibold">Crop: Groundnut</span>
                      <span className="text-[9px] block text-slate-400 font-semibold">Issue: Low-confidence Leaf Spot</span>
                    </div>
                  </div>

                  {/* Reply controls */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <input
                      type="text"
                      disabled
                      placeholder="Officer prescription note..."
                      value={activeStepIdx >= 4 ? "Apply fungicide, clear infected rows." : ""}
                      className="w-full bg-white/5 border border-white/10 rounded-full px-3 py-2 text-[9px] text-slate-300 outline-none font-semibold"
                    />
                    <button
                      disabled
                      className="w-full py-2.5 rounded-full bg-natural-green text-white text-[9px] font-bold"
                    >
                      {activeStepIdx >= 4 ? "Prescription Broadcasted ✅" : "Approve & Resolve"}
                    </button>
                  </div>
                </div>
              )}

              {activeStep.view === "sms" && (
                <div className="h-full flex flex-col justify-between pb-4">
                  {/* SMS header */}
                  <div className="p-2.5 rounded-2xl bg-slate-800 text-white text-xs font-bold mb-4 flex justify-between items-center shadow-sm">
                    <span>💬 SMS FALLBACK (800-KISAN)</span>
                    <span className="text-[8px] opacity-75">Feature Phone</span>
                  </div>

                  {/* Messages */}
                  <div className="flex-grow space-y-3 overflow-y-auto text-xs pr-1">
                    {smsMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex flex-col max-w-[85%] ${
                          msg.sender === "farmer" ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <div
                          className={`p-3 rounded-xl font-mono text-left ${
                            msg.sender === "farmer"
                              ? "bg-slate-700 text-white rounded-tr-none"
                              : msg.sender === "system"
                              ? "bg-slate-300/10 text-slate-500 italic text-center w-full max-w-none text-[9px]"
                              : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="flex gap-1.5 pt-2 border-t border-slate-300/30">
                    <input
                      type="text"
                      disabled
                      placeholder="SMS command..."
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-mono outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Device Indicator */}
            <div className="h-10 bg-slate-100 flex items-center justify-center">
              <span className="w-32 h-1 bg-slate-400 rounded-full" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
