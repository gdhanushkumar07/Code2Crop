"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Sparkles, Languages, Cpu, Database, Award, CheckCircle } from "lucide-react";

interface Step {
  id: number;
  label: string;
  subLabel: string;
  icon: React.ReactNode;
  color: string;
  tech: string;
  glow: string;
}

interface AIPipelineProps {
  currentStep?: number;
  isProcessing?: boolean;
}

const PIPELINE_STEPS: Step[] = [
  {
    id: 0,
    label: "Multilingual Voice",
    subLabel: "Farmer's local language voice note",
    icon: <Mic className="w-5 h-5" />,
    color: "from-forest-medium to-forest-light",
    glow: "rgba(28, 63, 36, 0.3)",
    tech: "WhatsApp API Gateway",
  },
  {
    id: 1,
    label: "Speech-to-Text",
    subLabel: "Transcribing Indic speech phonemes",
    icon: <Sparkles className="w-5 h-5" />,
    color: "from-google-blue to-cyan-500",
    glow: "rgba(26, 115, 232, 0.3)",
    tech: "Cloud Speech-to-Text",
  },
  {
    id: 2,
    label: "Translation",
    subLabel: "Converting to English working text",
    icon: <Languages className="w-5 h-5" />,
    color: "from-ai-purple to-pink-500",
    glow: "rgba(138, 63, 252, 0.3)",
    tech: "Google Translation API",
  },
  {
    id: 3,
    label: "Gemini Orchestrator",
    subLabel: "Function calling & intent routing",
    icon: <Cpu className="w-5 h-5" />,
    color: "from-indigo-600 to-indigo-400",
    glow: "rgba(99, 102, 241, 0.3)",
    tech: "Gemini 1.5 Pro NLU",
  },
  {
    id: 4,
    label: "Grounding Layers",
    subLabel: "NDVI, Soil health, market prices",
    icon: <Database className="w-5 h-5" />,
    color: "from-emerald-600 to-forest-medium",
    glow: "rgba(52, 168, 83, 0.3)",
    tech: "Earth Engine / Agmarknet",
  },
  {
    id: 5,
    label: "Advisory Synthesis",
    subLabel: "Water needs & yield computations",
    icon: <Award className="w-5 h-5" />,
    color: "from-amber-warning to-amber-600",
    glow: "rgba(251, 188, 5, 0.3)",
    tech: "Vertex AI Ranking Engine",
  },
];

export default function AIPipeline({ currentStep = -1, isProcessing = false }: AIPipelineProps) {
  const [activeStep, setActiveStep] = useState(currentStep);

  useEffect(() => {
    if (isProcessing && currentStep === -1) {
      let step = 0;
      setActiveStep(0);
      const interval = setInterval(() => {
        step += 1;
        if (step >= PIPELINE_STEPS.length) {
          clearInterval(interval);
        } else {
          setActiveStep(step);
        }
      }, 1500);
      return () => clearInterval(interval);
    } else {
      setActiveStep(currentStep);
    }
  }, [currentStep, isProcessing]);

  return (
    <div className="w-full py-8 px-6 rounded-3xl glass-card relative overflow-hidden shadow-2xl border border-white/40">
      {/* Moving background beams */}
      <div className="absolute inset-0 bg-gradient-to-r from-forest-light/5 via-ai-purple/5 to-google-blue/5 opacity-30 pointer-events-none" />
      <div className="absolute top-[-50px] right-[-50px] w-64 h-64 rounded-full bg-ai-purple/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 rounded-full bg-forest-light/10 blur-3xl pointer-events-none" />
      
      <div className="flex justify-between items-center mb-10 relative z-10">
        <div>
          <span className="text-[10px] font-bold text-ai-purple uppercase tracking-widest bg-ai-purple/10 px-2.5 py-1 rounded-full">
            Under the Hood
          </span>
          <h3 className="text-lg font-black text-forest-dark flex items-center gap-1.5 mt-2">
            AI Thinking Pipeline
          </h3>
          <p className="text-xs text-forest-medium/60 mt-1">Real-time model reasoning & grounding loop</p>
        </div>
        
        {activeStep >= 0 && activeStep < PIPELINE_STEPS.length && (
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[10px] font-semibold px-3 py-1 rounded-full bg-white border border-forest-medium/10 text-forest-medium shadow-sm uppercase tracking-widest flex items-center gap-1.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-medium opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-forest-medium"></span>
            </span>
            {PIPELINE_STEPS[activeStep].tech}
          </motion.span>
        )}
      </div>

      {/* SVG Neon Connector Layer - Hidden on mobile, shown on desktop */}
      <div className="absolute top-[108px] left-[55px] right-[55px] h-[4px] z-0 hidden md:block">
        <svg width="100%" height="100%" className="overflow-visible">
          <line
            x1="0%"
            y1="50%"
            x2="100%"
            y2="50%"
            stroke="rgba(28, 63, 36, 0.08)"
            strokeWidth="3.5"
          />
          {activeStep >= 0 && (
            <motion.line
              x1="0%"
              y1="50%"
              x2={`${(activeStep / (PIPELINE_STEPS.length - 1)) * 100}%`}
              y2="50%"
              stroke="url(#pipelineGradient)"
              strokeWidth="4"
              className="neon-connect"
              style={{ strokeDasharray: "8 4" }}
            />
          )}
          <defs>
            <linearGradient id="pipelineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1C3F24" />
              <stop offset="35%" stopColor="#1A73E8" />
              <stop offset="70%" stopColor="#8A3FFC" />
              <stop offset="100%" stopColor="#34A853" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Pipeline Stepper nodes */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4">
        {PIPELINE_STEPS.map((step, idx) => {
          const isCompleted = activeStep > idx;
          const isActive = activeStep === idx;
          
          return (
            <div key={step.id} className="flex md:flex-col items-center gap-4 md:gap-3 flex-1 w-full relative">
              {/* Node Circle */}
              <motion.div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center relative shadow-lg transition-all duration-500 border ${
                  isActive
                    ? `bg-gradient-to-tr ${step.color} text-white border-transparent scale-110 shadow-[0_8px_24px_rgba(0,0,0,0.15)]`
                    : isCompleted
                    ? "bg-white text-forest-medium border-forest-medium/20 shadow-sm"
                    : "bg-white/60 text-forest-medium/30 border-forest-medium/5"
                }`}
                style={{
                  boxShadow: isActive ? `0 8px 30px ${step.glow}` : undefined,
                }}
                animate={isActive ? { scale: [1, 1.06, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                {/* Done badge */}
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-natural-green text-white flex items-center justify-center border-2 border-white shadow-sm"
                  >
                    <CheckCircle className="w-3 h-3 stroke-[3]" />
                  </motion.div>
                )}
                
                {/* Active radiating wave circles */}
                {isActive && (
                  <span className="absolute inset-0 rounded-2xl bg-current opacity-20 animate-ping" />
                )}
                
                {step.icon}
              </motion.div>

              {/* Text labels */}
              <div className="text-left md:text-center flex-1 md:flex-initial space-y-1">
                <p
                  className={`text-xs font-black tracking-tight transition-colors duration-300 ${
                    isActive
                      ? "text-forest-dark font-extrabold"
                      : isCompleted
                      ? "text-forest-medium font-bold"
                      : "text-forest-medium/40"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-forest-medium/50 line-clamp-1 max-w-[140px] md:mx-auto font-medium">
                  {step.subLabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
