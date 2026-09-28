import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { Download, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Download SM Booking App | Start Winning Now",
  description: "Download the official SM Booking app for Android. Experience the thrill of fast-paced gaming with instant withdrawals.",
};

export default function ApkDownloadPage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] selection:bg-brand-500/30 overflow-hidden flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex flex-col items-center justify-center relative pt-20 px-6">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-brand-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full mx-auto">
          
          <div className="w-24 h-24 bg-white rounded-3xl shadow-xl shadow-brand-500/10 p-1 mb-8 border border-brand-100 flex items-center justify-center overflow-hidden">
            <img src="/logo.jpg" alt="SM Booking Logo" className="w-full h-full object-cover rounded-2xl" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Download the <span className="text-brand-500">SM Booking</span> App
          </h1>
          
          <p className="text-lg text-slate-600 mb-10 font-medium px-4">
            Experience the thrill of the most secure and fast-paced gaming platform right from your phone. Start winning now!
          </p>

          <a
            href="https://github.com/shravani-agro/smgameplay_frontend/releases/latest/download/smgameplay.apk"
            className="group relative flex items-center justify-center gap-3 rounded-full bg-[#E42247] px-10 py-5 text-lg font-bold text-white shadow-[0_0_40px_rgba(228,34,71,0.4)] transition-all hover:bg-[#c91d3e] hover:scale-[1.02] active:scale-95 w-full max-w-md mb-8"
          >
            <Download className="h-6 w-6" />
            Download APK
            <div className="absolute inset-0 rounded-full border-2 border-white/20" />
          </a>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md text-left">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-green-500 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">100% Secure</h3>
                <p className="text-xs text-slate-500 mt-1">Verified & safe to install on all Android devices.</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-3">
              <Smartphone className="h-6 w-6 text-brand-500 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Easy Install</h3>
                <p className="text-xs text-slate-500 mt-1">Allow "Install from unknown sources" if prompted.</p>
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
