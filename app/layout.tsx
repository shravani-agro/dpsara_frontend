import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Footer from "@/components/Footer";
import VideoPopup from "@/components/VideoPopup";
// import AgeGate from "@/components/AgeGate";

// Service Worker registration for background notifications
if (typeof window !== "undefined") {
  const isLocalhost = Boolean(
    window.location.hostname === "localhost" ||
      window.location.hostname === "[::1]" ||
      window.location.hostname.match(
        /^127\.(0\.)?(\d{1,3}\.)?(\d{1,3})$/
      )
  );

  // Firebase Messaging initialization for background notifications
  if ("serviceWorker" in navigator && "firebase" in window) {
    import("@/lib/firebase-config").catch((err) => {
      console.error("Failed to import Firebase config:", err);
    });
  }

  if ("serviceWorker" in navigator) {
    if (isLocalhost) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/sattaadmin/" })
        .then((registration) => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed") {
                  if (navigator.serviceWorker.controller) {
                    console.log("New content is available and will be used. Reloading...");
                  } else {
                    console.log("Content cached for offline use.");
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.error("Service worker registration failed:", error);
        });
    } else {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/sattaadmin/" })
        .then((registration) => {
          console.log("Service Worker registered with scope:", registration.scope);
        })
        .catch((error) => {
          console.error("Service worker registration failed:", error);
        });
    }
  }
}

export const metadata: Metadata = {
  metadataBase: new URL("https://dpsara777.com"),
  title: {
    default: "DPSara777 | Original & Official Website | Live Satta Matka Results & Charts",
    template: `%s | DPSara777 Official`,
  },
  description:
    "Skip fake clone sites. DPSara777.com is the original official hub for live Kalyan, Milan, Sridevi, Time Bazar results, full jodi/pana chart history, and official DPSara 777 app download — fast, verified, trusted.",
  keywords: [
    "DPSara777 Official",
    "DPSara 777 original website",
    "DPSara live result today",
    "DPSara Satta matka",
    "DPSara777 app download",
    "dpsara download APK",
    "satta matka result today",
    "kalyan chart dpsara",
    "jodi chart",
    "pana chart",
    "DPSara Kalyan Result",
    "official satta matka charts",
    "DPSara Matka App",
    "Kalyan Satta Matka Bazar",
    "fastest matka results",
    "online matka play",
  ],
  authors: [{ name: "DPSara777 Team" }],
  creator: "DPSara777",
  publisher: "DPSara777",
  alternates: {
    canonical: "https://dpsara777.com/",
    languages: {
      "en-IN": "https://dpsara777.com/",
      "hi-IN": "https://dpsara777.com/",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://dpsara777.com/",
    siteName: "DPSara777 Official",
    title: "DPSara777 | Original & Official Website | Live Satta Matka Results & Charts",
    description:
      "Skip fake clone sites. DPSara777.com is the original official hub for live Kalyan, Milan, Sridevi, Time Bazar results, full jodi/pana chart history, and official DPSara 777 app download.",
    images: [
      {
        url: "/images/about-image.jpg",
        width: 1200,
        height: 630,
        alt: "DPSara777 Official Satta Matka Hub",
      },
      {
        url: "/dpsara-dark.svg",
        width: 600,
        height: 200,
        alt: "DPSara777 Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DPSara777 | Original & Official Website | Live Satta Matka Results & Charts",
    description:
      "Original official platform for live Kalyan, Milan, Sridevi, Time Bazar results, full charts, and official app download.",
    creator: "@dpsara777",
    images: ["/images/about-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "dpsara-google-verification",
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "DPSara777",
  alternateName: ["DPSara", "DPSara 777", "DPSara Matka", "DPSara Booking"],
  url: "https://dpsara777.com",
  logo: "https://dpsara777.com/dpsara-dark.svg",
  sameAs: [
    "https://t.me/dpsara777",
    "https://wa.me/918377999777",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91 8377 999 777",
    contactType: "customer service",
    availableLanguage: ["English", "Hindi"],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "DPSara777",
  alternateName: "DPSara Satta Matka Results & Charts",
  url: "https://dpsara777.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://dpsara777.com/{search_term_string}_jodi.html",
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        {/* Preconnect to Font & CDN domains for Core Web Vitals optimization */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://backend.dpsara777.com" />

        {/* Global Structured Data JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />

        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18397257443"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'AW-18397257443');
            `,
          }}
        />
        {/* Early Theme Initializer to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var savedTheme = localStorage.getItem('theme') || localStorage.getItem('dpsara_theme');
                var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.removeAttribute('data-theme');
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
        {/* Strip browser-extension attributes (Google Translate / Grammarly)
            that get injected onto <html>/<body> and trigger a hydration warning. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.removeAttribute('data-new-gr-c-s-check-loaded');document.documentElement.removeAttribute('data-gr-ext-installed');document.body&&document.body.removeAttribute('data-new-gr-c-s-check-loaded');document.body&&document.body.removeAttribute('data-gr-ext-installed');",
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
        <Footer />
        {/* <VideoPopup /> */}
        {/* <AgeGate /> */}
      </body>
    </html>
  );
}
