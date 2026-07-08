"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Check,
  ImagePlus,
  X,
  LogOut,
  LogIn,
  MessageCircle,
  Monitor,
  Leaf,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";
import VoiceRecorder from "@/components/voice/VoiceRecorder";
import AIPipeline from "@/components/ai/AIPipeline";
import PlatformSelectionModal from "@/components/chat/PlatformSelectionModal";
import VoiceMessagePlayer from "@/components/chat/VoiceMessagePlayer";
import { auth, googleProvider, signInWithPopup, signOut } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import dynamic from "next/dynamic";
const MapComponent = dynamic(() => import("@/components/dashboard/MapComponent"), { ssr: false });


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
    details: "Rice requires continuous flooding. Due to the impending dry spell and low groundwater table in your local area, irrigation costs will exceed market return thresholds.",
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
  imageUrl?: string;
  diseaseResult?: {
    diseaseName: string;
    confidence: number;
    severity: "low" | "medium" | "high";
    treatment: string[];
  };
  platform?: "web" | "whatsapp";
}

// Generate or retrieve anonymous user ID
function getUserId(): string {
  if (typeof window === "undefined") return "anon";
  let userId = localStorage.getItem("c2c_user_id");
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("c2c_user_id", userId);
  }
  return userId;
}

interface ChatInputAreaProps {
  onSendText: (text: string) => void;
  onOpenVoice: () => void;
  onSelectImageClick: () => void;
}

const ChatInputArea = React.memo(({ onSendText, onOpenVoice, onSelectImageClick }: ChatInputAreaProps) => {
  const [localVal, setLocalVal] = useState("");

  const handleSend = () => {
    onSendText(localVal);
    setLocalVal("");
  };

  return (
    <div className="pt-4 border-t border-forest-medium/5 flex items-center gap-2 mt-4">
      <button
        onClick={onOpenVoice}
        className="p-3.5 rounded-full bg-forest-light/5 hover:bg-forest-light/10 text-forest-medium border border-forest-medium/10 transition-all shadow-sm"
        title="Speak Telugu"
      >
        <Mic className="w-4 h-4" />
      </button>

      <button
        onClick={onSelectImageClick}
        className="p-3.5 rounded-full bg-forest-light/5 hover:bg-forest-light/10 text-forest-medium border border-forest-medium/10 transition-all shadow-sm"
        title="Upload leaf image for disease scan"
      >
        <ImagePlus className="w-4 h-4" />
      </button>

      <input
        type="text"
        placeholder="Type query or upload a leaf photo..."
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        className="flex-1 text-xs font-semibold px-4 py-3 rounded-full bg-forest-light/5 border border-forest-medium/5 outline-none placeholder:text-forest-medium/40"
      />
      <button
        onClick={handleSend}
        className="p-3.5 rounded-full bg-forest-medium hover:bg-forest-dark text-white transition-all shadow-md magnetic-btn"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
});
ChatInputArea.displayName = "ChatInputArea";

const LANGUAGES = [
  { code: "te", name: "Telugu (తెలుగు)" },
  { code: "hi", name: "Hindi (हिन्दी)" },
  { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
  { code: "ta", name: "Tamil (தமிழ்)" },
  { code: "mr", name: "Marathi (मराठी)" },
  { code: "en", name: "English (English)" },
];

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    homeHub: "Home Hub",
    cropSuitability: "Crop Suitability",
    aiAgronomist: "AI Agronomist",
    syncWhatsApp: "Sync WhatsApp",
    exitHome: "Exit to Home",
    locationRequired: "Location Access Required",
    locationDesc: "We need your coordinates to show live weather, climate trends, and crop suggestions for your farm.",
    allowLocation: "Allow Location Access",
    drySpellWarning: "DRY SPELL WARNING",
    drySpellDesc: "predictions: less than 5mm rainfall expected for next 6 days. Soil moisture indices are dropping.",
    consultAi: "Consult AI",
    dismiss: "Dismiss",
    weatherTelemetry: "Weather Telemetry",
    soilSatellite: "Soil & Satellite Analytics",
    temp: "Temperature",
    humidity: "Humidity",
    windSpeed: "Wind Speed",
    rainProb: "Rain Probability",
    soilMoisture: "Soil Moisture",
    ndvi: "Vegetation (NDVI)",
    groundwater: "Groundwater",
    aqi: "Air Quality (AQI)",
    uvIndex: "UV Index",
    precipitation: "Precipitation",
    pressure: "Surface Pressure",
    weeklyAverage: "Weekly Average",
    monthlyAverage: "Monthly Average",
    climateTrends: "Climate & Moisture Trends",
    fiveYearTrend: "5-Year Climate Trend",
    oneYearTrend: "1-Year Moisture Trend",
    expectedYield: "Expected Yield",
    marketReturns: "Expected Returns",
    waterSavings: "Water Savings",
    suitability: "Suitability",
    readGrounding: "Read Grounding Details",
    closeGrounding: "Close Grounding Details",
    soilHealthReq: "Soil Health Requirement",
    marketPriceTrend: "Market Price Trend",
    agronomicActions: "Agronomic Actions",
    signRequired: "Sign In Required",
    signDesc: "To access your personalized farmer dashboard, soil moisture graphs, satellite index readings, and live chat with the agronomist, please authenticate using Google.",
    signInGoogle: "Sign In with Google",
    switchWhatsApp: "Or switch to WhatsApp Bot consultation",
    setupTitle: "Set Up Your Profile",
    setupDesc: "Please enter your name and select your preferred language to customize your dashboard and chat experience.",
    usernameLabel: "Your Name",
    langLabel: "Preferred Language",
    saveAndContinue: "Save and Continue",
    whatsAppConnected: "WhatsApp Synced",
    syncedDescription: "Your website dashboard telemetry and crop recommendations are synced with WhatsApp bot.",
    inputPhonePlaceholder: "Enter 10-digit WhatsApp phone...",
    linkAndSync: "Link & Sync",
    hi: "Hi"
  },
  te: {
    homeHub: "హోమ్ హబ్",
    cropSuitability: "పంట అనుకూలత",
    aiAgronomist: "AI అగ్రోనమిస్ట్",
    syncWhatsApp: "వాట్సాప్ సమకాలీకరించు",
    exitHome: "హోమ్‌కు తిరిగి వెళ్ళు",
    locationRequired: "స్థాన ప్రాప్యत అవసరం",
    locationDesc: "మీ పొలానికి సంబంధించిన ప్రత్యక్ష వాతావరణం, వాతావరణ పోకడలు మరియు పంట సూచనలను చూపించడానికి మాకు మీ కోఆర్డినేట్లు అవసరం.",
    allowLocation: "స్థాన ప్రాప్యతను అనుమతించు",
    drySpellWarning: "పొడి వాతావరణ హెచ్చరిక",
    drySpellDesc: "అంచనాలు: రాబోయే 6 రోజులలో 5 మిమీ కంటే తక్కువ వర్షపాతం నమోదవుతుంది. నేల తేమ తగ్గుతోంది.",
    consultAi: "AI ని సంప్రదించండి",
    dismiss: "తీసివేయి",
    weatherTelemetry: "వాతావరణ టెలిమెట్రీ",
    soilSatellite: "నేల & ఉపగ్రహ విಶ್లేషణ",
    temp: "ఉష్ణోగ్రత",
    humidity: "తేమ",
    windSpeed: "గాలి వేగం",
    rainProb: "వర్షం సంభావ్యత",
    soilMoisture: "నేల తేమ",
    ndvi: "వనస్పతి సూచిక (NDVI)",
    groundwater: "భూగर्भ జలాలు",
    aqi: "గాలి నాణ్యత (AQI)",
    uvIndex: "UV సూచిక",
    precipitation: "అవపాతం",
    pressure: "ఉపరితల పీడనం",
    weeklyAverage: "వారపు సగటు",
    monthlyAverage: "నెలవారీ సగటు",
    climateTrends: "వాతావరణం & తేమ పోకడలు",
    fiveYearTrend: "5 సంవత్సరాల వాతావరణ ధోరణి",
    oneYearTrend: "1 సంవత్సరం తేమ ధోరణి",
    expectedYield: "ఆశించిన దిగుబడి",
    marketReturns: "ఆశించిన లాభాలు",
    waterSavings: "నీటి పొదుపు",
    suitability: "అనుకూలత",
    readGrounding: "ఆధార వివరాలను చదవండి",
    closeGrounding: "ఆధార వివరాలను మూసివేయండి",
    soilHealthReq: "నేల ఆరోగ్య అవసరం",
    marketPriceTrend: "మార్కెట్ ధర ధోరణి",
    agronomicActions: "వ్యవసాయ చర్యలు",
    signRequired: "సైన్ ఇన్ అవసరం",
    signDesc: "మీ వ్యక్తిగతీకరించిన రైతు డాష్‌బోర్డ్, నేల తేమ గ్రాఫ్‌ಗಳು, ఉపగ్రహ సూಚಿಕ రీడింగ్‌లు మరియు అగ్రోనమిస్ట్‌తో ప్రత్యಕ್ಷ చాట్‌ను యాక్సెస్ చేయడానికి, దಯచేసి Googleని ఉపయోగించి లాగిన్ చేయండి.",
    signInGoogle: "Googleతో సైన్ ఇన్ చేయండి",
    switchWhatsApp: "లేదా వాట్సాప్ బాట్ సంప్రదింపులకు మారండి",
    setupTitle: "మీ ప్రొఫైల్‌ను సెటప్ చేయండి",
    setupDesc: "మీ డాష్‌调 మరియు చాట్ అనుభవాన్ని వ్యక్తిగతీకరించడానికి దయచేసి మీ పేరును నమోదు చేయండి మరియు మీ ప్రాధాన్యత భాషను ఎంచుకోండి.",
    usernameLabel: "మీ పేరు",
    langLabel: "ప్రాధాన్యత భాష",
    saveAndContinue: "సేవ్ చేసి కొనసాగించండి",
    whatsAppConnected: "వాట్సాప్ సమకాలీకరించబడింది",
    syncedDescription: "మీ వెబ్‌సైట్ డాష్‌బోర్డ్ టెలిమెట్రీ మరియు పంట సిఫార్సులు వాట్సాప్ బాట్‌తో సమకాలీకరించబడ్డాయి.",
    inputPhonePlaceholder: "10-అంకెల వాట్సాప్ ఫోన్ నమోదు చేయండి...",
    linkAndSync: "లింక్ & సింక్",
    hi: "నమస్కారం"
  },
  hi: {
    homeHub: "होम हब",
    cropSuitability: "फसल उपयुक्तता",
    aiAgronomist: "एआई कृषि विशेषज्ञ",
    syncWhatsApp: "व्हाट्सएप सिंक करें",
    exitHome: "होम पर जाएं",
    locationRequired: "स्थान पहुंच आवश्यक",
    locationDesc: "आपके खेत के लिए लाइव मौसम, जलवायु रुझान और फसल सुझाव दिखाने के लिए हमें आपके निर्देशांक की आवश्यकता है।",
    allowLocation: "स्थान पहुंच की अनुमति दें",
    drySpellWarning: "सूखा मौसम चेतावनी",
    drySpellDesc: "अनुमान: अगले 6 दिनों में 5 मिमी से कम वर्षा की उम्मीद है। मिट्टी की नमी गिर रही है।",
    consultAi: "एआई से सलाह लें",
    dismiss: "खारिज करें",
    weatherTelemetry: "मौसम टेलीमेट्री",
    soilSatellite: "मिट्टी और उपग्रह विश्लेषण",
    temp: "तापमान",
    humidity: "नमी",
    windSpeed: "हवा की गति",
    rainProb: "बारिश की संभावना",
    soilMoisture: "मिट्टी की नमी",
    ndvi: "वनस्पति सूचकांक (NDVI)",
    groundwater: "भूजल स्तर",
    aqi: "वायु गुणवत्ता (AQI)",
    uvIndex: "यूवी इंडेक्स",
    precipitation: "वर्षा",
    pressure: "सतह का दबाव",
    weeklyAverage: "साप्ताहिक औसत",
    monthlyAverage: "मासिक औसत",
    climateTrends: "जलवायु और नमी के रुझान",
    fiveYearTrend: "5-साल का जलवायु रुझान",
    oneYearTrend: "1-साल का नमी रुझान",
    expectedYield: "अपेक्षित उपज",
    marketReturns: "अपेक्षित लाभ",
    waterSavings: "पानी की बचत",
    suitability: "उपयुक्तता",
    readGrounding: "विवरण पढ़ें",
    closeGrounding: "विवरण बंद करें",
    soilHealthReq: "मिट्टी स्वास्थ्य आवश्यकता",
    marketPriceTrend: "बाजार मूल्य का रुझान",
    agronomicActions: "कृषि संबंधी क्रियाएं",
    signRequired: "साइन इन आवश्यक",
    signDesc: "अपने व्यक्तिगत किसान डैशबोर्ड, मिट्टी की नमी के ग्राफ़, उपग्रह सूचकांक रीडिंग और कृषि विशेषज्ञ के साथ लाइव चैट तक पहुँचने के लिए, कृपया Google का उपयोग करके लॉगिन करें।",
    signInGoogle: "गूगल के साथ साइन इन करें",
    switchWhatsApp: "या व्हाट्सएप बॉट परामर्श पर जाएं",
    setupTitle: "अपनी प्रोफ़ाइल सेट करें",
    setupDesc: "अपने डैशबोर्ड और चैट अनुभव को अनुकूलित करने के लिए कृपया अपना नाम दर्ज करें और अपनी पसंदीदा भाषा चुनें।",
    usernameLabel: "आपका नाम",
    langLabel: "पसंदीदा भाषा",
    saveAndContinue: "सहेजें और जारी रखें",
    whatsAppConnected: "व्हाट्सएप सिंक हो गया",
    syncedDescription: "आपकी वेबसाइट डैशबोर्ड टेलीमेट्री और फसल सिफारिशें व्हाट्सएप बॉट के साथ सिंक हो गई हैं।",
    inputPhonePlaceholder: "10-अंकों का व्हाट्सएप फोन नंबर दर्ज करें...",
    linkAndSync: "लिंक और सिंक",
    hi: "नमस्ते"
  },
  kn: {
    homeHub: "ಹೋಮ್ ಹಬ್",
    cropSuitability: "ಬೆಳೆ ಸೂಕ್ತತೆ",
    aiAgronomist: "AI ಕೃಷಿ ತಜ್ಞ",
    syncWhatsApp: "ವಾಟ್ಸಾಪ್ ಸಿಂಕ್ ಮಾಡಿ",
    exitHome: "ಹೋಮ್‌ಗೆ ಮರಳಿ",
    locationRequired: "ಸ್ಥಳ ಪ್ರವೇಶ ಅಗತ್ಯವಿದೆ",
    locationDesc: "ನಿಮ್ಮ ಜಮೀನಿನ ಲೈವ್ ಹವಾಮಾನ, ಹವಾಮಾನ ಪ್ರವೃತ್ತಿಗಳು ಮತ್ತು ಬೆಳೆ ಸಲಹೆಗಳನ್ನು ತೋರಿಸಲು ನಮಗೆ ನಿಮ್ಮ ನಿರ್ದೇಶಾಂಕಗಳು ಬೇಕಾಗುತ್ತವೆ.",
    allowLocation: "ಸ್ಥಳ ಪ್ರವೇಶವನ್ನು ಅನುಮತಿಸಿ",
    drySpellWarning: "ಶುಷ್ಕ ಹವಾಮಾನ ಎಚ್ಚರಿಕೆ",
    drySpellDesc: "ಮುನ್ಸೂಚನೆಗಳು: ಮುಂದಿನ 6 ದಿನಗಳವರೆಗೆ 5mm ಗಿಂತ ಕಡಿಮೆ ಮಳೆಯ ನಿರೀಕ್ಷೆಯಿದೆ. ಮಣ್ಣಿನ ತೇವಾಂಶ ಇಳಿಕೆಯಾಗುತ್ತಿದೆ.",
    consultAi: "AI ಸಂಪರ್ಕಿಸಿ",
    dismiss: "ವಜಾಗೊಳಿಸಿ",
    weatherTelemetry: "ಹವಾಮಾನ ಟೆಲಿಮೆಟ್ರಿ",
    soilSatellite: "ಮಣ್ಣು ಮತ್ತು ಉಪಗ್ರಹ ವಿಶ್ಲೇಷಣೆ",
    temp: "ತಾಪಮಾನ",
    humidity: "ಆರ್ದ್ರತೆ",
    windSpeed: "ಗಾಳಿಯ ವೇಗ",
    rainProb: "ಮಳೆಯ ಸಂಭಾವ್ಯತೆ",
    soilMoisture: "ಮಣ್ಣಿನ ತೇವಾಂಶ",
    ndvi: "ಸಸ್ಯವರ್ಗ ಸೂಚ್ಯಂಕ (NDVI)",
    groundwater: "ಅಂತರ್ಜಲ ಮಟ್ಟ",
    aqi: "ವಾಯು ಗುಣಮಟ್ಟ (AQI)",
    uvIndex: "ಯುವಿ ಸೂಚ್ಯಂಕ",
    precipitation: "ಮಳೆ ಪ್ರಮಾಣ",
    pressure: "ಮೇಲ್ಮೈ ಒತ್ತಡ",
    weeklyAverage: "ವಾರದ ಸರಾಸರಿ",
    monthlyAverage: "ತಿಂಗಳ ಸರಾಸರಿ",
    climateTrends: "ಹವಾಮಾನ ಮತ್ತು ತೇವಾಂಶ ಪ್ರವೃತ್ತಿಗಳು",
    fiveYearTrend: "5 ವರ್ಷಗಳ ಹವಾಮಾನ ಪ್ರವೃತ್ತಿ",
    oneYearTrend: "1 ವರ್ಷದ ತೇವಾಂಶ ಪ್ರವೃತ್ತಿ",
    expectedYield: "ನಿರೀಕ್ಷಿತ ಇಳುವರಿ",
    marketReturns: "ನಿರೀಕ್ಷಿತ ಲಾಭ",
    waterSavings: "ನೀರಿನ ಉಳಿತಾಯ",
    suitability: "ಸೂಕ್ತತೆ",
    readGrounding: "ವಿವರಗಳನ್ನು ಓದಿ",
    closeGrounding: "ವಿವರಗಳನ್ನು ಮುಚ್ಚಿ",
    soilHealthReq: "ಮಣ್ಣಿನ ಆರೋಗ್ಯದ ಅವಶ್ಯಕತೆ",
    marketPriceTrend: "ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಪ್ರವೃತ್ತಿ",
    agronomicActions: "ಕೃಷಿ ಕ್ರಮಗಳು",
    signRequired: "ಸೈನ್ ಇನ್ ಅಗತ್ಯವಿದೆ",
    signDesc: "ನಿಮ್ಮ ವೈಯಕ್ತಿಕಗೊಳಿಸಿದ ರೈತ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್, ಮಣ್ಣಿನ ತೇವಾಂಶದ ಗ್ರಾಫ್‌ಗಳು, ಉಪಗ್ರಹ ಸೂಚ್ಯಂಕ ವಾಚನಗೋಷ್ಠಿಗಳು ಮತ್ತು ಕೃಷಿ ತಜ್ಞರೊಂದಿಗೆ ಲೈವ್ ಚಾಟ್ ಅನ್ನು ಪ್ರವೇಶಿಸಲು, ದಯವಿಟ್ಟು Google ಬಳಸಿ ಲಾಗ್ ಇನ್ ಮಾಡಿ.",
    signInGoogle: "Google ನೊಂದಿಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ",
    switchWhatsApp: "ಅಥವಾ ವಾಟ್ಸಾಪ್ ಬಾಟ್ ಸಮಾಲೋಚನೆಗೆ ಬದಲಾಯಿಸಿ",
    setupTitle: "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಹೊಂದಿಸಿ",
    setupDesc: "ನಿಮ್ಮ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಮತ್ತು ಚಾಟ್ ಅನುಭವವನ್ನು ಕಸ್ಟಮೈಸ್ ಮಾಡಲು ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರನ್ನು ನಮೂದಿಸಿ ಮತ್ತು ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆರಿಸಿ.",
    usernameLabel: "ನಿಮ್ಮ ಹೆಸರು",
    langLabel: "ಆದ್ಯತೆಯ ಭಾಷೆ",
    saveAndContinue: "ಉಳಿಸಿ ಮತ್ತು ಮುಂದುವರಿಯಿರಿ",
    whatsAppConnected: "ವಾಟ್ಸಾಪ್ ಸಿಂಕ್ ಆಗಿದೆ",
    syncedDescription: "ನಿಮ್ಮ ವೆಬ್‌ಸೈಟ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಟೆಲಿಮೆಟ್ರಿ ಮತ್ತು ಬೆಳೆ ಶಿಫಾರಸುಗಳನ್ನು ವಾಟ್ಸಾಪ್ ಬಾಟ್‌ನೊಂದಿಗೆ ಸಿಂಕ್ ಮಾಡಲಾಗಿದೆ.",
    inputPhonePlaceholder: "10-ಅಂಕಿಯ ವಾಟ್ಸಾಪ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ...",
    linkAndSync: "ಲಿಂಕ್ ಮತ್ತು ಸಿಂಕ್",
    hi: "ನಮಸ್ಕಾರ"
  },
  ta: {
    homeHub: "முகப்பு மையம்",
    cropSuitability: "பயிர் பொருத்தம்",
    aiAgronomist: "AI வேளாண் நிபுணர்",
    syncWhatsApp: "வாட்ஸ்அப் ஒத்திசை",
    exitHome: "முகப்புக்குச் செல்",
    locationRequired: "இருப்பிட அனுமதி தேவை",
    locationDesc: "உங்கள் பண்ணையின் நேரடி வானிலை, காலநிலை போக்குகள் மற்றும் பயிர் பரிந்துரைகளைக் காட்ட எங்களுக்கு உங்கள் ஆயத்தொலைவுகள் தேவை.",
    allowLocation: "இருப்பிட அனுமதியை வழங்கு",
    drySpellWarning: "வறண்ட வானிலை எச்சரிக்கை",
    drySpellDesc: "கணிப்புகள்: அடுத்த 6 நாட்களுக்கு 5 மிமீக்கும் குறைவான மழையே எதிர்பார்க்கப்படுகிறது. மண்ணின் ஈரப்பதம் குறைகிறது.",
    consultAi: "AI ஐ அணுகவும்",
    dismiss: "விலக்கு",
    weatherTelemetry: "வானிலை டெலிமெட்ரி",
    soilSatellite: "மண் மற்றும் செயற்கைக்கோள் பகுப்பாய்வு",
    temp: "வெப்பநிலை",
    humidity: "ஈரப்பதம்",
    windSpeed: "காற்றின் வேகம்",
    rainProb: "மழைக்கான வாய்ப்பு",
    soilMoisture: "மண் ஈரப்பதம்",
    ndvi: "தாவர குறியீடு (NDVI)",
    groundwater: "நிலத்தडी நீர்",
    aqi: "காற்று தரம் (AQI)",
    uvIndex: "யுவி குறியீடு",
    precipitation: "மழைப்பொழிவு",
    pressure: "மேற்பரப்பு அழுத்தம்",
    weeklyAverage: "வாராந்திர சராசரி",
    monthlyAverage: "மாதாந்திர சராசரி",
    climateTrends: "காலநிலை மற்றும் ஈரப்பதம் போக்குகள்",
    fiveYearTrend: "5 வருட காலநிலை போக்கு",
    oneYearTrend: "1 வருட ஈரப்பதம் போக்கு",
    expectedYield: "எதிர்பார்க்கப்படும் மகசூல்",
    marketReturns: "எதிர்பார்க்கப்படும் வருவாய்",
    waterSavings: "தண்ணீர் சேமிப்பு",
    suitability: "பொருத்தம்",
    readGrounding: "விவரங்களைப் படி",
    closeGrounding: "விவரங்களை மூடு",
    soilHealthReq: "மண் ஆரோக்கியத் தேவை",
    marketPriceTrend: "சந்தை விலை போக்கு",
    agronomicActions: "வேளாண் நடவடிக்கைகள்",
    signRequired: "உள்நுழைவு தேவை",
    signDesc: "உங்கள் தனிப்பயனாக்கப்பட்ட விவசாயி டாஷ்போர்டு, மண் ஈரப்பதம் வரைபடங்கள், செயற்கைக்கோள் குறியீட்டு அளவீடுகள் மற்றும் வேளாண் நிபுணருடனான நேரडी அரட்டையை அணுக, கூகிள் மூலம் உள்நுழையவும்.",
    signInGoogle: "கூகிள் மூலம் உள்நுழைக",
    switchWhatsApp: "அல்லது வாட்ஸ்அப் பாட் ஆலோசனைக்கு மாறவும்",
    setupTitle: "உங்கள் சுயவிவரத்தை அமைக்கவும்",
    setupDesc: "உங்கள் டாஷ்போர்டு மற்றும் அரட்டை ಅನುಭವத்தைத் தனிப்பயனாக்க உங்கள் பெயரை உள்ளிட்டு உங்களுக்கு விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்.",
    usernameLabel: "உங்கள் பெயர்",
    langLabel: "விருப்பமான மொழி",
    saveAndContinue: "சேமித்து தொடரவும்",
    whatsAppConnected: "வாட்ஸ்அப் ஒத்திசைக்கப்பட்டது",
    syncedDescription: "உங்கள் வலைத்தள டாஷ்போர்டு டெலிமெட்ரி மற்றும் பயிர் பரிந்துரைகள் வாட்ஸ்அப் பாட் உடன் ஒத்திசைக்கப்பட்டுள்ளன.",
    inputPhonePlaceholder: "10 இலக்க வாட்ஸ்அப் எண்ணை உள்ளிடவும்...",
    linkAndSync: "இணைத்து ஒத்திசைக்கவும்",
    hi: "வணக்கம்"
  },
  mr: {
    homeHub: "होम हब",
    cropSuitability: "पीक उपयुक्तता",
    aiAgronomist: "एआय कृषी तज्ज्ञ",
    syncWhatsApp: "व्हॉट्सॲप सिंक करा",
    exitHome: "होमवर जा",
    locationRequired: "स्थान प्रवेश आवश्यक",
    locationDesc: "तुमच्या शेतासाठी थेट हवामान, हवामान ट्रेंड आणि पीक शिफारसी दर्शवण्यासाठी आम्हाला तुमच्या निर्देशांकांची आवश्यकता आहे.",
    allowLocation: "स्थान प्रवेशास अनुमती द्या",
    drySpellWarning: "कोरड्या हवामानाचा इशारा",
    drySpellDesc: "अंदाज: पुढील ६ दिवसांत ५ मिमी पेक्षा कमी पावसाची अपेक्षा आहे. मातीतील ओलावा कमी होत आहे.",
    consultAi: "एआयचा सल्ला घ्या",
    dismiss: "रद्द करा",
    weatherTelemetry: "हवामान टेलिमेट्री",
    soilSatellite: "माती आणि उपग्रह विश्लेषण",
    temp: "तापमान",
    humidity: "आद्रता",
    windSpeed: "वाऱ्याचा वेग",
    rainProb: "पावसाची शक्यता",
    soilMoisture: "मातीतील ओलावा",
    ndvi: "वनस्पती निर्देशांक (NDVI)",
    groundwater: "भूजल पातळी",
    aqi: "हवेची गुणवत्ता (AQI)",
    uvIndex: "यूव्ही इंडेक्स",
    precipitation: "पाऊस",
    pressure: "पृष्ठभागावरील दाब",
    weeklyAverage: "साप्ताहिक सरासरी",
    monthlyAverage: "मासिक सरासरी",
    climateTrends: "हवामान आणि ओलावा ट्रेंड",
    fiveYearTrend: "५ वर्षांचा हवामान ट्रेंड",
    oneYearTrend: "१ वर्षाचा ओलावा ट्रेंड",
    expectedYield: "अपेक्षित उत्पादन",
    marketReturns: "अपेक्षित नफा",
    waterSavings: "पाण्याची बचत",
    suitability: "उपयुक्तता",
    readGrounding: "तपशील वाचा",
    closeGrounding: "तपशील बंद करा",
    soilHealthReq: "माती आरोग्य आवश्यकता",
    marketPriceTrend: "बाजारभाव ट्रेंड",
    agronomicActions: "कृषिविषयक कृती",
    signRequired: "साइन इन आवश्यक",
    signDesc: "तुमचा वैयक्तिकृत शेतकरी डॅशबोर्ड, मातीतील ओलावा आलेख, उपग्रह निर्देशांक रीडिंग आणि कृषी तज्ज्ञांशी थेट चॅटमध्ये प्रवेश करण्यासाठी, कृपया Google वापरून लॉगिन करा.",
    signInGoogle: "Google सह साइन इन करा",
    switchWhatsApp: "किंवा व्हॉट्सॲप बॉट सल्लामसलत वर जा",
    setupTitle: "तुमची प्रोफाईल सेट करा",
    setupDesc: "तुमचा डॅशबोर्ड आणि चॅट अनुभव सानुकूलित करण्यासाठी कृपया तुमचे नाव प्रविष्ट करा आणि तुमची पसंतीची भाषा निवडा.",
    usernameLabel: "तुमचे नाव",
    langLabel: "पसंतीची भाषा",
    saveAndContinue: "जतन करा आणि पुढे जा",
    whatsAppConnected: "व्हॉट्सॲप सिंक झाले",
    syncedDescription: "तुमची वेबसाइट डॅशबोर्ड टेलिमेट्री आणि पीक शिफारसी व्हॉट्सॲप बॉटसह सिंक केल्या आहेत.",
    inputPhonePlaceholder: "10-अंकी व्हॉट्सॲप क्रमांक प्रविष्ट करा...",
    linkAndSync: "लिंक आणि सिंक",
    hi: "नमस्कार"
  }
};

const renderFormattedText = (text: string) => {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    // Regular expression to extract **bold** and `code` patterns
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const tokens = line.split(regex);
    const lineContent = tokens.map((token, tokenIdx) => {
      if (token.startsWith("**") && token.endsWith("**")) {
        return <strong key={tokenIdx} className="font-extrabold text-forest-dark">{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith("`") && token.endsWith("`")) {
        return <code key={tokenIdx} className="bg-forest-medium/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-forest-dark">{token.slice(1, -1)}</code>;
      }
      return token;
    });

    return (
      <div key={lineIdx} className={lineIdx > 0 ? "mt-2" : ""}>
        {lineContent}
      </div>
    );
  });
};

export default function FarmerPortal() {
  const [activeTab, setActiveTab] = useState<"home" | "recommendations" | "chat">("home");
  const [expandedCrop, setExpandedCrop] = useState<any | null>(null);

  const t = (key: keyof typeof TRANSLATIONS['en']) => {
    const lang = (userProfile?.language || "en") as keyof typeof TRANSLATIONS;
    return (TRANSLATIONS[lang] || TRANSLATIONS.en)[key] || TRANSLATIONS.en[key];
  };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: "Good morning, Ramu! How is your crop doing today? You can write, press the mic button to speak, or upload a leaf photo for disease scanning — all right here in this chat.",
      timestamp: "09:30 AM",
    },
  ]);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState(-1);
  const [isPipelineVisible, setIsPipelineVisible] = useState(false);

  // Image upload state (for inline disease scanning in chat)
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Platform selection modal
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [hasCheckedPlatform, setHasCheckedPlatform] = useState(false);

  // Trigger alert
  const [showAlert, setShowAlert] = useState(true);

  // Firebase user ID
  const [userId, setUserId] = useState<string>("anon");
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [weatherData, setWeatherData] = useState<any[]>(WEATHER_DATA);
  const [cropRec, setCropRec] = useState<any[]>(CROP_REC);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [inputPhone, setInputPhone] = useState("");
  const [weatherStats, setWeatherStats] = useState<{
    windSpeed: string;
    humidity: string;
    rainProbability: string;
    currentTemp: string;
    aqi: number;
    soilMoisture: string;
    groundwater: string;
    ndvi: string;
    precipSum6Days: number;
    uvIndex: number;
    precipitation: string;
    pressure: string;
  }>({
    windSpeed: "12 km/h NE",
    humidity: "68%",
    rainProbability: "5%",
    currentTemp: "32°C Sunny",
    aqi: 42,
    soilMoisture: "24%",
    groundwater: "6.2m Deficit",
    ndvi: "0.68 Healthy",
    precipSum6Days: 0,
    uvIndex: 2,
    precipitation: "0 mm",
    pressure: "1013.2 hPa",
  });

  const [timeRange, setTimeRange] = useState<"week" | "year" | "5years">("week");
  const [climateYearly, setClimateYearly] = useState<any[]>([]);
  const [climateMonthly, setClimateMonthly] = useState<any[]>([]);

  const [platform, setPlatform] = useState<"website" | "whatsapp" | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupLanguage, setSetupLanguage] = useState("te");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // Custom Dropdown State & Ref
  const [isTimeRangeDropdownOpen, setIsTimeRangeDropdownOpen] = useState(false);
  const timeRangeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (timeRangeDropdownRef.current && !timeRangeDropdownRef.current.contains(event.target as Node)) {
        setIsTimeRangeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize Auth, Geolocation, and check platform modal on mount
  useEffect(() => {
    // 1. Set up Geolocation
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setCoordinates(coords);
          fetchWeatherAndCrops(coords.latitude, coords.longitude);
          
          // If user is already logged in, sync coordinates to Firestore
          const currentUser = auth.currentUser;
          if (currentUser) {
            syncUserProfile(currentUser.uid, currentUser.email || "", currentUser.displayName || "", currentUser.photoURL || "", undefined, coords);
          }
        },
        (err) => {
          console.warn("Geolocation access denied or timed out:", err);
        }
      );
    }

    // 2. Set up platform preferences
    let platformChosen = localStorage.getItem("c2c_platform_chosen") as "website" | "whatsapp" | null;
    
    // Check if redirect query param exists
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("select") === "true") {
        localStorage.removeItem("c2c_platform_chosen");
        platformChosen = null;
      }
    }

    if (platformChosen) {
      setPlatform(platformChosen);
    } else {
      setShowPlatformModal(true);
    }
    setHasCheckedPlatform(true);

    // 3. Set up Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthLoading(true);
      if (currentUser) {
        setFirebaseUser(currentUser);
        setUserId(currentUser.uid);
        loadChatHistory(currentUser.uid);
        
        // Sync profile to database with any coordinates we already resolved
        await syncUserProfile(currentUser.uid, currentUser.email || "", currentUser.displayName || "", currentUser.photoURL || "", undefined, coordinates);
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
        const anonId = getUserId();
        setUserId(anonId);
        loadChatHistory(anonId);
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const syncUserProfile = async (uid: string, email: string, displayName: string, photoURL: string, phone?: string, coords?: { latitude: number; longitude: number } | null) => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, email, displayName, photoURL, phone, coordinates: coords }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setUserProfile(data.profile);
          setSetupName(data.profile.displayName || displayName || "");
          setSetupLanguage(data.profile.language || "te");

          if (!data.profile.language) {
            setShowSetupModal(true);
          }
          
          // Use stored profile coordinates if client has not resolved coordinates yet
          if (data.profile.coordinates && data.profile.coordinates.latitude && data.profile.coordinates.longitude) {
            const coords = {
              latitude: data.profile.coordinates.latitude,
              longitude: data.profile.coordinates.longitude,
            };
            setCoordinates(coords);
            fetchWeatherAndCrops(coords.latitude, coords.longitude);
          } else {
            // Coordinates not present in Firestore! Auto-fetch and update
            if (typeof window !== "undefined" && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  };
                  setCoordinates(coords);
                  fetchWeatherAndCrops(coords.latitude, coords.longitude);
                  // Sync to Firestore profile
                  syncUserProfile(uid, email, displayName, photoURL, phone, coords);
                },
                (err) => {
                  console.warn("Auto-geolocation on sync failed:", err);
                }
              );
            }
          }

          // Check if phone needs to be prompted (only once per user account)
          if (!data.profile.phone && !phone) {
            const promptedKey = `c2c_phone_prompted_${uid}`;
            const alreadyPrompted = localStorage.getItem(promptedKey);
            if (!alreadyPrompted) {
              setShowPhoneModal(true);
              localStorage.setItem(promptedKey, "true");
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to sync profile:", e);
    } finally {
      setAuthLoading(false);
    }
  };

  const updateProfileSettings = async (name: string, lang: string) => {
    if (!firebaseUser) return;
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          displayName: name,
          language: lang
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setUserProfile(data.profile);
          setShowSetupModal(false);
        }
      }
    } catch (e) {
      console.error("Failed to update profile settings:", e);
    }
  };

  const fetchWeatherAndCrops = async (lat: number, lon: number) => {
    try {
      const wRes = await fetch(`/api/weather?lat=${lat}&lon=${lon}${userId ? `&userId=${userId}` : ""}`);
      if (wRes.ok) {
        const wData = await wRes.json();
        if (wData.forecast) {
          setWeatherData(wData.forecast);
        }
        setWeatherStats({
          windSpeed: `${wData.wind_speed} km/h`,
          humidity: `${wData.humidity}%`,
          rainProbability: `${wData.rain_probability}%`,
          currentTemp: `${wData.current_temp}°C`,
          aqi: wData.aqi ?? 42,
          soilMoisture: wData.soil_moisture ?? "24%",
          groundwater: wData.groundwater ?? "6.2m Deficit",
          ndvi: wData.ndvi ?? "0.68 Healthy",
          precipSum6Days: wData.precip_sum_6_days !== undefined ? wData.precip_sum_6_days : 0,
          uvIndex: wData.uv_index ?? 2,
          precipitation: wData.precipitation ?? "0 mm",
          pressure: wData.pressure ?? "1013.2 hPa",
        });
        
        // Show Dry Spell Warning if expected 6-day rain is < 5mm
        if (wData.precip_sum_6_days !== undefined && wData.precip_sum_6_days < 5) {
          setShowAlert(true);
        } else {
          setShowAlert(false);
        }
      }

      // Fetch 5-year climate trend & monthly data
      try {
        const climateRes = await fetch(`/api/weather/climate?lat=${lat}&lon=${lon}`);
        if (climateRes.ok) {
          const cData = await climateRes.json();
          if (cData.climate) {
            setClimateYearly(cData.climate.monthly5Year || []);
            setClimateMonthly(cData.climate.weekly2025 || []);
          }
        }
      } catch (ce) {
        console.warn("Climate history fetch failed:", ce);
      }

      const cRes = await fetch(`/api/crop/recommend?lat=${lat}&lon=${lon}${userId ? `&userId=${userId}` : ""}`);
      if (cRes.ok) {
        const cData = await cRes.json();
        if (cData.recommendations) {
          setCropRec(cData.recommendations);
        }
      }
    } catch (err) {
      console.error("Failed to fetch live weather/crops:", err);
    }
  };

  // Auto-scroll to bottom when messages change (optimized to prevent parent viewport page jitter and lag)
  useEffect(() => {
    const scrollContainer = chatContainerRef.current;
    if (scrollContainer) {
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      });
      const t = setTimeout(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }, 60);
      return () => clearTimeout(t);
    }
  }, [chatMessages]);

  // Load chat history from Firebase
  const loadChatHistory = async (uid: string) => {
    try {
      const res = await fetch(`/api/chat/history?userId=${uid}&platform=web`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setChatMessages(data.messages);
        }
      }
    } catch (err) {
      console.log("Chat history fetch skipped:", err);
    }
  };


  // Persist a single message to Firebase
  const persistMessage = async (message: ChatMessage) => {
    try {
      await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: { ...message, platform: "web" } }),
      });
    } catch (err) {
      // Firebase not configured yet — silently skip
      console.log("Message persist skipped (Firebase may not be configured):", err);
    }
  };

  // Platform modal handlers
  const handleSelectWebsite = () => {
    localStorage.setItem("c2c_platform_chosen", "website");
    setPlatform("website");
    setShowPlatformModal(false);
  };

  const handleSelectWhatsApp = () => {
    localStorage.setItem("c2c_platform_chosen", "whatsapp");
    setPlatform("whatsapp");
    setShowPlatformModal(false);
    window.open("https://wa.me/14155238886?text=join%20combination-hundred", "_blank");
  };



  // Voice Note complete handler
  const handleVoiceNoteResult = async (text: string, translation: string, langCode: string) => {
    setIsVoiceOpen(false);

    // Auto-update user's preferred language if a regional language was auto-detected
    if (langCode && langCode !== "auto" && firebaseUser) {
      if (userProfile?.language !== langCode) {
        await updateProfileSettings(userProfile?.displayName || firebaseUser.displayName || "Farmer", langCode);
      }
    }

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
    setActivePipelineStep(3); // Analyzing

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          message: {
            ...farmerMsg,
            location: coordinates || undefined,
            platform: "web"
          }
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.aiMessage) {
          setChatMessages((prev) => [...prev, data.aiMessage]);
        }
      }
    } catch (err) {
      console.error("Error processing voice transcript on server:", err);
    } finally {
      setIsPipelineVisible(false);
      setActivePipelineStep(-1);
    }
  };

  const handleSendText = async (text: string) => {
    if (!text.trim() && !pendingImage) return;

    const farmerMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "farmer",
      text: text || (pendingImage ? "Uploaded crop photo for diagnostic analysis" : ""),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageUrl: pendingImage || undefined,
    };

    setChatMessages((prev) => [...prev, farmerMsg]);

    const hasImage = !!pendingImage;
    if (hasImage) {
      setIsScanning(true);
    }

    const payloadText = text;
    const payloadImage = pendingImage;

    setPendingImage(null);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          message: {
            ...farmerMsg,
            location: coordinates || undefined,
            platform: "web"
          }
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.aiMessage) {
          setChatMessages((prev) => [...prev, data.aiMessage]);
        }
      }
    } catch (err) {
      console.error("Error generating chat response:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Image selection handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setPendingImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Escalate case from inline diagnosis
  const escalateFromChat = async (diseaseResult: ChatMessage["diseaseResult"]) => {
    try {
      const caseId = `case_${Date.now()}`;
      let finalLat = coordinates?.latitude || null;
      let finalLng = coordinates?.longitude || null;
      if (finalLat === null || finalLng === null || isNaN(finalLat) || isNaN(finalLng)) {
        const seed = Date.now() % 100;
        finalLat = 18.4386 + (seed / 100) * 0.16 - 0.08;
        finalLng = 79.1288 + (((seed >> 2) % 100) / 100) * 0.16 - 0.08;
      }

      const newCase = {
        id: caseId,
        farmerName: firebaseUser?.displayName || "Web Farmer",
        farmerPhone: firebaseUser?.phoneNumber || "+919876543210",
        village: `${finalLat.toFixed(6)}, ${finalLng.toFixed(6)}`,
        crop: "Groundnut",
        issue: `Leaf diagnosis escalation: ${diseaseResult?.diseaseName}`,
        severity: diseaseResult?.severity || "high",
        confidence: diseaseResult?.confidence || 0.58,
        image: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=150&q=80",
        status: "pending",
        createdAt: Date.now(),
        lat: finalLat,
        lng: finalLng,
      };

      // Direct write to firebase via server proxy or client firestore
      // Wait, we can save cases directly using our Firestore collection on client!
      const { db: clientDb } = await import("@/lib/firebaseClient");
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(clientDb, "cases", caseId), newCase);

      const escalationMsg: ChatMessage = {
        id: (Date.now() + 3).toString(),
        sender: "ai",
        text: "✅ This case has been escalated to your nearest Rythu Seva Kendra (RSK) officer. Your coordinates and leaf diagnostics are queued for live agronomy validation.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, escalationMsg]);
      
      // Save escalation message to chat history
      await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: { ...escalationMsg, platform: "web" } }),
      });
    } catch (e) {
      console.error("Escalation failed:", e);
    }
  };


  const getChartData = () => {
    if (timeRange === "week") return weatherData;
    if (timeRange === "year") return climateMonthly;
    if (timeRange === "5years") return climateYearly;
    return weatherData;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center p-6 text-forest-medium">
        <div className="w-8 h-8 rounded-full border-4 border-forest-medium border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="relative min-h-screen bg-warm-bg text-forest-dark selection:bg-forest-light/20 flex flex-col items-center justify-center p-6">
        <div className="grain-overlay absolute inset-0 z-0 opacity-15" />
        <div className="glow-blob w-[400px] h-[400px] bg-forest-light top-[-100px] right-[-100px] opacity-10" />
        
        {/* Floating card for sign-in */}
        <div className="relative z-10 w-full max-w-xl p-8 rounded-[32px] bg-white border border-forest-medium/10 shadow-xl text-center space-y-6">
          <div className="flex flex-col items-center pb-4 border-b border-forest-medium/5">
            <Link href="/" className="flex items-center gap-3.5 cursor-pointer group hover:opacity-85 transition-all">
              <span className="p-3.5 rounded-full bg-[#1C3F24] text-white shadow-md group-hover:scale-105 transition-all">
                <Leaf className="w-6 h-6" />
              </span>
              <div className="text-left">
                <span className="font-extrabold text-2xl tracking-tight block text-[#1C3F24]">Code2Crop</span>
                <span className="text-[10px] text-forest-medium/50 block font-bold uppercase tracking-widest mt-0.5">AI PLATFORM</span>
              </div>
            </Link>
          </div>
          <p className="text-xs text-forest-medium/70 leading-relaxed font-semibold">
            To access your personalized farmer dashboard, soil moisture graphs, satellite index readings, and live chat with the agronomist, please authenticate using Google.
          </p>
          <div className="flex flex-col gap-3 pt-4 items-center">
            <button
              onClick={() => signInWithPopup(auth, googleProvider)}
              className="px-6 py-3 rounded-full bg-forest-medium hover:bg-forest-dark text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 w-full max-w-xs"
            >
              <LogIn className="w-4 h-4" /> Sign In with Google
            </button>
            <button
              onClick={() => {
                localStorage.setItem("c2c_platform_chosen", "whatsapp");
                setPlatform("whatsapp");
                window.open("https://wa.me/14155238886?text=join%20combination-hundred", "_blank");
              }}
              className="text-xs font-bold text-forest-medium hover:text-forest-dark underline"
            >
              Or switch to WhatsApp Bot consultation
            </button>
            <Link
              href="/"
              className="text-xs font-bold text-forest-medium/60 hover:text-forest-medium mt-4"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-warm-bg text-forest-dark selection:bg-forest-light/20 flex flex-col">
      <div className="grain-overlay absolute inset-0 z-0 opacity-15" />
      <div className="glow-blob w-[400px] h-[400px] bg-forest-light top-[-100px] right-[-100px] opacity-10" />

      {/* Floating Header */}
      <header className="sticky top-0 z-40 w-full px-6 py-4 backdrop-blur-xl bg-warm-bg/75 border-b border-forest-medium/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer group hover:opacity-85 transition-all">
            <span className="p-2 rounded-2xl bg-gradient-to-tr from-forest-medium to-forest-light text-white shadow-md group-hover:scale-105 transition-all">
              <Compass className="w-5 h-5" />
            </span>
            <div>
              <span className="font-extrabold text-base tracking-tight block text-forest-dark">Kisan Alert</span>
              <span className="text-[9px] text-forest-medium/55 block font-bold uppercase tracking-widest mt-0.5">Farmer Assistant</span>
            </div>
          </Link>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-forest-light/5 border border-forest-medium/5">
            {[
              { id: "home", key: "homeHub" },
              { id: "recommendations", key: "cropSuitability" },
              { id: "chat", key: "aiAgronomist" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "home" | "recommendations" | "chat")}
                className={`text-xs font-bold px-4 py-2 rounded-full transition-all ${activeTab === tab.id
                    ? "bg-white text-forest-dark shadow-sm"
                    : "text-forest-medium/60 hover:text-forest-medium"
                  }`}
              >
                {t(tab.key as any)}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Language Selector Dropdown beside Sync WhatsApp button */}
            {firebaseUser && (
              <div className="relative">
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="text-xs font-bold text-forest-medium hover:text-forest-dark flex items-center gap-1.5 bg-white border border-forest-medium/15 px-3.5 py-2.5 rounded-full shadow-sm hover:bg-forest-light/5 transition-all"
                >
                  <Globe className="w-3.5 h-3.5 opacity-70" />
                  {
                    LANGUAGES.find(l => l.code === (userProfile?.language || "en"))?.name.split(" ")[0] || "English"
                  }
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {langDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-white border border-forest-medium/10 shadow-xl overflow-hidden z-50 p-1">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={async () => {
                          setLangDropdownOpen(false);
                          await updateProfileSettings(userProfile?.displayName || firebaseUser.displayName || "Farmer", lang.code);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex justify-between items-center transition-all ${
                          (userProfile?.language || "en") === lang.code
                            ? "bg-forest-light/5 text-forest-dark"
                            : "hover:bg-forest-light/5 text-forest-medium"
                        }`}
                      >
                        {lang.name.split(" ")[0]}
                        {(userProfile?.language || "en") === lang.code && (
                          <Check className="w-3 h-3 text-forest-medium" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {firebaseUser ? (
              <button
                onClick={() => setShowPhoneModal(true)}
                className="text-xs font-bold text-forest-medium hover:text-forest-dark flex items-center gap-1 bg-white border border-forest-medium/15 px-3.5 py-2.5 rounded-full shadow-sm hover:bg-forest-light/5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow text-natural-green" /> {t("syncWhatsApp")}
              </button>
            ) : (
              <button
                onClick={() => {
                  localStorage.removeItem("c2c_platform_chosen");
                  setPlatform(null);
                  setShowPlatformModal(true);
                }}
                className="text-xs font-bold text-forest-medium/80 hover:text-forest-dark flex items-center gap-1 bg-white border border-forest-medium/15 px-3.5 py-2.5 rounded-full shadow-sm hover:bg-forest-light/5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Switch Platform
              </button>
            )}
            {firebaseUser ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-forest-medium">{t("hi")}, {userProfile?.displayName?.split(" ")[0] || firebaseUser.displayName?.split(" ")[0]}</span>
                <button
                  onClick={() => signOut(auth)}
                  className="text-xs font-bold text-forest-medium/80 hover:text-forest-medium flex items-center gap-1 bg-white border border-forest-medium/10 px-3.5 py-2 rounded-full shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithPopup(auth, googleProvider)}
                className="text-xs font-bold text-white bg-forest-medium hover:bg-forest-dark flex items-center gap-1 px-4 py-2.5 rounded-full shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </button>
            )}
            <Link
              href="/"
              className="text-xs font-bold text-forest-medium/80 hover:text-forest-medium flex items-center gap-1 bg-white border border-forest-medium/10 px-3.5 py-2 rounded-full shadow-sm"
            >
              {t("exitHome")}
            </Link>
          </div>
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
                  <h4 className="text-xs font-black uppercase tracking-wider">{t("drySpellWarning")}</h4>
                  <p className="text-xs text-amber-800/80 mt-0.5 font-medium">
                    {userProfile?.villageName || (coordinates ? `${t("temp").split(" ")[0]} (${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)})` : "Local Area")} {t("drySpellDesc")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setActiveTab("chat")}
                  className="text-xs font-bold bg-amber-800 text-white px-4 py-2 rounded-full hover:bg-amber-900 transition-all shadow-sm"
                >
                  {t("consultAi")}
                </button>
                <button
                  onClick={() => setShowAlert(false)}
                  className="text-xs text-amber-800 hover:text-amber-950 font-bold"
                >
                  {t("dismiss")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab content renderer */}
        <div className="w-full">
          {platform === "whatsapp" ? (
            <div className="max-w-xl mx-auto my-12 p-8 rounded-[32px] bg-white border border-forest-medium/10 shadow-xl text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center mx-auto">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-forest-dark">WhatsApp Assistance Active</h2>
              <p className="text-xs text-forest-medium/70 leading-relaxed font-semibold">
                You have chosen to consult the agronomist via WhatsApp. To register and start chatting with Code2Crop AI, send the word **"join combination-hundred"** to our official WhatsApp number:
              </p>
              <div className="p-4 rounded-2xl bg-forest-light/5 border border-forest-medium/5 font-mono text-sm font-bold text-forest-dark inline-block px-8">
                +1 415 523 8886
              </div>
              <div className="flex flex-col gap-3 pt-4 items-center">
                <a
                  href="https://wa.me/14155238886?text=join%20combination-hundred"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-full bg-[#25D366] hover:bg-[#1EBE57] text-white text-xs font-bold shadow-md transition-all block text-center w-full max-w-xs"
                >
                  Open WhatsApp Chat
                </a>
                <button
                  onClick={() => {
                    localStorage.setItem("c2c_platform_chosen", "website");
                    setPlatform("website");
                  }}
                  className="text-xs font-bold text-forest-medium hover:text-forest-dark underline"
                >
                  Or switch to Chatting on the Website instead
                </button>
              </div>
            </div>
          ) : !firebaseUser ? (
            <div className="max-w-xl mx-auto my-12 p-8 rounded-[32px] bg-white border border-forest-medium/10 shadow-xl text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-forest-light/10 text-forest-medium flex items-center justify-center mx-auto animate-pulse">
                <Monitor className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-forest-dark">Sign In Required</h2>
              <p className="text-xs text-forest-medium/70 leading-relaxed font-semibold">
                To access your personalized farmer dashboard, soil moisture graphs, satellite index readings, and live chat with the agronomist, please authenticate using Google.
              </p>
              <div className="flex flex-col gap-3 pt-4 items-center">
                <button
                  onClick={() => signInWithPopup(auth, googleProvider)}
                  className="px-6 py-3 rounded-full bg-forest-medium hover:bg-forest-dark text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 w-full max-w-xs"
                >
                  <LogIn className="w-4 h-4" /> Sign In with Google
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem("c2c_platform_chosen", "whatsapp");
                    setPlatform("whatsapp");
                    window.open("https://wa.me/14155238886?text=join%20combination-hundred", "_blank");
                  }}
                  className="text-xs font-bold text-forest-medium hover:text-forest-dark underline"
                >
                  Or switch to WhatsApp Bot consultation
                </button>
              </div>
            </div>
          ) : (
            <>
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
                    <h2 className="text-3xl font-black text-forest-dark mt-4">
                      Good Morning, {firebaseUser ? firebaseUser.displayName : "Farmer"}
                    </h2>
                    <p className="text-xs text-forest-medium/60 mt-1 font-semibold">
                      Location: {userProfile?.villageName || (coordinates ? `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}` : "Location Unspecified")} • Current Season: Kharif
                    </p>
                  </div>

                  {/* Status Grid */}
                  {coordinates && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-forest-medium/5">
                      <div className="space-y-1">
                        <span className="text-[10px] text-forest-medium/40 uppercase block font-bold">Soil Moisture</span>
                        <span className="text-lg font-black text-forest-medium block">{weatherStats.soilMoisture} <span className="text-[10px] font-semibold text-danger-red font-mono">-18% avg</span></span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-forest-medium/40 uppercase block font-bold">NDVI Veg Index</span>
                        <span className="text-lg font-black text-forest-medium block">{weatherStats.ndvi}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-forest-medium/40 uppercase block font-bold">Groundwater</span>
                        <span className="text-lg font-black text-forest-medium block">{weatherStats.groundwater}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-forest-medium/40 uppercase block font-bold">Air Quality (AQI)</span>
                        <span className="text-lg font-black text-forest-medium block">
                          {weatherStats.aqi}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ml-1.5 ${
                            weatherStats.aqi <= 50 ? "text-natural-green bg-natural-green/10" :
                            weatherStats.aqi <= 100 ? "text-amber-warning bg-amber-warning/10" : "text-danger-red bg-danger-red/10"
                          }`}>
                            {weatherStats.aqi <= 50 ? "Good" : weatherStats.aqi <= 100 ? "Moderate" : "Poor"}
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Weather Hub & Map Telemetry Section */}
                {coordinates ? (
                  <>
                    {/* Weather Hub Card */}
                    <div className="p-6 rounded-[32px] bg-white border border-forest-medium/5 shadow-sm">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-forest-dark">Weather Telemetry</h3>
                          <p className="text-xs text-forest-medium/60 mt-0.5">{userProfile?.villageName || (coordinates ? `Coordinates (${coordinates.latitude.toFixed(2)}, ${coordinates.longitude.toFixed(2)})` : "Local Area")} weather telemetry</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Time-Range Selector Dropdown */}
                          <div className="relative" ref={timeRangeDropdownRef}>
                            <button
                              onClick={() => setIsTimeRangeDropdownOpen(!isTimeRangeDropdownOpen)}
                              className="flex items-center gap-2 text-xs font-bold border border-forest-medium/10 rounded-xl px-3 py-1.5 bg-forest-light/5 text-forest-medium hover:bg-forest-light/10 transition-all focus:outline-none"
                            >
                              <span>
                                {timeRange === "week" ? "7 Days" : timeRange === "year" ? "1 Year (Monthly)" : "5 Years (Annual)"}
                              </span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isTimeRangeDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isTimeRangeDropdownOpen && (
                              <div className="absolute right-0 mt-1.5 w-40 rounded-2xl bg-white border border-forest-medium/10 shadow-lg py-1.5 z-50 overflow-hidden text-left">
                                <button
                                  onClick={() => {
                                    setTimeRange("week");
                                    setIsTimeRangeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-forest-light/5 transition-colors ${timeRange === "week" ? "text-forest-dark bg-forest-light/10" : "text-forest-medium"}`}
                                >
                                  7 Days
                                </button>
                                <button
                                  onClick={() => {
                                    setTimeRange("year");
                                    setIsTimeRangeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-forest-light/5 transition-colors ${timeRange === "year" ? "text-forest-dark bg-forest-light/10" : "text-forest-medium"}`}
                                >
                                  1 Year (Monthly)
                                </button>
                                <button
                                  onClick={() => {
                                    setTimeRange("5years");
                                    setIsTimeRangeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-forest-light/5 transition-colors ${timeRange === "5years" ? "text-forest-dark bg-forest-light/10" : "text-forest-medium"}`}
                                >
                                  5 Years (Annual)
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-forest-light/5 text-xs text-forest-medium border border-forest-medium/10 font-bold shrink-0">
                            <Sun className="w-4 h-4 text-amber-warning" /> {weatherStats.currentTemp}
                          </div>
                        </div>
                      </div>

                      {/* Temperature Chart */}
                      <div className="h-48 w-full -ml-4 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={getChartData()}>
                            <XAxis 
                              dataKey="time" 
                              stroke="#1C3F24" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              opacity={0.6} 
                              tickFormatter={(tick) => {
                                const data = getChartData();
                                const item = data?.find((d: any) => d.time === tick);
                                if (timeRange === "year") return item?.monthLabel || "";
                                if (timeRange === "5years") return item?.yearLabel || "";
                                return tick;
                              }}
                            />
                            <YAxis stroke="#1C3F24" fontSize={10} tickLine={false} axisLine={false} opacity={0.6} />
                            <Tooltip />
                            <Line type="monotone" dataKey="temp" stroke="#1A73E8" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Weather Info Widgets */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 pt-4 border-t border-forest-medium/5 text-left">
                        <div className="flex items-center gap-2">
                          <span className="p-2.5 rounded-xl bg-forest-light/5 text-forest-medium shrink-0">
                            <Wind className="w-4 h-4 animate-pulse" />
                          </span>
                          <div>
                            <span className="text-[9px] text-forest-medium/40 block uppercase font-bold">Wind</span>
                            <span className="text-xs font-bold block">{weatherStats.windSpeed}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="p-2.5 rounded-xl bg-forest-light/5 text-forest-medium shrink-0">
                            <Droplet className="w-4 h-4" />
                          </span>
                          <div>
                            <span className="text-[9px] text-forest-medium/40 block uppercase font-bold">Humidity</span>
                            <span className="text-xs font-bold block">{weatherStats.humidity}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="p-2.5 rounded-xl bg-forest-light/5 text-forest-medium shrink-0">
                            <CloudRain className="w-4 h-4" />
                          </span>
                          <div>
                            <span className="text-[9px] text-forest-medium/40 block uppercase font-bold">Rain Prob</span>
                            <span className="text-xs font-bold block">{weatherStats.rainProbability}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="p-2.5 rounded-xl bg-forest-light/5 text-forest-medium shrink-0">
                            <Sun className="w-4 h-4 text-amber-500" />
                          </span>
                          <div>
                            <span className="text-[9px] text-forest-medium/40 block uppercase font-bold">UV Index</span>
                            <span className="text-xs font-bold block">{weatherStats.uvIndex}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="p-2.5 rounded-xl bg-forest-light/5 text-forest-medium shrink-0">
                            <CloudRain className="w-4 h-4 text-blue-500" />
                          </span>
                          <div>
                            <span className="text-[9px] text-forest-medium/40 block uppercase font-bold">Precipitation</span>
                            <span className="text-xs font-bold block">{weatherStats.precipitation}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="p-2.5 rounded-xl bg-forest-light/5 text-forest-medium shrink-0">
                            <Compass className="w-4 h-4 text-emerald-600" />
                          </span>
                          <div>
                            <span className="text-[9px] text-forest-medium/40 block uppercase font-bold">Pressure</span>
                            <span className="text-xs font-bold block whitespace-nowrap">{weatherStats.pressure}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Geolocation Map Card */}
                    <div className="p-6 rounded-[32px] bg-white border border-forest-medium/5 shadow-sm space-y-4 text-left">
                      <h3 className="text-xs font-black uppercase tracking-wider text-forest-dark">Location & Field Map</h3>
                      <div className="h-64 w-full">
                        <MapComponent lat={coordinates.latitude} lon={coordinates.longitude} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-8 rounded-[32px] bg-white border border-forest-medium/5 shadow-sm text-center space-y-6 flex flex-col items-center">
                    <span className="p-4 rounded-full bg-forest-light/10 text-forest-medium inline-block animate-pulse">
                      <Compass className="w-8 h-8" />
                    </span>
                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-forest-dark">Location Access Required</h3>
                      <p className="text-xs text-forest-medium/70 max-w-sm mx-auto leading-relaxed">
                        Code2Crop requires your farm location to fetch real-time local weather data, soil moisture levels, satellite indices, and personalized crop recommendations.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (position) => {
                              const coords = {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                              };
                              setCoordinates(coords);
                              fetchWeatherAndCrops(coords.latitude, coords.longitude);
                              
                              // If user is already logged in, sync coordinates to Firestore
                              const currentUser = auth.currentUser;
                              if (currentUser) {
                                syncUserProfile(currentUser.uid, currentUser.email || "", currentUser.displayName || "", currentUser.photoURL || "", undefined, coords);
                              }
                            },
                            (err) => {
                              alert("Location access denied. Please enable location permissions in your browser settings to continue.");
                            }
                          );
                        }
                      }}
                      className="text-xs font-bold bg-forest-medium text-white px-6 py-2.5 rounded-full hover:bg-forest-dark transition-all shadow-sm"
                    >
                      Enable Location
                    </button>
                  </div>
                )}
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
                    onClick={() => setActiveTab("chat")}
                    className="w-full p-4 rounded-2xl bg-white border border-forest-medium/5 hover:border-forest-light/20 flex justify-between items-center transition-all group shadow-sm text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-xl bg-forest-light/5 text-forest-medium">
                        <FileText className="w-5 h-5" />
                      </span>
                      <div>
                        <span className="text-xs font-bold block text-forest-dark">Scan Leaf in Chat</span>
                        <span className="text-[10px] text-forest-medium/40 block font-medium mt-0.5">Upload leaf photos for AI diagnosis in chat</span>
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
                {cropRec.map((crop, idx) => {
                  const isExpanded = expandedCrop === idx;

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
                          &quot;{crop.reason}&quot;
                        </p>

                        {/* Expandable Details container */}
                        <div className="pt-2">
                          <button
                            onClick={() => setExpandedCrop(isExpanded ? null : idx)}
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

          {activeTab === "chat" && (
            <div className="grid md:grid-cols-3 gap-8 items-start">
              {/* Chat Interface Column */}
              <div className="md:col-span-2 space-y-4">
                <div className="p-6 rounded-[32px] bg-white border border-forest-medium/5 shadow-md h-[540px] flex flex-col justify-between">
                  {/* Messages list */}
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[400px]">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[80%] ${msg.sender === "farmer" ? "ml-auto items-end" : "mr-auto items-start"
                          }`}
                      >
                        <div
                          className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed text-left ${msg.sender === "farmer"
                              ? "bg-forest-medium text-white rounded-tr-none"
                              : "bg-forest-light/5 text-forest-dark border border-forest-medium/5 rounded-tl-none"
                            }`}
                        >
                          {/* Inline image preview */}
                          {msg.imageUrl && (
                            <div className="mb-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={msg.imageUrl}
                                alt="Uploaded leaf"
                                className="w-full max-w-[200px] h-auto rounded-xl border border-white/20"
                              />
                            </div>
                          )}

                          {renderFormattedText(msg.text)}

                          {msg.sender === "ai" && (
                            <VoiceMessagePlayer
                              text={msg.text}
                              languageCode={userProfile?.language || "en"}
                            />
                          )}

                          {msg.translation && (
                            <span className="block text-[10px] opacity-75 border-t border-current/10 pt-1.5 mt-1.5 font-mono italic">
                              Translation: {msg.translation}
                            </span>
                          )}

                          {/* WhatsApp platform indicator */}
                          {msg.platform === "whatsapp" && (
                            <span className="inline-flex items-center gap-1 text-[9px] opacity-60 mt-1.5">
                              📱 via WhatsApp
                            </span>
                          )}
                        </div>

                        {/* Inline Disease Diagnosis Card */}
                        {msg.diseaseResult && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full mt-2.5 p-4 rounded-2xl bg-white border border-forest-medium/10 shadow-sm space-y-3 text-left"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-warning/10 text-amber-600 border border-amber-warning/20">
                                  DIAGNOSTIC RESULT
                                </span>
                                <h4 className="text-sm font-black text-forest-dark mt-1">{msg.diseaseResult.diseaseName}</h4>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[9px] text-forest-medium/40 block font-bold">Confidence</span>
                                <span className="text-xs font-extrabold text-danger-red block">
                                  {Math.round(msg.diseaseResult.confidence * 100)}%
                                </span>
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-forest-dark block">Treatment Actions</span>
                              <ul className="list-disc list-inside text-[11px] text-forest-medium/70 mt-1 space-y-0.5 font-medium">
                                {msg.diseaseResult.treatment.map((t, idx) => (
                                  <li key={idx}>{t}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Escalation warning */}
                            {msg.diseaseResult.confidence < 0.65 && (
                              <div className="p-3 rounded-xl bg-danger-red/5 border border-danger-red/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-danger-red shrink-0" />
                                  <span className="text-[10px] font-bold text-danger-red">
                                    AI Confidence below 65% — RSK escalation recommended
                                  </span>
                                </div>
                                <button
                                  onClick={() => escalateFromChat(msg.diseaseResult)}
                                  className="px-3 py-1.5 rounded-full bg-danger-red hover:bg-danger-red/90 text-white text-[10px] font-bold transition-all shadow-sm shrink-0"
                                >
                                  Escalate to RSK
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )}

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

                    {/* Scanning indicator */}
                    {isScanning && (
                      <div className="flex flex-col max-w-[80%] mr-auto items-start">
                        <div className="p-3.5 rounded-2xl bg-forest-light/5 border border-forest-medium/5 rounded-tl-none">
                          <div className="flex items-center gap-2 text-forest-medium font-bold text-[10px] uppercase tracking-widest">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-forest-medium" />
                            <span className="animate-pulse">AI Vision scanning leaf image...</span>
                          </div>
                          <div className="mt-2 h-1 w-32 rounded-full bg-forest-light/10 overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-google-blue via-ai-purple to-natural-green rounded-full"
                              animate={{ width: ["0%", "100%"] }}
                              transition={{ duration: 2.5, ease: "easeInOut" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pending image preview */}
                  <AnimatePresence>
                    {pendingImage && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="pt-3 flex items-center gap-3"
                      >
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={pendingImage}
                            alt="Pending upload"
                            className="w-16 h-16 rounded-xl object-cover border-2 border-forest-light/30"
                          />
                          <button
                            onClick={() => setPendingImage(null)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger-red text-white flex items-center justify-center shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[10px] text-forest-medium/50 font-bold">
                          📷 Leaf image ready — press Send to scan
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Input area */}
                  <ChatInputArea
                    onSendText={handleSendText}
                    onOpenVoice={() => setIsVoiceOpen(true)}
                    onSelectImageClick={() => fileInputRef.current?.click()}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
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
                      Use the microphone or upload a leaf image to see the real-time AI reasoning pipeline.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
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
                languageCode={userProfile?.language || "en"}
                onTranscriptComplete={handleVoiceNoteResult}
                onClose={() => setIsVoiceOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Platform Selection Modal (first-time visitors) */}
      {hasCheckedPlatform && (
        <PlatformSelectionModal
          isOpen={showPlatformModal}
          onSelectWebsite={handleSelectWebsite}
          onSelectWhatsApp={handleSelectWhatsApp}
          onClose={() => {
            setShowPlatformModal(false);
            if (!platform) {
              window.location.href = "/";
            }
          }}
        />
      )}

      {/* Phone Link Modal */}
      <AnimatePresence>
        {showPhoneModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-[32px] w-full max-w-md border border-forest-medium/10 shadow-xl space-y-4 text-center"
            >
              <h3 className="text-lg font-black text-forest-dark">Link WhatsApp Phone Number</h3>
              <p className="text-xs text-forest-medium/70 leading-relaxed font-semibold">
                To sync your WhatsApp chat history with this website account, please enter your WhatsApp phone number with country code (e.g. +919876543210).
              </p>
              <input
                type="tel"
                placeholder="+919876543210"
                value={inputPhone}
                onChange={(e) => setInputPhone(e.target.value)}
                className="w-full text-xs font-bold px-4 py-3 rounded-full border border-forest-medium/10 outline-none text-center"
              />
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={async () => {
                    if (firebaseUser && inputPhone.trim()) {
                      await syncUserProfile(firebaseUser.uid, firebaseUser.email || "", firebaseUser.displayName || "", firebaseUser.photoURL || "", inputPhone.trim());
                      setShowPhoneModal(false);
                    }
                  }}
                  className="px-6 py-2.5 rounded-full bg-forest-medium text-white hover:bg-forest-dark text-xs font-bold shadow-md transition-all"
                >
                  Link & Sync
                </button>
                <button
                  onClick={() => setShowPhoneModal(false)}
                  className="px-6 py-2.5 rounded-full bg-forest-light/10 text-forest-medium hover:bg-forest-light/20 text-xs font-bold transition-all"
                >
                  Skip
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Setup Onboarding Modal */}
      <AnimatePresence>
        {showSetupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-8 rounded-[32px] w-full max-w-md border border-forest-medium/10 shadow-xl space-y-6 text-left"
            >
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-forest-dark">{t("setupTitle")}</h3>
                <p className="text-xs text-forest-medium/70 leading-relaxed font-semibold">
                  {t("setupDesc")}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-forest-medium/60 uppercase tracking-wider block">
                    {t("usernameLabel")}
                  </label>
                  <input
                    type="text"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    className="w-full text-xs font-bold px-4 py-3 rounded-full border border-forest-medium/15 outline-none bg-forest-light/5 text-forest-dark"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-forest-medium/60 uppercase tracking-wider block">
                    {t("langLabel")}
                  </label>
                  <select
                    value={setupLanguage}
                    onChange={(e) => setSetupLanguage(e.target.value)}
                    className="w-full text-xs font-bold px-4 py-3 rounded-full border border-forest-medium/15 outline-none bg-white text-forest-dark appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%231C3F24' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem', backgroundRepeat: 'no-repeat' }}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={async () => {
                  if (setupName.trim()) {
                    await updateProfileSettings(setupName.trim(), setupLanguage);
                  }
                }}
                className="w-full py-3 rounded-full bg-forest-medium text-white hover:bg-forest-dark text-xs font-bold shadow-md transition-all text-center block"
              >
                {t("saveAndContinue")}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
