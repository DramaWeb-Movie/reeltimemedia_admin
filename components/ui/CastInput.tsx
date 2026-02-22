"use client";

import { useState, useCallback } from "react";

interface CastInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CastInput({ label = "Cast", value, onChange, placeholder = "Actor name" }: CastInputProps) {
  const [inputValue, setInputValue] = useState("");
  const castList = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const addCast = useCallback(() => {
    const name = inputValue.trim();
    if (!name) return;
    const next = castList.includes(name) ? castList : [...castList, name];
    onChange(next.join(", "));
    setInputValue("");
  }, [inputValue, castList, onChange]);

  const removeCast = useCallback(
    (index: number) => {
      const next = castList.filter((_, i) => i !== index);
      onChange(next.join(", "));
    },
    [castList, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCast();
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
        />
        <button
          type="button"
          onClick={addCast}
          disabled={!inputValue.trim()}
          className="h-10 px-4 rounded-lg bg-red-500 text-white font-medium text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>
      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-500">Type a name and click Add, or press Enter</p>
      {castList.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {castList.map((name, index) => (
            <span
              key={`${name}-${index}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            >
              {name}
              <button
                type="button"
                onClick={() => removeCast(index)}
                className="ml-0.5 text-slate-500 hover:text-red-500 transition-colors"
                aria-label={`Remove ${name}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
