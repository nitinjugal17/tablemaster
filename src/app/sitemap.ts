
import { MetadataRoute } from 'next'
import { ALL_APPLICATION_ROUTES } from '@/lib/types'
 
export default function sitemap(): MetadataRoute.Sitemap {
  // It's important to set this environment variable in your deployment environment
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9005';
 
  // Manually add any public static routes not in the ALL_APPLICATION_ROUTES array
  const staticRoutes = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
  ];

  // Filter for public-facing routes from the main route definitions
  const publicPagesFromRoutes = ALL_APPLICATION_ROUTES
    .filter(route => 
        route.group === 'General' &&
        // Exclude pages that are behind authentication
        !['/dashboard', '/orders', '/chef-view', '/attendance'].includes(route.path) 
    )
    .map(route => route.path);

  // Combine and remove duplicates
  const allPublicPaths = Array.from(new Set([...staticRoutes, ...publicPagesFromRoutes]));
 
  const sitemapEntries: MetadataRoute.Sitemap = allPublicPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: path === '/' ? 1.0 : 0.8,
  }));
 
  return sitemapEntries;
}
