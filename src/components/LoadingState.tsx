"use client";

export type AuditStep = "geocoding" | "fetching" | "analyzing" | "generating" | "done";

const STEPS: { id: AuditStep; label: string; sublabel: string; icon: React.ReactNode }[] = [
  {
    id: "geocoding",
    label: "Locating address…",
    sublabel: "Geocoding via OpenStreetMap Nominatim",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    id: "fetching",
    label: "Capturing street views…",
    sublabel: "Fetching N / E / S / W imagery from Google",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    id: "analyzing",
    label: "Analyzing accessibility…",
    sublabel: "Running NVIDIA Nemotron vision model on each image",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: "generating",
    label: "Generating report…",
    sublabel: "Synthesizing findings with Nemotron Super",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

const STEP_ORDER: AuditStep[] = ["geocoding", "fetching", "analyzing", "generating", "done"];

function stepStatus(stepId: AuditStep, current: AuditStep): "pending" | "active" | "done" {
  const si = STEP_ORDER.indexOf(stepId);
  const ci = STEP_ORDER.indexOf(current);
  if (ci > si) return "done";
  if (ci === si) return "active";
  return "pending";
}

export default function LoadingState({ currentStep }: { currentStep: AuditStep }) {
  return (
    <div className="w-full max-w-sm mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Audit in progress</p>
          <p className="text-xs text-gray-500">This usually takes 30–60 seconds</p>
        </div>
      </div>

      {/* Steps */}
      <ol className="space-y-0">
        {STEPS.map((step, idx) => {
          const status = stepStatus(step.id, currentStep);
          const isLast = idx === STEPS.length - 1;
          return (
            <li key={step.id} className="flex gap-3">
              {/* Icon + connector */}
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500",
                    status === "done" ? "bg-green-100 text-green-600" : "",
                    status === "active" ? "bg-blue-100 text-blue-600 ring-2 ring-blue-200" : "",
                    status === "pending" ? "bg-gray-100 text-gray-400" : "",
                  ].join(" ")}
                >
                  {status === "done" ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : status === "active" ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </div>
                {!isLast && (
                  <div
                    className={[
                      "w-px flex-1 my-1 min-h-[20px] transition-colors duration-500",
                      status === "done" ? "bg-green-200" : "bg-gray-200",
                    ].join(" ")}
                  />
                )}
              </div>

              {/* Text */}
              <div className={`pb-5 ${isLast ? "pb-0" : ""}`}>
                <p
                  className={[
                    "text-sm font-medium transition-colors duration-300",
                    status === "done" ? "text-green-700" : "",
                    status === "active" ? "text-blue-700" : "",
                    status === "pending" ? "text-gray-400" : "",
                  ].join(" ")}
                >
                  {step.label}
                </p>
                <p
                  className={[
                    "text-xs transition-colors duration-300",
                    status === "active" ? "text-gray-500" : "text-gray-300",
                  ].join(" ")}
                >
                  {step.sublabel}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
