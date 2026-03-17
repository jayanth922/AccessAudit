"use client";

interface ScoreBadgeProps {
  score: number;
  grade: string;
  confidence: number;
}

function getGradeColors(grade: string) {
  switch (grade.toUpperCase()) {
    case "A":
      return {
        ring: "ring-emerald-500/40",
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        glow: "shadow-emerald-500/20",
        bar: "bg-emerald-500",
        label: "Excellent",
      };
    case "B":
      return {
        ring: "ring-lime-500/40",
        bg: "bg-lime-500/10",
        text: "text-lime-400",
        glow: "shadow-lime-500/20",
        bar: "bg-lime-500",
        label: "Good",
      };
    case "C":
      return {
        ring: "ring-yellow-500/40",
        bg: "bg-yellow-500/10",
        text: "text-yellow-400",
        glow: "shadow-yellow-500/20",
        bar: "bg-yellow-500",
        label: "Fair",
      };
    case "D":
      return {
        ring: "ring-orange-500/40",
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        glow: "shadow-orange-500/20",
        bar: "bg-orange-500",
        label: "Poor",
      };
    case "F":
    default:
      return {
        ring: "ring-red-500/40",
        bg: "bg-red-500/10",
        text: "text-red-400",
        glow: "shadow-red-500/20",
        bar: "bg-red-500",
        label: "Critical",
      };
  }
}

export default function ScoreBadge({ score, grade, confidence }: ScoreBadgeProps) {
  const colors = getGradeColors(grade);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Grade circle */}
      <div
        className={`
          relative flex-shrink-0 w-28 h-28 rounded-full flex flex-col items-center justify-center
          ring-4 ${colors.ring} ${colors.bg} shadow-xl ${colors.glow}
        `}
      >
        <span className={`text-5xl font-black ${colors.text}`}>{grade}</span>
        <span className="text-xs text-slate-500 font-medium mt-0.5">Grade</span>
      </div>

      {/* Score details */}
      <div className="flex-1 w-full">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className={`text-4xl font-black ${colors.text}`}>{score}</span>
            <span className="text-slate-500 text-lg font-medium">/100</span>
          </div>
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full ${colors.bg} ${colors.text} border border-current/20`}
          >
            {colors.label}
          </span>
        </div>

        {/* Score bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${colors.bar}`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Confidence */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Model confidence:</span>
          <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.round(confidence * 100)}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
