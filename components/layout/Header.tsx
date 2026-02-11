"use client";

import Link from "next/link";
import { useState } from "react";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between px-6">
      <div className="flex items-center flex-1 max-w-xl">
        <div className="relative w-full">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="search"
            placeholder="Search movies, users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-full h-10 pl-10 pr-4 rounded-lg
              bg-slate-800/50 border border-slate-700
              text-white placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500
              text-sm
            "
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors relative"
          aria-label="Notifications"
        >
          <BellIcon className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-300">
              A
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-white">Admin</p>
              <p className="text-xs text-slate-500">admin@reeltime.com</p>
            </div>
            <ChevronDownIcon className="w-4 h-4 text-slate-500" />
          </button>
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 w-48 py-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20">
                <Link
                  href="#"
                  className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                  onClick={() => setShowUserMenu(false)}
                >
                  Profile
                </Link>
                <Link
                  href="#"
                  className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                  onClick={() => setShowUserMenu(false)}
                >
                  Settings
                </Link>
                <hr className="my-2 border-slate-800" />
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800"
                  onClick={() => setShowUserMenu(false)}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
