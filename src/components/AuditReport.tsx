"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AuditReport as AuditReportType } from "@/lib/types";
import AccessibilityScore from "./AccessibilityScore";
import FindingCard from "./FindingCard";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

function dirAbbrev(direction: string): string {
  const abbrevs: Record<string, string> = {
    North: "N", Northeast: "NE", East: "E", Southeast: "SE",
    South: "S", Southwest: "SW", West: "W", Northwest: "NW",
    Front: "F", Rear: "R",
  };
  const first = direction.split(" ")[0];
  return abbrevs[first] ?? first.slice(0, 2).toUpperCase();
}

const SEVERITY_ORDER = ["critical", "major", "minor", "positive"] as const;

const SEVERITY_HEADING_STYLES = {
  critical: "text-red-600",
  major:    "text-orange-600",
  minor:    "text-yellow-600",
  positive: "text-green-600",
};

interface Props {
  report: AuditReportType;
}

export default function AuditReport({ report }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const grouped = SEVERITY_ORDER.reduce(
    (acc, sev) => {
      acc[sev] = report.findings.filter((f) => f.severity === sev);
      return acc;
    },
    {} as Record<string, typeof report.findings>
  );

  const severityCounts = {
    critical: grouped.critical.length,
    major:    grouped.major.length,
    minor:    grouped.minor.length,
    positive: grouped.positive.length,
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Location + Map ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Location info */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Audited location</p>
            <h2 className="text-base font-bold text-gray-900 leading-snug">
              {report.location.displayName}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {report.location.lat.toFixed(5)}, {report.location.lng.toFixed(5)}
            </p>
          </div>

          {/* Severity summary tiles */}
          <div className="grid grid-cols-2 gap-2 mt-auto">
            {(["critical", "major", "minor", "positive"] as const).map((sev) => (
              <div
                key={sev}
                className={`rounded-xl p-3 text-center border ${
                  sev === "critical" ? "bg-red-50 border-red-100" :
                  sev === "major"    ? "bg-orange-50 border-orange-100" :
                  sev === "minor"    ? "bg-yellow-50 border-yellow-100" :
                                       "bg-green-50 border-green-100"
                }`}
              >
                <div
                  className={`text-2xl font-black ${
                    sev === "critical" ? "text-red-600" :
                    sev === "major"    ? "text-orange-600" :
                    sev === "minor"    ? "text-yellow-600" :
                                         "text-green-600"
                  }`}
                >
                  {severityCounts[sev]}
                </div>
                <div className="text-xs font-medium text-gray-500 capitalize">{sev}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm" style={{ minHeight: 260 }}>
          <MapView
            lat={report.location.lat}
            lng={report.location.lng}
            address={report.location.displayName}
          />
        </div>
      </div>

      {/* ── 2. Score ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <AccessibilityScore score={report.overallScore} grade={report.grade} />
        {report.summary && (
          <p className="mt-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
            {report.summary}
          </p>
        )}
      </div>

      {/* ── 3. Street View 2×2 grid ──────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Street View Imagery</h3>
        <div className="grid grid-cols-2 gap-3">
          {report.streetViewImages.map((img, idx) => (
            <button
              key={img.direction}
              onClick={() => setLightboxIdx(idx)}
              className="relative group aspect-video rounded-xl overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {/* Direction label */}
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/55 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <span className="text-xs font-bold text-white">
                  {img.direction}
                </span>
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white bg-black/50 px-2 py-1 rounded-full">
                  Expand
                </span>
              </div>
              <img
                src={`data:image/jpeg;base64,${img.base64}`}
                alt={`Street view: ${img.direction}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Findings grouped by severity ──────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          Findings
          <span className="ml-2 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {report.findings.length} total
          </span>
        </h3>
        <div className="space-y-6">
          {SEVERITY_ORDER.map((sev) => {
            const items = grouped[sev];
            if (!items.length) return null;
            return (
              <div key={sev}>
                <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${SEVERITY_HEADING_STYLES[sev]}`}>
                  {sev} ({items.length})
                </p>
                <div className="space-y-2">
                  {items.map((finding, i) => (
                    <FindingCard key={i} finding={finding} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5. Recommendations ───────────────────────────────────────────────── */}
      {report.recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Recommendations
          </h3>
          <ol className="space-y-2.5">
            {report.recommendations.map((rec, i) => (
              <li
                key={i}
                className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-center text-xs text-gray-400 pb-4">
        AI-generated report using NVIDIA Nemotron models. Verify results with a certified accessibility professional.
      </p>

      {/* ── Lightbox ─────────────────────────────────────────────────────────── */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <div
            className="relative max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
              <span className="text-sm font-bold text-white">
                {report.streetViewImages[lightboxIdx].direction}
              </span>
              <button
                onClick={() => setLightboxIdx(null)}
                className="text-white/70 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-xl font-light"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <img
              src={`data:image/jpeg;base64,${report.streetViewImages[lightboxIdx].base64}`}
              alt={`Street view: ${report.streetViewImages[lightboxIdx].direction}`}
              className="w-full h-auto"
            />
            {/* Thumbnail nav */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {report.streetViewImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIdx(i)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                    i === lightboxIdx
                      ? "bg-blue-600 text-white"
                      : "bg-black/50 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {dirAbbrev(img.direction)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
