import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import { usePageMeta } from '../utils/seo';
import { db } from '../firebase/config';

const PRODUCT_TYPES = [
  {
    id: 'groase',
    name: 'Album Pagini Groase',
    badge: 'Popular',
    badgeColor: 'bg-[#3D6B5E]',
    desc: 'Pagini rigide de 2mm cu deschidere plată 180°. Culorile rămân vii, paginile nu se îndoaie. Ideal pentru nunți, botezuri și ocazii speciale.',
    priceFrom: 100,
    image: 'https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-07.jpg?v=1744188647&width=800',
    link: '/app/product/pagini-groase?from=preturi',
    available: true,
    features: [
      'Pagini rigide 2mm — nu se îndoaie',
      'Deschidere plată 180° (layflat)',
      'Hârtie fotografică premium, mat sau lucios',
      'Copertă cartonată cu laminare soft-touch',
      'Formate: 20×20, 20×30, 23×23, 30×30 cm',
      'De la 20 la 80 de pagini',
    ],
  },
  {
    id: 'subtiri',
    name: 'Album Pagini Subțiri',
    badge: 'Accesibil',
    badgeColor: 'bg-[#2BB5B2]',
    desc: 'Pagini flexibile, stil revistă. Ușor de răsfoit, mai multe pagini la preț accesibil. Perfect pentru vacanțe, familie și călătorii.',
    priceFrom: 85,
    image: 'https://www.innocence-editions.com/cdn/shop/files/Innocence-magazine-softcover-portrait-int-02_12a1f5ec-025f-4413-8b24-3ec8f81a25e2.jpg?v=1744190237&width=800',
    link: '/app/product/pagini-subtiri?from=preturi',
    available: true,
    features: [
      'Pagini flexibile — ușor de răsfoit',
      'Hârtie fotografică mată de calitate',
      'Mai multe pagini la preț accesibil',
      'Copertă cartonată rezistentă',
      'Formate: 20×20, 20×30, 23×23, 30×30 cm',
      'De la 32 la 96 de pagini',
    ],
  },
  {
    id: 'piele',
    name: 'Album din Piele',
    badge: null,
    badgeColor: null,
    desc: 'Copertă din piele naturală, cusută manual. Elegantul suprem pentru momente speciale.',
    priceFrom: null,
    image: null,
    link: null,
    available: false,
    features: ['Piele naturală italiană', 'Cusut manual', 'Gravare cu folio auriu', 'Cutie cadou inclusă'],
  },
  {
    id: 'pinza',
    name: 'Album din Pânză',
    badge: null,
    badgeColor: null,
    desc: 'Copertă din pânză texturată, cu finisaj mat. Aspect artizanal și cald.',
    priceFrom: null,
    image: null,
    link: null,
    available: false,
    features: ['Pânză premium texturată', 'Aspect handmade', 'Personalizare cu text', 'Ideal pentru cadou'],
  },
  {
    id: 'catifea',
    name: 'Album din Catifea',
    badge: null,
    badgeColor: null,
    desc: 'Copertă din catifea moale, senzație premium la atingere. Perfect pentru nunți.',
    priceFrom: null,
    image: null,
    link: null,
    available: false,
    features: ['Catifea moale premium', 'Finisaj luxos', 'Culori: ivory, navy, bordo', 'Cutie de prezentare'],
  },
];

// Citim heroImage din Firestore (setate din admin → Produse)
function useProductImages() {
  const [images, setImages] = useState({});
  useEffect(() => {
    if (!db) return;
    (async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'settings', 'products'));
        if (snap.exists()) {
          const items = snap.data().items || [];
          const map = {};
          items.forEach(p => {
            if (p.heroImage) map[p.slug] = p.heroImage;
            else if (p.gallery?.[0]?.src) map[p.slug] = p.gallery[0].src;
          });
          setImages(map);
        }
      } catch {}
    })();
  }, []);
  return images;
}

export default function PricingScreen() {
  const productImages = useProductImages();
  usePageMeta({
    title: 'Prețuri albume foto',
    description: 'Prețuri transparente pentru albumele foto Fotocarte. Pagini groase sau subțiri, de la 100 MDL. Design gratuit inclus.',
    path: '/preturi',
  });
  return (
    <div className="min-h-screen bg-white">
      {/* Header — now in RootLayout globally */}

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 md:px-12 pt-4">
        <nav className="flex items-center gap-2 text-[12px] text-[#B0A89E]">
          <Link to="/" className="hover:text-[#1c1c1c] transition-colors">Acasă</Link>
          <span>/</span>
          <span className="text-[#1c1c1c]">Prețuri</span>
        </nav>
      </div>

      {/* Mini Hero */}
      <div className="max-w-6xl mx-auto px-4 md:px-12 pt-10 pb-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#B0A89E] mb-3">
          PREȚURI
        </p>
        <h1 className="text-[32px] md:text-[42px] text-[#1c1c1c] leading-tight mb-4" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          Cât costă un album foto?
        </h1>
        <p className="text-[16px] text-[#8A8078] max-w-lg mx-auto">
          Alege tipul de album care te interesează. Prețul depinde de format, numărul de pagini și tipul paginilor.
        </p>
      </div>

      {/* Product Types Grid */}
      <div className="max-w-5xl mx-auto px-4 md:px-12 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {PRODUCT_TYPES.map((product) => (
            <div
              key={product.id}
              className={`glass relative border overflow-hidden transition-all ${
                product.available
                  ? 'border-[#1c1c1c] hover:-translate-y-1 hover:shadow-lg'
                  : 'border-[#E8E4DB] opacity-70'
              }`}
            >
              {/* Image or placeholder */}
              <div className="relative aspect-[16/10] bg-[#F5F1EB] overflow-hidden">
                {product.badge && (
                  <span className={`absolute top-3 left-3 z-10 ${product.badgeColor} text-white text-[10px] font-semibold uppercase tracking-wider px-3 py-1`}>
                    {product.badge}
                  </span>
                )}
                {(productImages[`pagini-${product.id}`] || product.image) ? (
                  <img
                    src={productImages[`pagini-${product.id}`] || product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[#D0CAC0] text-[14px] uppercase tracking-wider">În curând</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-6">
                <h2 className="text-[22px] text-[#1c1c1c] mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
                  {product.name}
                </h2>
                <p className="text-[14px] text-[#8A8078] mb-4 leading-relaxed">
                  {product.desc}
                </p>

                {/* Features */}
                <ul className="space-y-1.5 mb-5">
                  {product.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-[13px] text-[#5C544B]">
                      <span className={product.available ? 'text-[#3D6B5E]' : 'text-[#D0CAC0]'}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Price + CTA */}
                {product.available ? (
                  <>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-[13px] text-[#B0A89E]">de la</span>
                      <span className="text-[28px] font-bold text-[#1c1c1c]">{product.priceFrom}</span>
                      <span className="text-[14px] text-[#8A8078]">MDL</span>
                    </div>
                    <Link
                      to={product.link}
                      className="glass-btn-dark block w-full text-center no-underline"
                    >
                      VEZI PREȚURI ȘI CONFIGUREAZĂ →
                    </Link>
                  </>
                ) : (
                  <div className="py-3.5 text-center border border-[#E8E4DB] text-[#B0A89E] uppercase tracking-[0.12em] text-[13px]">
                    ÎN CURÂND
                  </div>
                )}
              </div>

              {/* Coming soon overlay */}
              {!product.available && (
                <div className="absolute top-4 right-4">
                  <span className="bg-[#F5F1EB] text-[#8A8078] text-[11px] uppercase tracking-wider px-3 py-1">
                    În curând
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ mini */}
      <div className="glass-subtle bg-[#F5F1EB] py-12">
        <div className="max-w-2xl mx-auto px-4 md:px-12 text-center">
          <h3 className="text-[22px] text-[#1c1c1c] mb-6" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
            Întrebări frecvente
          </h3>
          <div className="space-y-4 text-left">
            {[
              { q: 'Ce include prețul?', a: 'Albumul tipărit, copertă personalizată, design profesional gratuit și livrare în Moldova.' },
              { q: 'Pot adăuga pagini suplimentare?', a: 'Da, poți alege între 20 și 96 de pagini, în funcție de tipul albumului.' },
              { q: 'Există costuri ascunse?', a: 'Nu. Prețul afișat în configurator include totul. Fără surprize.' },
              { q: 'Pot schimba formatul după ce încep?', a: 'Da, poți modifica formatul și numărul de pagini oricând înainte de comandă.' },
            ].map((faq, i) => (
              <div key={i} className="bg-white p-4 border border-[#E8E4DB]">
                <p className="text-[14px] font-semibold text-[#1c1c1c] mb-1">{faq.q}</p>
                <p className="text-[13px] text-[#8A8078] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
