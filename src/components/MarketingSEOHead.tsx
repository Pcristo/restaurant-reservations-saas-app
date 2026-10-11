import React, { useEffect } from 'react';
import { MarketingWebsiteSettings, Plan } from '../types';
import { updateFavicon } from '../lib/utils';
import { useLanguage } from '../hooks/useLanguage';

interface MarketingSEOHeadProps {
  settings: MarketingWebsiteSettings;
  plans?: Plan[];
}

export const MarketingSEOHead: React.FC<MarketingSEOHeadProps> = ({ settings, plans = [] }) => {
  const { language } = useLanguage();
  const isPt = language === 'pt';

  useEffect(() => {
    document.documentElement.lang = isPt ? 'pt' : 'en';

    const siteName = settings.general?.siteName || 'DineMaster Pro';
    const defaultTagline = isPt 
      ? 'Software Moderno de Gestão de Reservas e Mesas para Restaurantes'
      : 'Modern Restaurant Reservation & Table Management SaaS';
    const tagline = settings.general?.tagline || defaultTagline;
    const pageTitle = isPt ? `${siteName} — ${defaultTagline}` : `${siteName} — ${tagline}`;

    // 1. Page Title
    document.title = pageTitle;

    // Helper to set or create meta tags
    const setMetaTag = (nameAttr: 'name' | 'property', attrValue: string, content: string) => {
      if (!content) return;
      let el = document.querySelector(`meta[${nameAttr}="${attrValue}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(nameAttr, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Meta Description
    const defaultDesc = isPt
      ? 'Faça a gestão de mesas, reservas, disponibilidade em tempo real e clientes com zero comissões. O sistema operacional inteligente para restaurantes modernos.'
      : 'Manage tables, reservations, live availability, and guest relationships with zero cover fees. One intelligent operating system built for modern restaurants.';
    const metaDescription = isPt ? defaultDesc : (settings.hero?.description || settings.about?.description || defaultDesc);
    setMetaTag('name', 'description', metaDescription);

    // 3. Robots
    setMetaTag('name', 'robots', 'index, follow, max-image-preview:large');

    // 4. Keywords
    setMetaTag('name', 'keywords', `${siteName}, restaurant reservations, table management, floor plan software, online booking system, hospitality SaaS, zero cover fees`);

    // 5. Canonical URL
    const canonicalUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://dinemasterpro.com';
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    // 6. Social Image (Hero image or logo)
    const socialImage = settings.hero?.imageUrl || settings.general?.logoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';

    // 7. OpenGraph Tags
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:site_name', siteName);
    setMetaTag('property', 'og:title', pageTitle);
    setMetaTag('property', 'og:description', metaDescription);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', socialImage);

    // 8. Twitter / X Cards
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', pageTitle);
    setMetaTag('name', 'twitter:description', metaDescription);
    setMetaTag('name', 'twitter:image', socialImage);

    // 9. Favicon
    if (settings.general?.faviconUrl) {
      updateFavicon(settings.general.faviconUrl, null);
    }

    // 10. Schema.org JSON-LD Structured Data
    const activeReviews = (settings.reviews?.items || []).filter(r => r.isActive !== false);
    const avgRating = activeReviews.length > 0
      ? (activeReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / activeReviews.length).toFixed(1)
      : '5.0';

    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          'name': siteName,
          'applicationCategory': 'BusinessApplication',
          'operatingSystem': 'Web, Cloud, iOS, Android',
          'description': metaDescription,
          'url': canonicalUrl,
          'screenshot': socialImage,
          ...(activeReviews.length > 0 ? {
            'aggregateRating': {
              '@type': 'AggregateRating',
              'ratingValue': avgRating,
              'reviewCount': activeReviews.length,
              'bestRating': '5',
              'worstRating': '1'
            }
          } : {}),
          ...(plans.length > 0 ? {
            'offers': plans.map(p => ({
              '@type': 'Offer',
              'name': p.name,
              'price': p.priceMonthly,
              'priceCurrency': p.currency || 'EUR',
              'description': p.description
            }))
          } : {})
        },
        {
          '@type': 'Organization',
          'name': siteName,
          'url': canonicalUrl,
          'email': settings.general?.contactEmail,
          'telephone': settings.general?.contactPhone,
          'logo': settings.general?.logoUrl || undefined
        }
      ]
    };

    let scriptEl = document.getElementById('marketing-jsonld-schema') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'marketing-jsonld-schema';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(structuredData);

    return () => {
      // Cleanup script element on unmount
      const existingScript = document.getElementById('marketing-jsonld-schema');
      if (existingScript) existingScript.remove();
    };
  }, [settings, plans]);

  return null;
};
