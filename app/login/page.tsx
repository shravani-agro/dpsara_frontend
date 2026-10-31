"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Legacy /login is disabled; redirect to public home
    router.replace("/");
  }, [router]);

  return null;
}
