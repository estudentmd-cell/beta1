import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { usePageMeta } from '../utils/seo';

/**
 * Public CMS page — renders content from Firestore settings/cms_pages.
 * Routes: /despre, /faq, /termeni, /confidentialitate, /contacte
 */

function renderBody(text) {
  if (!text) return null;
  return text.split('\n\n').map((para, i) => {
    if (para.startsWith('## ')) {
      return <h2 key={i} className="text-[20px] font-bold text-[#1A1A1A] mt-8 mb-3">{para.slice(3)}</h2>;
    }
    if (para.startsWith('### ')) {
      return <h3 key={i} className="text-[16px] font-semibold text-[#1A1A1A] mt-6 mb-2">{para.slice(4)}</h3>;
    }
    return <p key={i} className="text-[15px] text-[#444] leading-relaxed mb-4">{para}</p>;
  });
}

function FaqAccordion({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="space-y-2">
      {(items || []).map((item, i) => (
        <div key={i} className="border border-[#E8E4DB] rounded-xl overflow-hidden">
          <button onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAF8F5] transition">
            <span className="text-[15px] font-semibold text-[#1A1A1A] pr-4">{item.q}</span>
            <svg className={`w-5 h-5 text-[#888] shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === i && (
            <div className="px-5 pb-4 text-[14px] text-[#555] leading-relaxed animate-[fadeIn_0.15s_ease]">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const CMS_SEO = {
  despre: { title: 'Despre noi', description: 'Cine suntem și cum creăm albume foto premium în Moldova.' },
  faq: { title: 'Întrebări frecvente', description: 'Răspunsuri la cele mai frecvente întrebări despre albumele foto Fotocarte.' },
  termeni: { title: 'Termeni și condiții', description: 'Termenii și condițiile de utilizare a serviciilor Fotocarte.' },
  confidentialitate: { title: 'Politica de confidențialitate', description: 'Cum protejăm datele tale personale.' },
  contacte: { title: 'Contacte', description: 'Contactează-ne pentru albume foto personalizate. Email, telefon, adresă în Chișinău.' },
};

export default function CmsScreen() {
  const location = useLocation();
  const pageId = location.pathname.split('/').pop();
  const seo = CMS_SEO[pageId] || {};
  usePageMeta({
    title: seo.title || pageId,
    description: seo.description,
    path: `/${pageId}`,
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'settings', 'cms_pages'));
        if (snap.exists() && snap.data()[pageId]) {
          setData(snap.data()[pageId]);
        } else {
          setData(null);
        }
      } catch { setData(null); }
      setLoading(false);
    })();
  }, [pageId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3D6B5E]/20 border-t-[#3D6B5E] rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[700px] mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Pagina nu a fost găsită</h1>
          <p className="text-[#888] mb-6">Conținutul acestei pagini nu este încă disponibil.</p>
          <Link to="/" className="text-[#3D6B5E] font-semibold hover:underline">Înapoi la pagina principală</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#FAF8F5] border-b border-[#E8E4DB]">
        <div className="max-w-[700px] mx-auto px-4 py-10 sm:py-14">
          <Link to="/" className="text-[12px] text-[#3D6B5E] font-semibold hover:underline mb-4 inline-block">
            ← Pagina principală
          </Link>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-[#1A1A1A] leading-tight">
            {data.title || pageId}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[700px] mx-auto px-4 py-8 sm:py-12">
        {/* Text pages: despre, termeni, confidentialitate */}
        {data.body && renderBody(data.body)}

        {/* FAQ */}
        {pageId === 'faq' && data.items && <FaqAccordion items={data.items} />}

        {/* Contacte */}
        {pageId === 'contacte' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.email && (
                <a href={`mailto:${data.email}`} className="flex items-center gap-3 p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E4DB] hover:border-[#3D6B5E] transition">
                  <div className="w-10 h-10 bg-[#3D6B5E]/10 rounded-full flex items-center justify-center text-[#3D6B5E]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#888] uppercase font-semibold">Email</div>
                    <div className="text-[14px] text-[#1A1A1A] font-medium">{data.email}</div>
                  </div>
                </a>
              )}
              {data.phone && (
                <a href={`tel:${data.phone}`} className="flex items-center gap-3 p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E4DB] hover:border-[#3D6B5E] transition">
                  <div className="w-10 h-10 bg-[#3D6B5E]/10 rounded-full flex items-center justify-center text-[#3D6B5E]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#888] uppercase font-semibold">Telefon</div>
                    <div className="text-[14px] text-[#1A1A1A] font-medium">{data.phone}</div>
                  </div>
                </a>
              )}
              {data.address && (
                <div className="flex items-center gap-3 p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E4DB]">
                  <div className="w-10 h-10 bg-[#3D6B5E]/10 rounded-full flex items-center justify-center text-[#3D6B5E]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#888] uppercase font-semibold">Adresă</div>
                    <div className="text-[14px] text-[#1A1A1A] font-medium">{data.address}</div>
                  </div>
                </div>
              )}
              {data.schedule && (
                <div className="flex items-center gap-3 p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E4DB]">
                  <div className="w-10 h-10 bg-[#3D6B5E]/10 rounded-full flex items-center justify-center text-[#3D6B5E]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#888] uppercase font-semibold">Program</div>
                    <div className="text-[14px] text-[#1A1A1A] font-medium">{data.schedule}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Social links */}
            {(data.facebook || data.instagram || data.whatsapp) && (
              <div className="flex gap-3 pt-2">
                {data.facebook && (
                  <a href={data.facebook} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#1877F2] text-white rounded-lg text-[13px] font-semibold hover:opacity-90 transition">
                    Facebook
                  </a>
                )}
                {data.instagram && (
                  <a href={data.instagram} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white rounded-lg text-[13px] font-semibold hover:opacity-90 transition">
                    Instagram
                  </a>
                )}
                {data.whatsapp && (
                  <a href={`https://wa.me/${data.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-lg text-[13px] font-semibold hover:opacity-90 transition">
                    WhatsApp
                  </a>
                )}
              </div>
            )}

            {/* Map */}
            {data.mapEmbed && (
              <div className="rounded-xl overflow-hidden border border-[#E8E4DB] mt-4">
                <iframe src={data.mapEmbed} width="100%" height="300" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
