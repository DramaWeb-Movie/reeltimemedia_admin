"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { toastError, toastSuccess } from "@/lib/toast";

function PinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/login";
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        toastError(data.error ?? "Invalid PIN");
        setIsLoading(false);
        return;
      }

      toastSuccess("PIN verified");
      router.push(redirectTo);
      router.refresh();
    } catch {
      toastError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Left: branded panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-linear-to-br from-slate-900 via-slate-800 to-red-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(239,68,68,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <Image
              src="/logo.png"
              alt="ReelTime"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="text-xl font-semibold tracking-tight">ReelTime Admin</span>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Admin access
            </h2>
            <p className="text-slate-400 text-lg max-w-sm">
              Enter the admin PIN to proceed to the login page.
            </p>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} ReelTime Media
          </p>
        </div>
      </div>

      {/* Right: PIN form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="ReelTime"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                ReelTime Admin
              </span>
            </Link>
          </div>

          <Card padding="lg" className="shadow-lg">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Enter PIN
              </h1>
              <p className="mt-1.5 text-slate-600 dark:text-slate-400">
                Enter your admin PIN to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Admin PIN"
                type="password"
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                autoComplete="one-time-code"
                inputMode="numeric"
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                Continue
              </Button>
            </form>
          </Card>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-500">
            You will be asked to sign in after entering the correct PIN
          </p>
        </div>
      </div>
    </>
  );
}

export default function PinPage() {
  return (
    <div className="min-h-screen flex">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">Loading...</div>}>
        <PinForm />
      </Suspense>
    </div>
  );
}
