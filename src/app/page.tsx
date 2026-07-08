"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Database,
  CloudSun,
  Smartphone,
  PhoneCall,
  Sparkles,
  Leaf,
  Users,
  Compass,
  AlertTriangle,
  Wind,
  Droplets,
  Layers,
  ChevronRight,
  Search,
  CheckCircle,
  TrendingUp,
  Cpu,
  Mic,
  BrainCircuit,
  LogOut,
  User,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import AIPipeline from "@/components/ai/AIPipeline";
import { auth, signOut } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";

// Mock weather telemetry for landing widget
const HERO_WEATHER_DATA = [
  { hour: "06:00", temp: 24 },
  { hour: "10:00", temp: 28 },
  { hour: "14:00", temp: 33 },
  { hour: "18:00", temp: 29 },
  { hour: "22:00", temp: 25 },
];

interface CapabilityNode {
  id: string;
  label: string;
  icon: React.ReactNode;
  x: number; // angle or coordinates for layout mapping
  y: number;
  tech: string;
  what: string;
  why: string;
  how: string;
}

export default function Home() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [activeSatLayer, setActiveSatLayer] = useState<"ndvi" | "moisture" | "outbreak">("ndvi");
  const [demoScanActive, setDemoScanActive] = useState(false);
  const [demoScanStep, setDemoScanStep] = useState<"idle" | "scanning" | "done">("idle");
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Monitor scroll height to shrink pill navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const triggerDemoScan = () => {
    setDemoScanActive(true);
    setDemoScanStep("scanning");
    setTimeout(() => {
      setDemoScanStep("done");
    }, 2500);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 80, damping: 18 },
    },
  };

  // Define 6 Connected Nodes orbiting around Code2Crop
  const CAPABILITIES: CapabilityNode[] = [
    {
      id: "crop_rec",
      label: "Smart Crop Recommendation",
      icon: <Compass className="w-5 h-5" />,
      x: 0, // 0 deg
      y: -130,
      tech: "Vertex AI Ranking Model",
      what: "Uses satellite NDVI, soil health databases, and historical rainfall to recommend the highest-yielding crops.",
      why: "Helps farmers select drought-resistant seeds before planting, preventing groundwater overuse and electricity deficit costs.",
      how: "Compares crop water需求 against localized groundwater tables, grading suitabilities automatically.",
    },
    {
      id: "weather_int",
      label: "Predictive Weather Intelligence",
      icon: <CloudSun className="w-5 h-5" />,
      x: 110, // ~60 deg
      y: -65,
      tech: "IMD Forecast Rule Engine",
      what: "Monitors daily weather metrics to predict impending dry spells or localized rain disruptions.",
      why: "Gives farmers a 2-day headstart to trigger emergency field irrigation, protecting leaf turgidity.",
      how: "Synthesizes raw rainfall indicators into custom regional advisory text pushed via SMS.",
    },
    {
      id: "sat_int",
      label: "Satellite Intelligence",
      icon: <Layers className="w-5 h-5" />,
      x: 110, // ~120 deg
      y: 65,
      tech: "Google Earth Engine API",
      what: "Retrieves vegetation health index (NDVI) and surface moisture layers directly mapped to plot lines.",
      why: "Identifies crop stress indicators remotely without requiring expensive on-field moisture sensors.",
      how: "Fuses multi-spectral satellite imagery to create relative moisture deficiency indices.",
    },
    {
      id: "disease_diag",
      label: "AI Disease Diagnosis",
      icon: <Leaf className="w-5 h-5" />,
      x: 0, // 180 deg
      y: 130,
      tech: "Gemini 1.5 Flash Vision",
      what: "Analyzes photographs of leaves and stems to diagnose crop diseases and pests instantly.",
      why: "Stops crop infections (like Cercospora Leaf Spot) from spreading across village border boundaries.",
      how: "Correlates leaf spot visual parameters with descriptive voice inputs for higher diagnostic precision.",
    },
    {
      id: "voice_ai",
      label: "Voice-first Experience",
      icon: <Mic className="w-5 h-5" />,
      x: -110, // ~240 deg
      y: 65,
      tech: "Speech-to-Text & Translation",
      what: "Allows farmers to consult the platform via natural spoken voice notes in their native dialects.",
      why: "Bridges the digital literacy divide, allowing non-literate farmers to get precise agricultural answers.",
      how: "Speech-to-text models transcribe regional Telugu or Kannada audio notes before resolving intent.",
    },
    {
      id: "expert_net",
      label: "Human Expert Escalation",
      icon: <Users className="w-5 h-5" />,
      x: -110, // ~300 deg
      y: -65,
      tech: "Realtime Case Routing",
      what: "Automatically routes low-confidence diagnoses to experts at the nearest Rythu Seva Kendra (RSK).",
      why: "Establishes a solid safety net, ensuring farmers never rely on hallucinated or incorrect AI guesses.",
      how: "Triggers case files with leaf photos and GPS coordinates if the AI classifier falls below 65%.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-warm-bg text-forest-dark selection:bg-forest-light/20 overflow-x-hidden scroll-smooth">
      {/* Living Background Depth Layers */}
      <div className="grain-overlay absolute inset-0 z-0 opacity-15" />
      <div className="light-beam top-[5%] left-[-10%]" />
      <div className="light-beam top-[50%] right-[-20%] opacity-40" />

      {/* Floating Animated Gradient Glow Blobs */}
      <div className="glow-blob w-[500px] h-[500px] bg-forest-light top-[-100px] left-[-150px] opacity-15" />
      <div className="glow-blob w-[600px] h-[600px] bg-ai-purple top-[35%] right-[-200px] opacity-10" />
      <div className="glow-blob w-[450px] h-[450px] bg-google-blue bottom-[10%] left-[-100px] opacity-10" />

      {/* Centered Floating Pill Navigation (OpenRelay inspired) */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 w-full px-4 flex justify-center ${
          isScrolled ? "max-w-5xl" : "max-w-7xl"
        }`}
      >
        <header
          className={`w-full glass-card flex items-center justify-between rounded-full border border-white/50 shadow-xl transition-all duration-500 ${
            isScrolled ? "py-2.5 px-6 bg-white/75 backdrop-blur-2xl" : "py-4 px-8 bg-white/60 backdrop-blur-xl"
          }`}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <span className="p-2 rounded-2xl bg-gradient-to-tr from-forest-medium to-forest-light text-white shadow-lg shadow-forest-medium/10 transition-transform group-hover:scale-105">
              <Leaf className="w-4 h-4" />
            </span>
            <div className="text-left">
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-forest-dark to-forest-medium bg-clip-text text-transparent block">
                Code2Crop
              </span>
              <span className="text-[8px] font-bold text-forest-medium/55 block tracking-widest uppercase">
                AI platform
              </span>
            </div>
          </Link>

          {/* Nav Items (Middle Pill Links) */}
          <nav className="hidden lg:flex items-center gap-1.5 p-1 rounded-full bg-forest-light/5 border border-forest-medium/5">
            {[
              { label: "Home", href: "#hero" },
              { label: "Problem", href: "#problem" },
              { label: "How It Works", href: "#how-it-works" },
              { label: "Features", href: "#features" },
              { label: "Technology", href: "#technology" },
              { label: "Impact", href: "#impact" },

            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-[11px] font-bold px-4 py-2 rounded-full text-forest-medium/75 hover:text-forest-dark hover:bg-white/80 transition-all active:scale-95"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Action CTAs (Right-aligned) */}
          <div className="flex items-center gap-3 shrink-0">
            {firebaseUser ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/farmer"
                  className="text-[11px] font-bold px-4 py-2 rounded-full text-white bg-forest-medium hover:bg-forest-dark transition-all"
                >
                  Dashboard
                </Link>
                {/* Immersive Google Account profile dropdown bubble */}
                <div className="relative group">
                  <img
                    src={firebaseUser.photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"}
                    alt="Farmer profile avatar"
                    className="w-8 h-8 rounded-full border-2 border-forest-medium/15 cursor-pointer shadow-sm active:scale-95 transition-transform"
                  />
                  <div className="absolute right-0 mt-2.5 w-52 rounded-2xl bg-white border border-forest-medium/10 shadow-xl py-3 z-50 hidden group-hover:block text-left animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-forest-medium/5">
                      <span className="text-[10px] font-bold text-forest-medium/40 uppercase block tracking-wider">Signed in as</span>
                      <span className="text-xs font-black text-forest-dark block truncate">{firebaseUser.displayName || "Farmer"}</span>
                      <span className="text-[10px] text-forest-medium/60 block truncate">{firebaseUser.email}</span>
                    </div>
                    <button
                      onClick={() => signOut(auth)}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-danger-red hover:bg-forest-light/5 transition-colors mt-2 flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href="/farmer?select=true"
                className="text-[11px] font-bold px-3.5 py-2 rounded-full text-forest-medium hover:bg-forest-light/5 transition-all"
              >
                Login/Signup
              </Link>
            )}
            <Link
              href="/rsk"
              className="text-[11px] font-bold px-4 py-2.5 rounded-full text-white bg-forest-medium hover:bg-forest-dark shadow-md hover:shadow-xl hover:shadow-forest-medium/10 transition-all magnetic-btn"
            >
              RSK Portal
            </Link>
          </div>
        </header>
      </div>

      {/* Hero Section */}
      <section id="hero" className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-28 grid lg:grid-cols-12 gap-16 items-center">
        
        {/* Left Side: Immersive Copy */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-6 space-y-8 text-left"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-forest-medium/15 shadow-sm text-[10px] font-extrabold text-forest-medium tracking-widest uppercase"
          >
            <Sparkles className="w-3.5 h-3.5 text-ai-purple animate-pulse" />
            Google Build with AI — Code for Communities
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-7xl font-black tracking-tight text-forest-dark leading-[1.05]"
          >
            <span className="shimmer-text">AI Intelligence</span> <br />
            For Every Farmer
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-sm sm:text-base text-forest-medium/75 max-w-lg leading-relaxed font-medium"
          >
            Helping every farmer make smarter decisions using <span className="text-google-blue font-bold">Satellite Intelligence</span>, weather forecasting, and expert guidance backed by <span className="text-ai-purple font-bold">Gemini AI</span>.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-wrap gap-4 pt-4"
          >
            {firebaseUser ? (
              <Link
                href="/farmer"
                className="group flex items-center gap-2 px-6.5 py-4 rounded-full text-xs font-bold text-white bg-gradient-to-r from-forest-medium to-forest-light shadow-lg shadow-forest-medium/10 hover:shadow-xl hover:shadow-forest-medium/20 transition-all magnetic-btn"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <Link
                href="/farmer?select=true"
                className="group flex items-center gap-2 px-6.5 py-4 rounded-full text-xs font-bold text-white bg-gradient-to-r from-forest-medium to-forest-light shadow-lg shadow-forest-medium/10 hover:shadow-xl hover:shadow-forest-medium/20 transition-all magnetic-btn"
              >
                Login/Signup
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
            <Link
              href="/rsk"
              className="flex items-center gap-2 px-6.5 py-4 rounded-full text-xs font-bold text-forest-dark bg-white border border-forest-medium/15 hover:bg-forest-light/5 shadow-sm transition-all"
            >
              RSK Operations Center
            </Link>

          </motion.div>
        </motion.div>

        {/* Right Side: Animated Earth HUD Console */}
        <div className="lg:col-span-6 flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="w-full max-w-md h-[460px] rounded-[36px] glass-card p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl border border-white/40 group"
          >
            {/* Visual overlays */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
              <svg width="100%" height="100%" className="animate-[spin_40s_linear_infinite]">
                <circle cx="50%" cy="50%" r="140" fill="none" stroke="rgba(28, 63, 36, 0.15)" strokeWidth="1.5" strokeDasharray="6 6" />
                <circle cx="50%" cy="50%" r="180" fill="none" stroke="rgba(26, 115, 232, 0.1)" strokeWidth="1" />
                <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="rgba(28, 63, 36, 0.05)" />
                <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="rgba(28, 63, 36, 0.05)" />
              </svg>
            </div>

            {/* Live Telemetry Cards */}
            <div className="flex justify-between items-start z-10 relative">
              <div className="p-3.5 rounded-2xl bg-white/80 border border-forest-medium/10 shadow-sm backdrop-blur-md text-left">
                <span className="text-[9px] text-forest-medium/50 uppercase block font-bold">NDVI Veg Health</span>
                <span className="text-sm font-black text-forest-dark block mt-0.5">0.74 Healthy</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/80 border border-forest-medium/10 shadow-sm backdrop-blur-md text-right">
                <span className="text-[9px] text-forest-medium/50 uppercase block font-bold">Soil Moisture</span>
                <span className="text-sm font-black text-forest-medium block mt-0.5">24% Deficit</span>
              </div>
            </div>

            {/* Globe */}
            <div className="relative w-48 h-48 mx-auto flex items-center justify-center z-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
                className="w-40 h-40 rounded-full border border-forest-medium/10 relative flex items-center justify-center"
              >
                <div className="absolute inset-2 rounded-full border border-dashed border-forest-medium/20" />
                <Globe className="w-20 h-20 text-forest-medium/30" />
                <span className="absolute top-[30%] left-[45%] w-3 h-3 rounded-full bg-google-blue animate-ping" />
                <span className="absolute top-[30%] left-[45%] w-1.5 h-1.5 rounded-full bg-google-blue" />
              </motion.div>
            </div>

            {/* Bottom HUD bar */}
            <div className="p-4 rounded-2xl bg-white/70 border border-forest-medium/10 shadow-sm backdrop-blur-md text-left z-10 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-ai-purple animate-bounce shrink-0" />
              <div>
                <span className="text-[9px] text-forest-medium/55 uppercase font-bold block">Grounded Recommendation</span>
                <span className="text-xs font-bold text-forest-dark block mt-0.5">
                  Groundnut: needs 60% less water than Paddy
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section: The Farmer's Challenge (Problem) */}
      <section id="problem" className="relative z-10 py-28 bg-white border-y border-forest-medium/5">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6 text-left">
            <span className="text-[10px] font-bold text-danger-red uppercase tracking-widest bg-danger-red/10 px-3 py-1 rounded-full">
              The Farmer's Challenge
            </span>
            <h2 className="text-4xl font-black text-forest-dark leading-tight">
              Habit and hearsay choices fail in shifting climates.
            </h2>
            <p className="text-sm text-forest-medium/75 leading-relaxed font-medium">
              Farmers traditionally decide what to plant based on ancestral habits or local advice. In drought-affected regions like Karimnagar or Peddapalli, this leads to heavy groundwater depletion, failed yields, and high electricity bills for pump sets.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-warm-bg border border-forest-medium/5 text-left">
                <span className="block text-3xl font-black text-danger-red">60%+</span>
                <span className="text-[10px] text-forest-medium/55 font-bold uppercase mt-1 block">Groundwater Depletion</span>
              </div>
              <div className="p-4 rounded-2xl bg-warm-bg border border-forest-medium/5 text-left">
                <span className="block text-3xl font-black text-danger-red">35%</span>
                <span className="text-[10px] text-forest-medium/55 font-bold uppercase mt-1 block">Crop Disease Loss</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-warm-bg border border-forest-medium/5 space-y-4">
            <div className="flex gap-3 items-start text-left p-3.5 rounded-2xl bg-white border border-forest-medium/5">
              <AlertTriangle className="w-5 h-5 text-danger-red shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-forest-dark">Static warnings are ignored</h4>
                <p className="text-[11px] text-forest-medium/60 mt-1 leading-relaxed font-semibold">
                  Basic government SMS broadcasts are plain text and generic, failing to provide actionable advice in local languages.
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start text-left p-3.5 rounded-2xl bg-white border border-forest-medium/5">
              <AlertTriangle className="w-5 h-5 text-danger-red shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-forest-dark">AIs guess on high stakes</h4>
                <p className="text-[11px] text-forest-medium/60 mt-1 leading-relaxed font-semibold">
                  Typical agricultural chatbots will confidently state a leaf disease even when they are unsure, creating massive risks for the farmer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: How Code2Crop Thinks (Dedicated AI Pipeline Section) */}
      <section id="how-it-works" className="relative z-10 py-28 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[10px] font-bold text-ai-purple uppercase tracking-widest bg-ai-purple/10 px-3 py-1 rounded-full">
            Pipeline Flow
          </span>
          <h2 className="text-3xl font-black text-forest-dark mt-4">How Code2Crop Thinks</h2>
          <p className="text-xs text-forest-medium/60 mt-2">
            Our function-calling agent synthesizes voice symptoms, translations, satellite maps, and weather indices before outputting advice.
          </p>
        </div>

        <AIPipeline isProcessing={true} />
      </section>

      {/* Redesigned Section: "Why Code2Crop" Orbiting Feature Showcase */}
      <section id="features" className="relative z-10 py-28 bg-white border-y border-forest-medium/5">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-bold text-forest-medium uppercase tracking-widest bg-forest-light/10 px-3 py-1 rounded-full">
              Complete Intelligence
            </span>
            <h2 className="text-3xl font-black text-forest-dark mt-4">Everything Farmers Need. One Platform.</h2>
            <p className="text-xs text-forest-medium/60 mt-2">
              Unifying soil, satellites, weather forecasting, and real human experts to build agricultural trust.
            </p>
          </div>

          {/* Interactive Connected Hexagon Orbit Diagram */}
          <div className="grid lg:grid-cols-12 gap-12 items-center min-h-[500px]">
            
            {/* Left/Middle Column: Visual Orbit Node Diagram */}
            <div className="lg:col-span-7 flex justify-center items-center h-[420px] relative">
              
              {/* Outer boundary limit line traces */}
              <div className="absolute w-[280px] h-[280px] rounded-full border border-forest-medium/5 border-dashed pointer-events-none" />
              
              {/* Central Glowing Code2Crop AI Engine Node */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="w-24 h-24 rounded-full bg-gradient-to-tr from-forest-medium to-forest-light text-white shadow-2xl z-10 flex flex-col justify-center items-center border-4 border-white relative cursor-pointer"
              >
                {/* Ping rings */}
                <span className="absolute inset-0 rounded-full bg-forest-light/35 animate-ping opacity-35" />
                <BrainCircuit className="w-8 h-8" />
                <span className="text-[8px] font-bold uppercase mt-1">C2C Engine</span>
              </motion.div>

              {/* Orbiting Capability Nodes */}
              {CAPABILITIES.map((node) => {
                const isHovered = hoveredNode === node.id;
                
                return (
                  <div
                    key={node.id}
                    className="absolute"
                    style={{
                      transform: `translate(${node.x}px, ${node.y}px)`,
                    }}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* SVG Connector Line */}
                    <svg className="absolute overflow-visible pointer-events-none" style={{ left: 24, top: 24 }}>
                      <line
                        x1={-node.x}
                        y1={-node.y}
                        x2={0}
                        y2={0}
                        stroke={isHovered ? "#1C3F24" : "rgba(28, 63, 36, 0.08)"}
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        strokeDasharray={isHovered ? "4 2" : "none"}
                        className={isHovered ? "neon-connect" : ""}
                        style={{ transition: "stroke 0.3s" }}
                      />
                    </svg>

                    <motion.div
                      whileHover={{ scale: 1.15 }}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer relative z-20 shadow-md border ${
                        isHovered
                          ? "bg-forest-medium text-white border-transparent shadow-forest-medium/10"
                          : "bg-white text-forest-medium border-forest-medium/10 hover:border-forest-light/30"
                      }`}
                    >
                      {node.icon}
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Dynamic Info Card & Technology Specs */}
            <div className="lg:col-span-5 text-left h-[380px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {hoveredNode ? (
                  (() => {
                    const node = CAPABILITIES.find((n) => n.id === hoveredNode)!;
                    return (
                      <motion.div
                        key={node.id}
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -15 }}
                        className="p-6 rounded-[28px] bg-warm-bg border border-forest-medium/10 shadow-lg space-y-4 text-left"
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-extrabold text-forest-dark flex items-center gap-1.5 uppercase tracking-wide">
                            {node.label}
                          </h3>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-forest-light/10 text-forest-medium uppercase tracking-wider">
                            {node.tech}
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-[9px] text-forest-medium/40 block font-bold uppercase">What it does</span>
                          <p className="text-xs text-forest-medium/80 mt-1 leading-relaxed font-semibold">{node.what}</p>
                        </div>
                        
                        <div>
                          <span className="text-[9px] text-forest-medium/40 block font-bold uppercase">Why it matters</span>
                          <p className="text-xs text-forest-medium/80 mt-1 leading-relaxed font-semibold">{node.why}</p>
                        </div>

                        <div>
                          <span className="text-[9px] text-forest-medium/40 block font-bold uppercase">How AI helps</span>
                          <p className="text-xs text-forest-medium/85 mt-1 leading-relaxed font-semibold">{node.how}</p>
                        </div>
                      </motion.div>
                    );
                  })()
                ) : (
                  <motion.div
                    key="default"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 rounded-[28px] bg-warm-bg border border-forest-medium/5 text-center space-y-4 py-12 flex flex-col items-center justify-center h-full"
                  >
                    <Sparkles className="w-8 h-8 text-ai-purple animate-pulse" />
                    <h3 className="text-sm font-black text-forest-dark uppercase">Interactive Feature Showcase</h3>
                    <p className="text-xs text-forest-medium/60 max-w-xs mx-auto leading-relaxed font-semibold">
                      Hover over any of the six orbiting nodes to explore Code2Crop's capabilities, technologies, and agricultural impacts.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Premium Callout Highlight Card at the end of Features */}
          <div className="mt-16 w-full max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-[36px] bg-gradient-to-tr from-forest-medium to-forest-light text-white text-center shadow-xl relative overflow-hidden group"
            >
              <div className="absolute right-[-40px] bottom-[-40px] w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              <div className="absolute left-[-40px] top-[-40px] w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              
              <div className="relative z-10 max-w-2xl mx-auto space-y-3">
                <span className="text-[9px] font-bold text-natural-green bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest w-fit mx-auto block">
                  Complete Integration
                </span>
                <p className="text-base sm:text-lg font-bold leading-relaxed">
                  Code2Crop unifies satellite intelligence, AI reasoning, multilingual communication, and expert support into one seamless farming platform.
                </p>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* Section: Satellite Intelligence (Interactive HUD Map) */}
      <section id="technology" className="relative z-10 py-28 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6 text-left">
            <span className="text-[10px] font-bold text-google-blue uppercase tracking-widest bg-google-blue/10 px-3 py-1 rounded-full">
              Satellite Grounding
            </span>
            <h2 className="text-3xl font-black text-forest-dark leading-tight">
              Satellite Intelligence
            </h2>
            <p className="text-sm text-forest-medium/75 leading-relaxed font-medium">
              We query Google Earth Engine layers to extract NDVI indicators and Soil Moisture variables directly mapped to the farmer's plot coordinates.
            </p>
            
            <div className="flex flex-col gap-2 pt-4">
              {[
                { id: "ndvi", label: "NDVI Vegetation Health Overlay" },
                { id: "moisture", label: "Soil Moisture Deficit Overlay" },
                { id: "outbreak", label: "Outbreak Hotspots & Clusters" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setActiveSatLayer(btn.id as any)}
                  className={`px-4 py-3 rounded-2xl text-xs font-bold text-left border transition-all flex justify-between items-center ${
                    activeSatLayer === btn.id
                      ? "bg-white border-google-blue text-google-blue shadow-md"
                      : "bg-white/40 border-forest-medium/5 hover:border-forest-light/20 text-forest-medium"
                  }`}
                >
                  {btn.label}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="w-full h-[400px] rounded-[32px] overflow-hidden glass-card border border-white/50 relative shadow-2xl">
              <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80')`,
                }}
              />
              <div className="absolute inset-0 bg-black/35 z-1" />

              {activeSatLayer === "ndvi" && (
                <div className="absolute inset-0 z-2 bg-gradient-to-tr from-natural-green/20 via-transparent to-natural-green/10">
                  <svg className="absolute inset-0 w-full h-full">
                    <polygon points="150,100 350,80 400,220 280,290" fill="rgba(52, 168, 83, 0.2)" stroke="#34A853" strokeWidth="2.5" strokeDasharray="6 3" />
                  </svg>
                  <div className="absolute bottom-4 left-4 p-3 rounded-2xl bg-black/60 border border-white/10 text-white text-xs text-left">
                    <span className="font-bold block">NDVI Veg Index: 0.74</span>
                    <span className="text-[10px] text-white/70 block mt-0.5 font-medium">Vegetation density matches seasonal target</span>
                  </div>
                </div>
              )}

              {activeSatLayer === "moisture" && (
                <div className="absolute inset-0 z-2 bg-gradient-to-tr from-danger-red/10 via-transparent to-danger-red/20">
                  <svg className="absolute inset-0 w-full h-full">
                    <polygon points="150,100 350,80 400,220 280,290" fill="rgba(234, 67, 53, 0.25)" stroke="#EA4335" strokeWidth="2.5" />
                  </svg>
                  <div className="absolute bottom-4 left-4 p-3 rounded-2xl bg-black/60 border border-white/10 text-white text-xs text-left">
                    <span className="font-bold block text-danger-red">Moisture: 18% below baseline</span>
                    <span className="text-[10px] text-white/70 block mt-0.5 font-medium">Groundwater table falling (dry alert active)</span>
                  </div>
                </div>
              )}

              {activeSatLayer === "outbreak" && (
                <div className="absolute inset-0 z-2">
                  <svg className="absolute inset-0 w-full h-full">
                    <circle cx="35%" cy="40%" r="55" fill="rgba(234, 67, 53, 0.2)" className="animate-pulse" />
                    <circle cx="35%" cy="40%" r="10" fill="#EA4335" />
                  </svg>
                  <div className="absolute bottom-4 left-4 p-3 rounded-2xl bg-black/60 border border-white/10 text-white text-xs text-left">
                    <span className="font-bold block text-danger-red">Leaf Spot Hotspot cluster</span>
                    <span className="text-[10px] text-white/70 block mt-0.5 font-medium">4 cases escalated in Karimnagar limits</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section: Weather Experience Panel */}
      <section className="relative z-10 py-28 bg-white border-t border-forest-medium/5">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="p-6 rounded-3xl bg-warm-bg border border-forest-medium/5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-forest-dark uppercase tracking-wider">Simulated IMD Weather Forecast</h4>
              <span className="text-[10px] font-bold text-amber-warning uppercase tracking-widest bg-amber-warning/10 px-2.5 py-0.5 rounded-full">
                Dry spell count active
              </span>
            </div>
            
            <div className="h-48 w-full -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={HERO_WEATHER_DATA}>
                  <XAxis dataKey="hour" stroke="#1C3F24" fontSize={10} tickLine={false} axisLine={false} opacity={0.6} />
                  <YAxis stroke="#1C3F24" fontSize={10} tickLine={false} axisLine={false} opacity={0.6} />
                  <Tooltip />
                  <Line type="monotone" dataKey="temp" stroke="#1A73E8" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6 text-left">
            <span className="text-[10px] font-bold text-forest-medium uppercase tracking-widest bg-forest-light/10 px-3 py-1 rounded-full">
              Climate Telemetry
            </span>
            <h2 className="text-3xl font-black text-forest-dark leading-tight">
              Weather & Dry-Spell Warnings
            </h2>
            <p className="text-sm text-forest-medium/75 leading-relaxed font-medium">
              We monitor forecasts and soil moisture variables on a schedule. If rain indicators fall below threshold deficits over consecutive days, Gemini synthesizes a localized Telugu advisory pushed instantly.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-forest-medium" />
                <div>
                  <span className="text-[9px] text-forest-medium/40 block uppercase">Wind direction</span>
                  <span className="text-xs font-bold block text-forest-dark">12 km/h North-East</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-google-blue" />
                <div>
                  <span className="text-[9px] text-forest-medium/40 block uppercase">Irrigation recommendation</span>
                  <span className="text-xs font-bold block text-forest-dark">Irrigate within 2 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Disease Scanner Simulator */}
      <section className="relative z-10 py-28 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6 text-left">
            <span className="text-[10px] font-bold text-ai-purple uppercase tracking-widest bg-ai-purple/10 px-3 py-1 rounded-full">
              Computer Vision
            </span>
            <h2 className="text-3xl font-black text-forest-dark leading-tight">
              Disease Check & Diagnostics
            </h2>
            <p className="text-sm text-forest-medium/75 leading-relaxed font-medium">
              Our multimodal classifier accepts crop leaf pictures, fuses transcribed voice descriptions, and analyzes severe pest outbreaks.
            </p>
            <button
              onClick={triggerDemoScan}
              disabled={demoScanActive && demoScanStep === "scanning"}
              className="px-6 py-3.5 rounded-full bg-forest-medium hover:bg-forest-dark text-white text-xs font-bold shadow-md transition-all magnetic-btn"
            >
              {demoScanStep === "scanning" ? "Scanning leaf..." : "Test scanner simulation"}
            </button>
          </div>

          <div className="lg:col-span-7">
            <div className="w-full h-[320px] rounded-[32px] overflow-hidden bg-white border border-forest-medium/10 shadow-2xl relative flex flex-col items-center justify-center p-6">
              {demoScanStep === "idle" && (
                <div className="text-center space-y-3">
                  <Database className="w-12 h-12 text-forest-medium/35 mx-auto" />
                  <p className="text-xs font-bold text-forest-medium">Scanner Ready</p>
                  <p className="text-[10px] text-forest-medium/45 max-w-xs mx-auto font-medium">
                    Click the simulation button on the left to trigger the Gemini vision scanning demonstration.
                  </p>
                </div>
              )}

              {demoScanStep === "scanning" && (
                <div className="space-y-4 text-center">
                  <div
                    className="w-24 h-24 rounded-2xl bg-cover bg-center border border-forest-medium/15 mx-auto relative overflow-hidden"
                    style={{ backgroundImage: `url('https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=150&q=80')` }}
                  >
                    <motion.div
                      className="absolute left-0 w-full h-[2.5px] bg-natural-green shadow-[0_0_8px_#34A853]"
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-google-blue uppercase tracking-widest animate-pulse block">
                    Gemini Vision matching leaf lesions...
                  </span>
                </div>
              )}

              {demoScanStep === "done" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full text-left space-y-3"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-forest-medium/5">
                    <span className="text-xs font-black text-forest-dark">Cercospora Leaf Spot Identified</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-danger-red/10 text-danger-red">
                      58% Match (Low confidence)
                    </span>
                  </div>
                  <p className="text-[11px] text-forest-medium/70 leading-relaxed font-semibold">
                    AI confidence fell below the 65% safety threshold. This case requires immediate RSK officer escalation.
                  </p>
                  <div className="p-3 rounded-xl bg-danger-red/5 border border-danger-red/10 text-[10px] text-danger-800 font-bold uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Auto-escalating case file to nearest RSK officer...
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section: Portals Access (Impact) */}
      <section id="impact" className="relative z-10 py-28 bg-[#090b0e] text-white border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          <div className="max-w-2xl mx-auto space-y-4">
            <span className="text-[10px] font-bold text-ai-purple uppercase tracking-widest bg-ai-purple/10 px-3 py-1 rounded-full">
              Portal Access
            </span>
            <h2 className="text-3xl font-black">Code2Crop Experience Portals</h2>
            <p className="text-xs text-slate-400 font-semibold">
              Select a portal to explore the system from a farmer's or an expert officer's viewpoint.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="p-8 rounded-[32px] bg-slate-900/60 border border-white/5 flex flex-col justify-between items-start text-left min-h-[280px]">
              <div>
                <span className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white inline-block">
                  <Smartphone className="w-6 h-6" />
                </span>
                <h3 className="text-lg font-bold mt-6">Farmer Portal</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Warm, organic layout built for simplicity. Features weather timelines, voice chat, and leaf scans.
                </p>
              </div>
              <Link
                href="/farmer"
                className="mt-6 group flex items-center gap-1.5 text-xs font-bold text-white hover:text-slate-300 transition-colors"
              >
                Launch Farmer Portal <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="p-8 rounded-[32px] bg-slate-900/60 border border-white/5 flex flex-col justify-between items-start text-left min-h-[280px]">
              <div>
                <span className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white inline-block">
                  <Users className="w-6 h-6" />
                </span>
                <h3 className="text-lg font-bold mt-6">RSK Operations Center</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Dark theme dashboard incorporating district maps, disease hotspots, and live case drawers.
                </p>
              </div>
              <Link
                href="/rsk"
                className="mt-6 group flex items-center gap-1.5 text-xs font-bold text-white hover:text-slate-300 transition-colors"
              >
                Launch Operations Dashboard <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Live Demo */}
      <section id="demo" className="relative z-10 py-24 text-center bg-[#07090c] border-t border-white/5 text-slate-400">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          <span className="text-[10px] font-bold text-natural-green uppercase tracking-widest bg-natural-green/10 px-3 py-1 rounded-full">
            Evaluation Controller
          </span>
          <h2 className="text-3xl font-black text-white">Ready for the Live Demo?</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-semibold">
            Evaluate Code2Crop's end-to-end functionality via the interactive step-by-step controller.
          </p>
          
          <div className="pt-6">
            <Link
              href="/demo"
              className="px-6.5 py-4 rounded-full text-xs font-bold text-white bg-google-blue hover:bg-blue-600 shadow-md hover:shadow-xl hover:shadow-google-blue/15 transition-all inline-flex items-center gap-1.5 magnetic-btn"
            >
              Launch Live Demo Console <ArrowRight className="w-4.5 h-4.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 bg-[#050608] text-slate-500 text-center border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-[10px] font-semibold flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>© 2026 Code2Crop. Google Build with AI Hackathon Entry.</span>
          <div className="flex gap-4">
            <Link href="/demo" className="hover:text-white transition-colors">Interactive Demo Controller</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
