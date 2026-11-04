"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin portal caught error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-3xl shadow-inner mb-4">
        ⚠️
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        Something went wrong
      </h2>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400 mb-6">
        {error?.message || "An unexpected client-side error occurred. Please try reloading or clearing your session."}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} variant="primary">
          Try Again
        </Button>
        <Button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.sessionStorage.clear();
              window.location.reload();
            }
          }}
          variant="outline"
        >
          Clear Cache & Reload
        </Button>
        <Link href="/ouradminportal/login">
          <Button variant="ghost">Go to Login</Button>
        </Link>
      </div>
    </div>
  );
}

