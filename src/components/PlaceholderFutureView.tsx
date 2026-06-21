import React from "react";
import { Camera, Bot, Cpu, QrCode, Sliders, Smartphone, CreditCard, MessageSquare, Fingerprint } from "lucide-react";

interface ModuleConfig {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  tagline: string;
  description: string;
}

const FUTURE_MODULES: ModuleConfig[] = [
  {
    id: "camera",
    name: "Camera Attendance (v2.0)",
    icon: Camera,
    tagline: "Computer Vision Turnstile Entry",
    description: "Plug-and-play local webcam support with lightweight edge models. Instantly validates member faces, audits active memberships, and registers check-ins within 200ms."
  },
  {
    id: "ai-workout",
    name: "AI Workout Generator",
    icon: Bot,
    tagline: "Gemini Pro Gym Routine Engine",
    description: "Enter a member's target goals (e.g. powerlifting, aesthetic cut, injury rehab) and generate a completely personalized 6-week progressive exercise matrix with exact sets, weights, and tempos."
  },
  {
    id: "ai-diet",
    name: "AI Diet Planner",
    icon: Cpu,
    tagline: "Calorie & Macronutrient Optimizer",
    description: "Autogenerates perfect meal layouts mapped directly to age, BMI, and daily calorie targets. Recommends local protein-rich grocery variations and schedules water reminders."
  },
  {
    id: "ai-analytics",
    name: "AI Attendance Analytics",
    icon: Sliders,
    tagline: "Predictive Churn Risk Tracker",
    description: "Flags members showing sudden declines in weekly workouts, alerting retention staff to trigger personalized follow-ups or special offers before plans lapse."
  },
  {
    id: "qr",
    name: "QR Attendance Codes",
    icon: QrCode,
    tagline: "Instant Mobile Scan-In Portal",
    description: "Generates high-contrast dynamic QR cards directly inside the member portal, allowing self scan-in at front desk scanner tablets for hands-free reception."
  },
  {
    id: "biometric",
    name: "Biometric & Fingerprint Hub",
    icon: Fingerprint,
    tagline: "Hardware Integration SDK",
    description: "Direct serial port SDK support. Syncs on-premise biometric scanners directly into your SQL backend, eliminating staff proxy check-ins completely."
  },
  {
    id: "payments",
    name: "Auto Payment Gateways",
    icon: CreditCard,
    tagline: "Stripe & UPI Auto-Deduct Subscriptions",
    description: "Automate recurring membership charges via safe credit card holds or static dynamic UPI codes, updating cash ledgers and emailing receipts with zero clicks."
  },
  {
    id: "whatsapp",
    name: "WhatsApp Broadcast Integration",
    icon: MessageSquare,
    tagline: "Direct SMS & WhatsApp Alerts",
    description: "Triggers auto-reminders three days prior to membership expiry, pushes pending fee alerts, sends automated anniversary or birthday messages, and broadcasts gym updates."
  }
];

export default function PlaceholderFutureView() {
  return (
    <div className="text-gray-100 space-y-6">
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span className="w-2.5 h-6 bg-amber-500 rounded-full inline-block"></span>
          Future-Ready Innovation Deck
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Explore architectural placeholders designed for rapid modular extension. These next-gen systems can be plugged in seamlessly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {FUTURE_MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <div 
              key={mod.id} 
              className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 hover:border-amber-500/50 transition-all duration-300 group hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] relative overflow-hidden"
              id={`future-card-${mod.id}`}
            >
              <div className="absolute top-0 right-0 py-1.5 px-3 bg-amber-500/10 text-amber-500 text-[10px] uppercase font-bold tracking-wider rounded-bl-xl border-l border-b border-amber-500/20">
                Coming Soon
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-zinc-850 border border-zinc-800 rounded-xl text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all duration-300">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-1 pr-14">
                  <h3 className="text-lg font-semibold text-white group-hover:text-amber-500 transition-colors">
                    {mod.name}
                  </h3>
                  <span className="inline-block text-xs text-amber-500/80 font-medium font-mono">
                    {mod.tagline}
                  </span>
                  <p className="text-sm text-zinc-400 leading-relaxed pt-2">
                    {mod.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
