"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function UploadPage() {
  return (
    <div className="space-y-6 w-full max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Choose what type of content you want to upload.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link href="/upload/single" className="block">
          <Card className="h-full hover:border-red-500/50 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center mb-4 group-hover:bg-red-500/30 transition-colors">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="font-semibold text-slate-900 dark:text-white text-lg">Single Movie</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                One-time purchase. One video, one price.
              </p>
            </div>
          </Card>
        </Link>

        <Link href="/upload/series" className="block">
          <Card className="h-full hover:border-red-500/50 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center mb-4 group-hover:bg-red-500/30 transition-colors">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="font-semibold text-slate-900 dark:text-white text-lg">Series</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Step-by-step. Episodes, membership or free.
              </p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
