"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/components/ui";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={cn(
      "fixed inset-x-0 top-0 z-50 transition-all duration-300",
      scrolled ? "bg-white/70 backdrop-blur-md border-b border-slate-200/50 py-2 shadow-sm" : "bg-transparent py-4"
    )}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center transition-transform hover:scale-105">
            <img src="/dpsara.svg" alt="DPSara Logo" className="h-12 w-auto object-contain drop-shadow-sm" />
          </Link>
        </div>

        <div className="flex flex-1 justify-end items-center gap-4">

          <a
            href="https://github.com/shravani-agro/dpsara_frontend/releases/latest/download/dpsara.apk"
            target="_blank"
            rel="noopener noreferrer"
            download
            className="group flex items-center gap-2 rounded-full bg-white/80 px-5 py-2 text-sm font-semibold text-slate-900 backdrop-blur transition-all hover:bg-white hover:scale-105 ring-1 ring-slate-200/60 hover:ring-slate-300/80 shadow-sm"
          >
            <Download className="h-4 w-4 text-brand-500 transition-transform group-hover:-translate-y-0.5" />
            <span className="hidden sm:inline">Download</span> App
          </a>
        </div>
      </nav>
    </header>
  );
}
