"use client";

import { getGrade } from "@/lib/grade";

interface AccessibilityScoreProps {
  score: number;
  grade: string; // ignored — grade is always derived from score
}

const GRADE_CONFIG: Record<string, { color: string; bg: string; ring: string; bar: string; label: string }> = {
  A: { color: "#22c55e", bg: "bg-green-50",  ring: "ring-green-300",  bar: "bg-green-500",  label: "Excellent" },
  B: { color: "#3b82f6", bg: "bg-blue-50",   ring: "ring-blue-300",   bar: "bg-blue-500",   label: "Good"      },
  C: { color: "#eab308", bg: "bg-yellow-50", ring: "ring-yellow-300", bar: "bg-yellow-400", label: "Fair"      },
  D: { color: "#f97316", bg: "bg-orange-50", ring: "ring-orange-300", bar: "bg-orange-500", label: "Poor"      },
  F: { color: "#ef4444", bg: "bg-red-50",    ring: "ring-red-300",    bar: "bg-red-500",    label: "Critical"  },
};

export default function AccessibilityScore({ score }: AccessibilityScoreProps) {
  const derivedGrade = getGrade(score);
  const cfg = GRADE_CONFIG[derivedGrade];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Grade circle */}
      <div
        className={`flex-shrink-0 w-28 h-28 rounded-full flex flex-col items-center justify-center ring-4 ${cfg.ring} ${cfg.bg} shadow-sm`}
      >
        <span className="text-5xl font-black" style={{ color: cfg.color }}>
          {derivedGrade}
        </span>
        <span className="text-xs text-gray-400 font-medium mt-0.5">Grade</span>
      </div>

      {/* Score bar */}
      <div className="flex-1 w-full">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-4xl font-black text-gray-900">{score}</span>
            <span className="text-gray-400 text-lg font-medium">/100</span>
          </div>
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{
              background: cfg.color + "18",
              color: cfg.color,
            }}
          >
            {cfg.label}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${cfg.bar}`}
            style={{ width: `${Math.max(2, score)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-gray-400">
          <span>0 — Inaccessible</span>
          <span>100 — Fully accessible</span>
        </div>
      </div>
    </div>
  );
}
