import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/ouradminportal/',
          '/admin/',
          '/login/',
          '/mpin-login/',
          '/mpin-change/',
          '/mobile-number/',
          '/campaigns/',
          '/dynamic/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/ouradminportal/',
          '/admin/',
          '/login/',
          '/mpin-login/',
          '/mpin-change/',
          '/campaigns/',
          '/dynamic/',
        ],
      },
    ],
    sitemap: 'https://dpsara777.com/sitemap.xml',
    host: 'https://dpsara777.com',
  };
}
