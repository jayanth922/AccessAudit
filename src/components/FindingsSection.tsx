"use client";

import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";

type Severity = "critical" | "major" | "minor" | "positive";

interface Finding {
  direction: string;
  severity: Severity;
  description: string;
}

interface FindingsSectionProps {
  findings: Finding[];
}

const SEVERITY_CONFIG: Record<
  Severity,
  {
    label: string;
    icon: React.ReactNode;
    bg: string;
    border: string;
    text: string;
    badge: string;
  }
> = {
  critical: {
    label: "Critical",
    icon: <AlertCircle className="w-4 h-4" />,
    bg: "bg-red-950/40",
    border: "border-red-800/50",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  major: {
    label: "Major",
    icon: <AlertTriangle className="w-4 h-4" />,
    bg: "bg-orange-950/40",
    border: "border-orange-800/50",
    text: "text-orange-400",
    badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  minor: {
    label: "Minor",
    icon: <Info className="w-4 h-4" />,
    bg: "bg-yellow-950/30",
    border: "border-yellow-800/40",
    text: "text-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  positive: {
    label: "Positive",
    icon: <CheckCircle className="w-4 h-4" />,
    bg: "bg-emerald-950/30",
    border: "border-emerald-800/40",
    text: "text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
};

const SEVERITY_ORDER: Severity[] = ["critical", "major", "minor", "positive"];

const DIRECTION_LABELS: Record<string, string> = {
  N: "North",
  E: "East",
  S: "South",
  W: "West",
};

export default function FindingsSection({ findings }: FindingsSectionProps) {
  const grouped = SEVERITY_ORDER.reduce(
    (acc, sev) => {
      acc[sev] = findings.filter((f) => f.severity === sev);
      return acc;
    },
    {} as Record<Severity, Finding[]>
  );

  const totalFindings = findings.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-200">Findings</h2>
        <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
          {totalFindings} total
        </span>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {SEVERITY_ORDER.map((sev) => {
          const cfg = SEVERITY_CONFIG[sev];
          const count = grouped[sev].length;
          return (
            <div
              key={sev}
              className={`rounded-xl p-3 border text-center ${cfg.bg} ${cfg.border}`}
            >
              <div className={`text-2xl font-black ${cfg.text}`}>{count}</div>
              <div className={`text-xs font-medium ${cfg.text} opacity-80`}>{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Findings list grouped by severity */}
      <div className="space-y-4">
        {SEVERITY_ORDER.map((sev) => {
          const items = grouped[sev];
          if (items.length === 0) return null;
          const cfg = SEVERITY_CONFIG[sev];
          return (
            <div key={sev}>
              <div className={`flex items-center gap-2 mb-2 ${cfg.text}`}>
                {cfg.icon}
                <span className="text-sm font-semibold">{cfg.label} Issues</span>
              </div>
              <div className="space-y-2">
                {items.map((finding, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3.5 ${cfg.bg} ${cfg.border}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded border ${cfg.badge}`}
                      >
                        {DIRECTION_LABELS[finding.direction] || finding.direction}
                      </span>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {finding.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
