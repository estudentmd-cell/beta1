import { useEffect } from 'react';

const SITE = 'https://fotocarte.md';
const SITE_NAME = 'Fotocarte';
const DEFAULT_TITLE = 'Fotocarte — Albume foto premium';
const DEFAULT_DESC = 'Albume foto premium, create cu dragoste în Moldova. Transformă pozele din telefon în amintiri de o viață.';
const DEFAULT_IMAGE = `${SITE}/og-image.jpg`;

/**
 * Sets <title>, meta description, OG tags, canonical URL.
 * Call once per page component.
 *
 * @param {{ title?: string, description?: string, path?: string, image?: string, type?: string }} opts
 */
export function usePageMeta({ title, description, path = '/', image, type = 'website' } = {}) {
  useEffect(() => {
    const t = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
    const d = description || DEFAULT_DESC;
    const url = `${SITE}${path}`;
    const img = image || DEFAULT_IMAGE;

    document.title = t;

    setMeta('description', d);
    setMeta('og:title', t, true);
    setMeta('og:description', d, true);
    setMeta('og:url', url, true);
    setMeta('og:image', img, true);
    setMeta('og:type', type, true);
    setMeta('twitter:title', t);
    setMeta('twitter:description', d);

    // Canonical
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;

    return () => {
      // Reset to defaults on unmount
      document.title = DEFAULT_TITLE;
      setMeta('description', DEFAULT_DESC);
      setMeta('og:title', DEFAULT_TITLE, true);
      setMeta('og:description', DEFAULT_DESC, true);
      setMeta('og:url', SITE, true);
      setMeta('og:image', DEFAULT_IMAGE, true);
      setMeta('og:type', 'website', true);
      setMeta('twitter:title', DEFAULT_TITLE);
      setMeta('twitter:description', DEFAULT_DESC);
      if (link) link.href = `${SITE}/`;
    };
  }, [title, description, path, image, type]);
}

function setMeta(name, content, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Renders a JSON-LD <script> tag for structured data.
 * @param {{ data: object }} props
 */
export function JsonLd({ data }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ── Pre-built schema generators ──

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Fotocarte',
    url: SITE,
    logo: `${SITE}/logo.svg`,
    description: DEFAULT_DESC,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Chișinău',
      addressCountry: 'MD',
    },
    sameAs: [
      'https://www.facebook.com/fotocarte.md',
      'https://www.instagram.com/fotocarte.md',
    ],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE,
  };
}

export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE}${item.path}`,
    })),
  };
}

export function faqSchema(questions) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  };
}

export function productSchema({ name, description, image, price, currency = 'MDL', slug }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    url: `${SITE}/app/product/${slug}`,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      url: `${SITE}/app/product/${slug}`,
    },
  };
}

// Collection theme labels for SEO
export const COLLECTION_SEO = {
  nunti: {
    title: 'Albume foto de nuntă',
    description: 'Albume foto premium pentru nuntă. Paginare profesională, copertă cartonată, hârtie fotografică de calitate.',
  },
  familie: {
    title: 'Albume foto de familie',
    description: 'Albume foto de familie — momente prețioase cu cei dragi, imprimate pe hârtie premium.',
  },
  copii: {
    title: 'Albume foto pentru copii',
    description: 'Albume foto pentru copii — primul an, primii pași, amintiri care cresc cu ei.',
  },
  vacanta: {
    title: 'Albume foto de vacanță',
    description: 'Albume foto de vacanță — transformă sutele de poze din telefon într-un album memorabil.',
  },
  botez: {
    title: 'Albume foto de botez',
    description: 'Albume foto de botez — o zi sfântă, păstrată într-un album premium pentru totdeauna.',
  },
  toate: {
    title: 'Toate albumele foto',
    description: 'Explorează toate designurile de albume foto Fotocarte. Nuntă, familie, copii, vacanță, botez.',
  },
};
