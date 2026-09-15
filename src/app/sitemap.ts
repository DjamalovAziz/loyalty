import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Статические страницы
    const staticRoutes: MetadataRoute.Sitemap = ['', '/signup', '/signin'].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: route === '' ? 1 : 0.8,
    }));

    // Динамические публичные страницы заведений из Supabase
    try {
        const businesses = await prisma.business.findMany({
            select: { slug: true, updatedAt: true },
        });

        const businessRoutes: MetadataRoute.Sitemap = businesses.map((b) => ({
            url: `${baseUrl}/b/${b.slug}`,
            lastModified: b.updatedAt,
            changeFrequency: 'weekly',
            priority: 0.6,
        }));

        return [...staticRoutes, ...businessRoutes];
    } catch (error) {
        console.error('Sitemap build error:', error);
        return staticRoutes;
    }
}