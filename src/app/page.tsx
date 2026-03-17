"use client";

import { useState, useRef, FormEvent } from "react";
import SearchBar from "@/components/SearchBar";
import LoadingState, { AuditStep } from "@/components/LoadingState";
import AuditReport from "@/components/AuditReport";
import { AuditReport as AuditReportType } from "@/lib/types";

// Simulate loading step progression while the real request is in-flight
function useStepSimulator() {
  const [step, setStep] = useState<AuditStep>("geocoding");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function start() {
    setStep("geocoding");
    timers.current.push(setTimeout(() => setStep("fetching"),   2000));
    timers.current.push(setTimeout(() => setStep("analyzing"),  7000));
    timers.current.push(setTimeout(() => setStep("generating"), 45000));
  }

  function finish() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStep("done");
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStep("geocoding");
  }

  return { step, start, finish, reset };
}

const EXAMPLE_ADDRESSES = [
  "San Jose City Hall, San Jose, CA",
  "SJSU Student Union, San Jose, CA",
  "Ferry Building, San Francisco, CA",
];

export default function Home() {
  const [address, setAddress]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<AuditReportType | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const { step, start, finish, reset } = useStepSimulator();
  const resultsRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!address.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setError(null);
    start();

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const data = await res.json();
      finish();

      if (!res.ok) {
        setError(data.error ?? "An unexpected error occurred.");
      } else {
        setResult(data as AuditReportType);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch (err) {
      finish();
      setError("Network error: " + (err as Error).message);
    } finally {
      setLoading(false);
      reset();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Nav bar ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo mark */}
          <svg className="w-7 h-7 text-blue-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
            <path d="M9 8h5l2.5 7H19" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 8l-2 8" strokeLinecap="round" />
            <circle cx="7"  cy="18" r="2" />
            <circle cx="17" cy="18" r="2" />
          </svg>
          <span className="font-bold text-gray-900 text-lg tracking-tight">
            Access<span className="text-blue-600">Audit</span>
          </span>
          <span className="ml-auto text-xs text-gray-400 hidden sm:block">
            Powered by NVIDIA Nemotron · OpenStreetMap
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 sm:py-16">
        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        {!result && (
          <div className="text-center mb-10 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-3 tracking-tight leading-tight">
              Is it accessible?<br className="hidden sm:block" />{" "}
              <span className="text-blue-600">Find out in seconds.</span>
            </h1>
            <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
              AccessAudit uses AI vision to analyze any location for wheelchair accessibility — sidewalks, ramps, curb cuts, obstacles, and more.
            </p>
          </div>
        )}

        {/* ── Search bar ─────────────────────────────────────────────────────── */}
        <div className="mb-4">
          <SearchBar
            address={address}
            onChange={setAddress}
            onSubmit={handleSubmit}
            loading={loading}
          />

          {/* Example addresses */}
          {!loading && !result && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs text-gray-400">Try:</span>
              {EXAMPLE_ADDRESSES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setAddress(ex)}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Loading ────────────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex justify-center my-10 animate-fade-in">
            <LoadingState currentStep={step} />
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="my-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-slide-up">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-700 mb-0.5">Audit failed</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Results ────────────────────────────────────────────────────────── */}
        {result && !loading && (
          <div ref={resultsRef} className="animate-slide-up">
            {/* Result header row */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                Results for <span className="font-semibold text-gray-700">{address}</span>
              </p>
              <button
                onClick={() => { setResult(null); setError(null); setAddress(""); }}
                className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 px-3 py-1.5 rounded-full transition-colors"
              >
                New audit
              </button>
            </div>
            <AuditReport report={result} />
          </div>
        )}

        {/* ── Feature cards (idle state) ─────────────────────────────────────── */}
        {!result && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 animate-fade-in">
            {[
              {
                icon: (
                  <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                ),
                title: "Street-Level Vision",
                desc: "Captures Google Street View imagery in all four cardinal directions for comprehensive 360° coverage.",
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ),
                title: "NVIDIA Nemotron AI",
                desc: "Each image is analyzed by the Nemotron vision model for sidewalks, ramps, curb cuts, and obstacles.",
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                ),
                title: "Scored A–F Report",
                desc: "All findings are synthesized into a prioritized accessibility score with actionable recommendations.",
              },
            ].map((card) => (
              <div key={card.title} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                  {card.icon}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{card.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
