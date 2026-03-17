"use client";

import { useState } from "react";

interface ImageGridProps {
  images: string[]; // base64 data URLs, order: N, E, S, W
}

const DIRECTION_LABELS = ["North", "East", "South", "West"];
const DIRECTION_SHORT = ["N", "E", "S", "W"];

export default function ImageGrid({ images }: ImageGridProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <>
      <div>
        <h2 className="text-lg font-bold text-slate-200 mb-4">Street View Imagery</h2>
        <div className="grid grid-cols-2 gap-3">
          {images.map((src, idx) => (
            <button
              key={idx}
              onClick={() => setExpandedIndex(idx)}
              className="relative group rounded-xl overflow-hidden bg-slate-800 aspect-video focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {/* Direction badge */}
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-xs font-bold text-white">
                  {DIRECTION_SHORT[idx]} · {DIRECTION_LABELS[idx]}
                </span>
              </div>

              {/* Expand hint */}
              <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors duration-200 flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-white bg-black/50 px-2 py-1 rounded-full">
                  Click to expand
                </span>
              </div>

              {/* Image */}
              <img
                src={src}
                alt={`Street view facing ${DIRECTION_LABELS[idx]}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {expandedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setExpandedIndex(null)}
        >
          <div
            className="relative max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 text-xs font-black">
                  {DIRECTION_SHORT[expandedIndex]}
                </span>
                {DIRECTION_LABELS[expandedIndex]} View
              </span>
              <button
                onClick={() => setExpandedIndex(null)}
                className="text-white/70 hover:text-white text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                ×
              </button>
            </div>

            <img
              src={images[expandedIndex]}
              alt={`Street view facing ${DIRECTION_LABELS[expandedIndex]}`}
              className="w-full h-auto"
            />

            {/* Navigation */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setExpandedIndex(i)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                    i === expandedIndex
                      ? "bg-blue-500 text-white"
                      : "bg-black/50 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {DIRECTION_SHORT[i]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
