"use client";

import { FormEvent } from "react";

interface SearchBarProps {
  address: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  loading: boolean;
}

export default function SearchBar({ address, onChange, onSubmit, loading }: SearchBarProps) {
  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          {/* Wheelchair icon */}
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="4" r="1" />
            <path d="M9 9h4l2 6h2" />
            <path d="M9 9l-2 7" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="17" cy="18" r="2" />
          </svg>
          <input
            type="text"
            value={address}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter an address or place name (e.g. San Jose City Hall)"
            disabled={loading}
            autoComplete="off"
            className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 disabled:bg-gray-50 text-sm shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="flex items-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition whitespace-nowrap text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Auditing…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Audit
            </>
          )}
        </button>
      </div>
    </form>
  );
}
