"use client";

import { AccessibilityFinding } from "@/lib/types";

const SEVERITY_STYLES: Record<
  AccessibilityFinding["severity"],
  { badge: string; border: string; bg: string; dot: string }
> = {
  critical: {
    badge: "bg-red-100 text-red-700 border-red-200",
    border: "border-red-200",
    bg: "bg-red-50",
    dot: "bg-red-500",
  },
  major: {
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    border: "border-orange-200",
    bg: "bg-orange-50",
    dot: "bg-orange-500",
  },
  minor: {
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
    border: "border-yellow-200",
    bg: "bg-yellow-50",
    dot: "bg-yellow-400",
  },
  positive: {
    badge: "bg-green-100 text-green-700 border-green-200",
    border: "border-green-200",
    bg: "bg-green-50",
    dot: "bg-green-500",
  },
};

interface FindingCardProps {
  finding: AccessibilityFinding;
}

export default function FindingCard({ finding }: FindingCardProps) {
  const s = SEVERITY_STYLES[finding.severity];

  return (
    <div className={`border ${s.border} ${s.bg} rounded-xl p-4`}>
      <div className="flex flex-wrap items-start gap-2 mb-2">
        {/* Severity badge */}
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)}
        </span>

        {/* Category tag */}
        <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-full font-medium capitalize">
          {finding.category}
        </span>

        {/* Direction */}
        <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-full font-medium ml-auto">
          {finding.direction}
        </span>
      </div>

      {/* Issue title */}
      <p className="text-sm font-semibold text-gray-800 mb-1">{finding.issue}</p>

      {/* Description */}
      <p className="text-sm text-gray-600 leading-relaxed">{finding.description}</p>
    </div>
  );
}
