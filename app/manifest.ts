import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DPSara777 — Official Satta Matka Platform',
    short_name: 'DPSara777',
    description:
      'Original & Official Website for Live Satta Matka Results Today, Free Kalyan Jodi & Pana Charts, and Verified App Download.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d1117',
    theme_color: '#F59E0B',
    icons: [
      {
        src: '/images/logo/icon/dpsara777-favicon-180.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/images/logo/icon/dpsara777-favicon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
