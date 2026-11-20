import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import { seoPages } from '@/lib/seo-data';

const BASE_URL = 'https://dpsara777.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // 1. Homepage (highest priority)
  entries.push({
    url: `${BASE_URL}/`,
    lastModified: currentDate,
    changeFrequency: 'always',
    priority: 1.0,
  });

  // 2. High-Intent Keyword Landing Pages from seoPages
  Object.keys(seoPages).forEach((slug) => {
    entries.push({
      url: `${BASE_URL}/${slug}`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    });
  });

  // 3. Core Static and Information Pages
  const corePages = [
    { path: '/all-satta-matka-chart.html', priority: 0.9, freq: 'daily' },
    { path: '/how-to-play.html', priority: 0.8, freq: 'weekly' },
    { path: '/game-rules.html', priority: 0.8, freq: 'weekly' },
    { path: '/faq.html', priority: 0.8, freq: 'weekly' },
    { path: '/terms-conditions.html', priority: 0.6, freq: 'monthly' },
    { path: '/privacy-policy.html', priority: 0.6, freq: 'monthly' },
    { path: '/contact-us.html', priority: 0.7, freq: 'monthly' },
  ];

  corePages.forEach((cp) => {
    entries.push({
      url: `${BASE_URL}${cp.path}`,
      lastModified: currentDate,
      changeFrequency: cp.freq as any,
      priority: cp.priority,
    });
  });

  // 4. Discover all Blog Articles and Charts from templates/
  try {
    const templatesDir = path.join(process.cwd(), 'templates');
    if (fs.existsSync(templatesDir)) {
      const files = fs.readdirSync(templatesDir);

      files.forEach((file) => {
        if (!file.endsWith('.html')) return;
        if (file === 'index.html') return;

        // Skip internal/admin/irrelevant templates
        if (file.includes('starline') || file.includes('jackpot')) return;

        const url = `${BASE_URL}/${file}`;

        // Blog post
        if (file.startsWith('blog_')) {
          entries.push({
            url,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.75,
          });
        }
        // Jodi Chart
        else if (file.endsWith('_jodi.html')) {
          entries.push({
            url,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.85,
          });
        }
        // Pana Chart
        else if (file.endsWith('_pana.html')) {
          entries.push({
            url,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.85,
          });
        }
      });
    }
  } catch (err) {
    console.error('Error reading templates for sitemap:', err);
  }

  // 5. Dynamic Market Jodi/Pana Charts from Live Backend API
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://backend.dpsara777.com/api';
    const res = await fetch(`${apiBase}/mobile/homepage`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        json.data.forEach((m: any) => {
          const isStarline = m.is_starline === true || m.is_starline === 1 || (m.market_type || '').toLowerCase() === 'starline';
          const isJackpot = m.is_jackpot === true || m.is_jackpot === 1 || (m.market_type || '').toLowerCase() === 'jackpot';
          if (isStarline || isJackpot) return;

          const name = (m.name || m.market_name || '').trim();
          if (!name) return;
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

          const jodiUrl = `${BASE_URL}/${slug}_jodi.html`;
          const panaUrl = `${BASE_URL}/${slug}_pana.html`;

          if (!entries.some((e) => e.url === jodiUrl)) {
            entries.push({
              url: jodiUrl,
              lastModified: currentDate,
              changeFrequency: 'daily',
              priority: 0.85,
            });
          }

          if (!entries.some((e) => e.url === panaUrl)) {
            entries.push({
              url: panaUrl,
              lastModified: currentDate,
              changeFrequency: 'daily',
              priority: 0.85,
            });
          }
        });
      }
    }
  } catch (err) {
    // Graceful fallback to static entries
  }

  return entries;
}
