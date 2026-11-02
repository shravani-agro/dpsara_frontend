import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { seoPages } from "@/lib/seo-data";
import ReactMarkdown from "react-markdown";

type Props = {
  params: { slug: string };
};

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pageData = seoPages[params.slug];

  if (!pageData) {
    return {
      title: "Page Not Found | DPSara777",
      description: "Page not found on DPSara777 official platform.",
    };
  }

  const canonicalUrl = `https://dpsara777.com/${params.slug}`;

  return {
    title: pageData.title,
    description: pageData.description,
    keywords: pageData.keywords || ["satta matka", "kalyan matka", "dpsara777"],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageData.title,
      description: pageData.description,
      url: canonicalUrl,
      siteName: "DPSara777 Official",
      type: "article",
      locale: "en_IN",
      images: [
        {
          url: "https://dpsara777.com/images/about-image.jpg",
          width: 1200,
          height: 630,
          alt: pageData.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageData.title,
      description: pageData.description,
      images: ["https://dpsara777.com/images/about-image.jpg"],
    },
  };
}

// Ensure static generation for all defined SEO pages
export function generateStaticParams() {
  return Object.keys(seoPages).map((slug) => ({
    slug,
  }));
}

export default function SeoPage({ params }: Props) {
  const pageData = seoPages[params.slug];

  if (!pageData) {
    notFound();
  }

  const pageUrl = `https://dpsara777.com/${params.slug}`;

  // Structured Data (JSON-LD)
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://dpsara777.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pageData.h1,
        item: pageUrl,
      },
    ],
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: pageData.h1,
    description: pageData.description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    image: "https://dpsara777.com/images/about-image.jpg",
    author: {
      "@type": "Organization",
      name: "DPSara777 Research Team",
      url: "https://dpsara777.com",
    },
    publisher: {
      "@type": "Organization",
      name: "DPSara777",
      logo: {
        "@type": "ImageObject",
        url: "https://dpsara777.com/dpsara-dark.svg",
      },
    },
    datePublished: "2024-01-01T00:00:00+05:30",
    dateModified: "2026-11-02T12:00:00+05:30",
  };

  const faqSchema =
    pageData.faqs && pageData.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: pageData.faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        }
      : null;

  // Other related SEO pages for internal linking
  const relatedSlugs = Object.keys(seoPages).filter((s) => s !== params.slug).slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Structured Data Script Tags */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-400">
          <Link href="/" className="hover:text-amber-400 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-amber-400 font-semibold">{pageData.h1}</span>
        </nav>

        {/* Header Section */}
        <header className="mb-10 border-b border-white/10 pb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 mb-4 leading-tight">
            {pageData.h1}
          </h1>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl">
            {pageData.description}
          </p>
        </header>

        {/* Content Section */}
        <article className="prose prose-invert prose-lg max-w-none prose-headings:text-amber-400 prose-headings:font-bold prose-a:text-orange-400 hover:prose-a:text-orange-300 prose-strong:text-amber-300">
          <ReactMarkdown>{pageData.content}</ReactMarkdown>
        </article>

        {/* FAQs Section (if present) */}
        {pageData.faqs && pageData.faqs.length > 0 && (
          <section className="mt-14 pt-8 border-t border-white/10">
            <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-2">
              <span>❓</span> Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {pageData.faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-slate-900/60 p-4 sm:p-5"
                >
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Internal Linking: Related SEO Topics & Charts */}
        <section className="mt-14 pt-8 border-t border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">Explore More Satta Matka Markets</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {relatedSlugs.map((s) => (
              <Link
                key={s}
                href={`/${s}`}
                className="block p-3 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all text-xs sm:text-sm font-semibold text-slate-300 hover:text-amber-400"
              >
                {seoPages[s]?.h1 || s}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-opacity"
            >
              ← Back to Live Results
            </Link>
            <Link
              href="/all-satta-matka-chart.html"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 text-white font-semibold text-xs hover:bg-white/10 transition-colors"
            >
              📊 All Matka Charts
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
