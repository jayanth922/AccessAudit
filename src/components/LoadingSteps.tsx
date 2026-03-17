"use client";

import { CheckCircle, Circle, Loader2, MapPin, Camera, Brain, FileText } from "lucide-react";

export type Step = "geocoding" | "fetching" | "analyzing" | "synthesizing" | "done";

const STEPS: { id: Step; label: string; sublabel: string; icon: React.ReactNode }[] = [
  {
    id: "geocoding",
    label: "Geocoding Address",
    sublabel: "Locating coordinates via Nominatim",
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    id: "fetching",
    label: "Fetching Street View",
    sublabel: "Capturing N / E / S / W imagery",
    icon: <Camera className="w-4 h-4" />,
  },
  {
    id: "analyzing",
    label: "AI Vision Analysis",
    sublabel: "Running NVIDIA Nemotron vision model",
    icon: <Brain className="w-4 h-4" />,
  },
  {
    id: "synthesizing",
    label: "Generating Report",
    sublabel: "Synthesizing findings into accessibility score",
    icon: <FileText className="w-4 h-4" />,
  },
];

const STEP_ORDER: Step[] = ["geocoding", "fetching", "analyzing", "synthesizing", "done"];

function getStepStatus(stepId: Step, current: Step): "pending" | "active" | "done" {
  const stepIdx = STEP_ORDER.indexOf(stepId);
  const currentIdx = STEP_ORDER.indexOf(current);
  if (currentIdx > stepIdx) return "done";
  if (currentIdx === stepIdx) return "active";
  return "pending";
}

interface LoadingStepsProps {
  currentStep: Step;
}

export default function LoadingSteps({ currentStep }: LoadingStepsProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Auditing in progress</h3>
            <p className="text-xs text-slate-500">Please wait, this may take 30–60 seconds</p>
          </div>
        </div>

        <div className="space-y-3">
          {STEPS.map((step, idx) => {
            const status = getStepStatus(step.id, currentStep);
            return (
              <div key={step.id} className="flex items-start gap-3">
                {/* Connector line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500
                      ${status === "done" ? "bg-emerald-500/20 text-emerald-400" : ""}
                      ${status === "active" ? "bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/40" : ""}
                      ${status === "pending" ? "bg-slate-800 text-slate-600" : ""}
                    `}
                  >
                    {status === "done" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : status === "active" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`w-px h-4 mt-1 transition-all duration-500 ${
                        status === "done" ? "bg-emerald-500/40" : "bg-slate-700"
                      }`}
                    />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 pb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        status === "done"
                          ? "text-emerald-400"
                          : status === "active"
                          ? "text-blue-400"
                          : "text-slate-600"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className={`transition-colors duration-300 ${
                      status === "active" ? "text-blue-500" : "text-transparent"
                    }`}>
                      {step.icon}
                    </span>
                  </div>
                  <p
                    className={`text-xs transition-colors duration-300 ${
                      status === "active" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    {step.sublabel}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
