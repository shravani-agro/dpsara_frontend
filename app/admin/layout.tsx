"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Legacy /admin route is disabled; redirect to public home
    router.replace("/");
  }, [router]);

  return null;
}
