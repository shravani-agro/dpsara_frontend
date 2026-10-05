import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Footer from "@/components/Footer";
import VideoPopup from "@/components/VideoPopup";
// import AgeGate from "@/components/AgeGate";

// Service Worker registration for background notifications
const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.match(
      /^127\.(0\.)?(\d{1,3}\.)?(\d{1,3})$/
    )
);

// Firebase Messaging initialization for background notifications
if ("serviceWorker" in navigator && "firebase" in window) {
  // Initialize Firebase Messaging when service worker is available
  import("@/lib/firebase-config").then(() => {
    // Firebase is initialized in the config file
  }).catch((err) => {
    console.error("Failed to import Firebase config:", err);
  });
}

if (!("serviceWorker" in navigator)) {
  // Service Worker not supported
} else if (isLocalhost) {
  // This is running on localhost - for development only
  navigator.serviceWorker
    .register("/sw.js", { scope: "/sattaadmin/" })
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              // At this point the newly updated content is activated
              console.log("New content is available and will be used. Reloading...");
              // window.location.reload();
            } else {
              // Content is cached for offline use
              console.log("Content cached for offline use.");
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error("Service worker registration failed:", error);
    });
} else {
  // Running on production domain - register with scope
  navigator.serviceWorker
    .register("/sw.js", { scope: "/sattaadmin/" })
    .then((registration) => {
      console.log("Service Worker registered with scope:", registration.scope);
    })
    .catch((error) => {
      console.error("Service worker registration failed:", error);
    });
}

export const metadata: Metadata = {
  metadataBase: new URL("https://dpsara.in"),
  title: {
    default: "DPSara | Satta Matka Booking Platform",
    template: `%s | DPSara Booking`,
  },
  description:
    "DPSara is the trusted satta matka booking platform offering instant withdrawals, real-time results, and 24/7 support. Play responsibly and win big!",
  keywords: [
    "satta matka",
    "satta matka booking",
    "satta matka results",
    "satta matka today",
    "online satta matka",
    "matka result",
    "matka guessing",
    "Indian matka",
    "satta matka game",
    "satta matka app",
    "withdrawal",
    "secure gaming",
    "win real money",
  ],
  authors: [{ name: "DPSara Team" }],
  creator: "DPSara",
  publisher: "DPSara",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://dpsara.in",
    siteName: "DPSara Booking",
    title: "DPSara | Satta Matka Booking Platform",
    description:
      "DPSara is the trusted satta matka booking platform offering instant withdrawals, real-time results, and 24/7 support. Play responsibly and win big!",
    images: [
      {
        url: "/logo.svg",
        width: 800,
        height: 600,
        alt: "DPSara Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DPSara | Satta Matka Booking Platform",
    description:
      "Instant withdrawals, real-time results, and 24/7 support. Play responsibly and win big!",
    creator: "@DPSara",
    images: ["/logo.svg"],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
