"use client";

import { useState, useCallback } from "react";
import { GENRE_OPTIONS } from "@/lib/constants/genres";
import { isCanonicalGenre, normalizeGenreLabel } from "@/lib/genre-utils";

type GenreMultiSelectProps = {
  label?: string;
  value: string[];
  onChange: (next: string[]) => void;
  hint?: string;
};

function splitCustomInput(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => normalizeGenreLabel(s))
    .filter(Boolean);
}

export function GenreMultiSelect({ label = "Genres", value, onChange, hint }: GenreMultiSelectProps) {
  const [customDraft, setCustomDraft] = useState("");

  const toggle = (genre: string) => {
    if (value.includes(genre)) {
      onChange(value.filter((g) => g !== genre));
    } else {
      onChange([...value, genre]);
    }
  };

  const addCustomGenres = useCallback(() => {
    const parts = splitCustomInput(customDraft);
    if (parts.length === 0) return;
    const seen = new Set(value.map((g) => normalizeGenreLabel(g).toLowerCase()));
    const next = [...value];
    for (const p of parts) {
      const key = p.toLowerCase();
      if (!p || seen.has(key)) continue;
      seen.add(key);
      next.push(p);
    }
    onChange(next);
    setCustomDraft("");
  }, [customDraft, value, onChange]);

  const remove = (g: string) => {
    onChange(value.filter((x) => x !== g));
  };

  const customSelected = value.filter((g) => !isCanonicalGenre(g));
  const id = "genres-multi";

  return (
    <div className="w-full space-y-3">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor={id}>
        {label}
      </label>
      {hint ? <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1 mb-1">{hint}</p> : null}

      <fieldset id={id} className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-3 sm:p-4">
        <legend className="sr-only">{label} — preset list</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 sm:max-h-none overflow-y-auto sm:overflow-visible pr-1">
          {GENRE_OPTIONS.map(({ value: g, label: text }) => {
            const checked = value.includes(g);
            return (
              <label
                key={g}
                className={`flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  checked
                    ? "bg-red-500/15 text-red-800 dark:text-red-200 border border-red-500/30"
                    : "border border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(g)}
                  className="rounded border-slate-300 dark:border-slate-600 text-red-600 focus:ring-red-500/50 shrink-0"
                />
                <span className="truncate">{text}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-800/30 p-3 sm:p-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Add your own</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          Type a genre and press Add, or paste several separated by commas (e.g.{" "}
          <span className="font-mono text-[11px]">Biopic, Khmer cinema</span>).
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomGenres();
              }
            }}
            placeholder="e.g. Sports documentary"
            className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
          />
          <button
            type="button"
            onClick={addCustomGenres}
            className="h-10 px-4 rounded-lg text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shrink-0"
          >
            Add
          </button>
        </div>
        {customSelected.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {customSelected.map((g) => (
              <span
                key={g}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 text-amber-900 dark:text-amber-100 text-xs border border-amber-500/25"
              >
                <span className="max-w-[14rem] truncate">{g}</span>
                <button
                  type="button"
                  onClick={() => remove(g)}
                  className="p-0.5 rounded hover:bg-amber-500/20 text-amber-800 dark:text-amber-200"
                  aria-label={`Remove ${g}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
