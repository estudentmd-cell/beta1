import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';

/**
 * Admin CMS — Edit site pages: Despre noi, FAQ, Termeni, Confidențialitate, Contacte.
 * Content stored in Firestore settings/cms_pages.
 */

const PAGE_DEFS = [
  { id: 'despre', label: 'Despre noi', icon: '🏢', hint: 'Povestea companiei, echipa, misiunea' },
  { id: 'faq', label: 'FAQ', icon: '❓', hint: 'Întrebări frecvente — format: Î: ... R: ...' },
  { id: 'termeni', label: 'Termeni și condiții', icon: '📋', hint: 'Text juridic, reguli de utilizare' },
  { id: 'confidentialitate', label: 'Politica de confidențialitate', icon: '🔒', hint: 'GDPR, cookies, date personale' },
  { id: 'contacte', label: 'Contacte', icon: '📞', hint: 'Adresă, telefon, email, program, rețele sociale' },
];

const DEFAULT_CONTENT = {
  despre: {
    title: 'Despre Fotocarte',
    body: `Fotocarte este un studio de fotocarte premium din Chișinău, Moldova.\n\nCreăm albume foto de cea mai înaltă calitate, cu materiale premium și atenție la fiecare detaliu.\n\nEchipa noastră are peste 10 ani de experiență în designul și producția albumelor foto profesionale.`,
  },
  faq: {
    title: 'Întrebări frecvente',
    items: [
      { q: 'Cât durează livrarea?', a: 'Albumele sunt livrate în 14-18 zile lucrătoare de la confirmarea comenzii.' },
      { q: 'Ce formate sunt disponibile?', a: 'Oferim formatele 20×20 cm, 23×23 cm, 30×30 cm și 20×30 cm.' },
      { q: 'Pot edita albumul după ce l-am salvat?', a: 'Da, albumul tău este salvat automat și poți reveni oricând să-l editezi.' },
      { q: 'Ce tipuri de hârtie folosiți?', a: 'Folosim hârtie foto premium cu finisaj mat sau lucios, grosime 300-350 gsm.' },
      { q: 'Cum pot plăti?', a: 'Acceptăm plata cu cardul (Visa, Mastercard), transfer bancar și numerar la livrare.' },
    ],
  },
  termeni: {
    title: 'Termeni și condiții',
    body: 'Adăugați aici termenii și condițiile de utilizare a serviciului.',
  },
  confidentialitate: {
    title: 'Politica de confidențialitate',
    body: 'Adăugați aici politica de confidențialitate și prelucrare a datelor personale.',
  },
  contacte: {
    title: 'Contacte',
    email: 'fotocartemd@gmail.com',
    phone: '+373 60 595 984',
    address: 'Chișinău, Moldova',
    schedule: 'Luni – Vineri: 9:00 – 18:00',
    facebook: 'https://facebook.com/fotocarte.md',
    instagram: 'https://instagram.com/fotocarte.md',
    whatsapp: '',
    mapEmbed: '',
  },
};

export default function AdminPages() {
  const [pages, setPages] = useState({});
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('despre');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadPages(); }, []);

  async function loadPages() {
    setLoading(true);
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'settings', 'cms_pages'));
      if (snap.exists()) {
        setPages({ ...DEFAULT_CONTENT, ...snap.data() });
      } else {
        setPages({ ...DEFAULT_CONTENT });
      }
    } catch (e) {
      console.warn('Failed to load CMS pages:', e);
      setPages({ ...DEFAULT_CONTENT });
    }
    setLoading(false);
  }

  async function savePage(pageId, data) {
    setSaving(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const updated = { ...pages, [pageId]: data, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'settings', 'cms_pages'), updated);
      setPages(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert('Eroare la salvare: ' + e.message);
    }
    setSaving(false);
  }

  const pageData = pages[activePage] || DEFAULT_CONTENT[activePage] || {};
  const pageDef = PAGE_DEFS.find(p => p.id === activePage);

  if (loading) return <div className="p-8 text-center text-[#888]">Se încarcă...</div>;

  return (
    <div className="p-6 max-w-[1100px]">
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Pagini site</h1>
      <p className="text-sm text-[#888] mb-5">Editează conținutul paginilor publice ale site-ului.</p>

      {/* Page tabs */}
      <div className="flex gap-1 mb-6 bg-[#F0EDE6] rounded-xl p-1 overflow-x-auto">
        {PAGE_DEFS.map(p => (
          <button key={p.id} onClick={() => setActivePage(p.id)}
            className={`px-3 py-2 rounded-lg text-[12px] font-semibold transition-all whitespace-nowrap ${
              activePage === p.id ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#888] hover:text-[#555]'
            }`}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div className="bg-white rounded-xl border border-[#EBEBEB] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">{pageDef?.icon} {pageDef?.label}</h2>
            <p className="text-[12px] text-[#888]">{pageDef?.hint}</p>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-[12px] text-green-600 font-semibold">Salvat!</span>}
            <button onClick={() => savePage(activePage, pageData)} disabled={saving}
              className="px-5 py-2 bg-[#3D6B5E] text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-[#2d5445] transition">
              {saving ? 'Se salvează...' : 'Salvează'}
            </button>
          </div>
        </div>

        {/* ── Despre noi ── */}
        {activePage === 'despre' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Titlu pagină</label>
              <input type="text" value={pageData.title || ''} onChange={e => setPages(p => ({ ...p, despre: { ...p.despre, title: e.target.value } }))}
                className="w-full px-3 py-2 border border-[#E0D8D0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Conținut (folosește linii goale pentru paragrafe)</label>
              <textarea value={pageData.body || ''} onChange={e => setPages(p => ({ ...p, despre: { ...p.despre, body: e.target.value } }))}
                rows={12} className="w-full px-3 py-2 border border-[#E0D8D0] rounded-lg text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
            </div>
          </div>
        )}

        {/* ── FAQ ── */}
        {activePage === 'faq' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Titlu pagină</label>
              <input type="text" value={pageData.title || ''} onChange={e => setPages(p => ({ ...p, faq: { ...p.faq, title: e.target.value } }))}
                className="w-full px-3 py-2 border border-[#E0D8D0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
            </div>
            {(pageData.items || []).map((item, idx) => (
              <div key={idx} className="bg-[#F8F6F3] rounded-lg p-4 border border-[#E8E4DB]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-[#3D6B5E] uppercase">Întrebarea {idx + 1}</span>
                  <button onClick={() => {
                    const items = [...(pageData.items || [])];
                    items.splice(idx, 1);
                    setPages(p => ({ ...p, faq: { ...p.faq, items } }));
                  }} className="text-[10px] text-red-500 font-semibold hover:text-red-700">Șterge</button>
                </div>
                <input type="text" value={item.q} placeholder="Întrebarea..."
                  onChange={e => {
                    const items = [...(pageData.items || [])];
                    items[idx] = { ...items[idx], q: e.target.value };
                    setPages(p => ({ ...p, faq: { ...p.faq, items } }));
                  }}
                  className="w-full px-3 py-2 mb-2 border border-[#E0D8D0] rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
                <textarea value={item.a} placeholder="Răspunsul..."
                  onChange={e => {
                    const items = [...(pageData.items || [])];
                    items[idx] = { ...items[idx], a: e.target.value };
                    setPages(p => ({ ...p, faq: { ...p.faq, items } }));
                  }}
                  rows={3} className="w-full px-3 py-2 border border-[#E0D8D0] rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
              </div>
            ))}
            <button onClick={() => {
              const items = [...(pageData.items || []), { q: '', a: '' }];
              setPages(p => ({ ...p, faq: { ...p.faq, items } }));
            }} className="w-full py-2.5 border-2 border-dashed border-[#E0D8D0] rounded-lg text-sm text-[#888] font-semibold hover:border-[#3D6B5E] hover:text-[#3D6B5E] transition">
              + Adaugă întrebare
            </button>
          </div>
        )}

        {/* ── Termeni / Confidențialitate ── */}
        {(activePage === 'termeni' || activePage === 'confidentialitate') && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Titlu pagină</label>
              <input type="text" value={pageData.title || ''} onChange={e => setPages(p => ({ ...p, [activePage]: { ...p[activePage], title: e.target.value } }))}
                className="w-full px-3 py-2 border border-[#E0D8D0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Conținut (linii goale = paragraf nou, ## = subtitlu)</label>
              <textarea value={pageData.body || ''} onChange={e => setPages(p => ({ ...p, [activePage]: { ...p[activePage], body: e.target.value } }))}
                rows={20} className="w-full px-3 py-2 border border-[#E0D8D0] rounded-lg text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
            </div>
          </div>
        )}

        {/* ── Contacte ── */}
        {activePage === 'contacte' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Titlu pagină</label>
              <input type="text" value={pageData.title || ''} onChange={e => setPages(p => ({ ...p, contacte: { ...p.contacte, title: e.target.value } }))}
                className="w-full px-3 py-2 border border-[#E0D8D0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'email', label: 'Email', type: 'email', placeholder: 'hello@example.com' },
                { key: 'phone', label: 'Telefon', type: 'tel', placeholder: '+373 XX XXX XXX' },
                { key: 'address', label: 'Adresă', type: 'text', placeholder: 'Chișinău, Moldova' },
                { key: 'schedule', label: 'Program', type: 'text', placeholder: 'Luni – Vineri: 9:00 – 18:00' },
                { key: 'facebook', label: 'Facebook URL', type: 'url', placeholder: 'https://facebook.com/...' },
                { key: 'instagram', label: 'Instagram URL', type: 'url', placeholder: 'https://instagram.com/...' },
                { key: 'whatsapp', label: 'WhatsApp', type: 'text', placeholder: '+373...' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">{f.label}</label>
                  <input type={f.type} value={pageData[f.key] || ''} placeholder={f.placeholder}
                    onChange={e => setPages(p => ({ ...p, contacte: { ...p.contacte, [f.key]: e.target.value } }))}
                    className="w-full px-3 py-2 border border-[#E0D8D0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Google Maps Embed URL (opțional)</label>
              <input type="url" value={pageData.mapEmbed || ''} placeholder="https://www.google.com/maps/embed?..."
                onChange={e => setPages(p => ({ ...p, contacte: { ...p.contacte, mapEmbed: e.target.value } }))}
                className="w-full px-3 py-2 border border-[#E0D8D0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
            </div>
          </div>
        )}
      </div>

      {/* Preview hint */}
      <p className="text-[11px] text-[#B0A89E] mt-3">
        Previzualizare: <a href={`/${activePage}`} target="_blank" rel="noopener" className="text-[#3D6B5E] underline">/{activePage}</a>
      </p>
    </div>
  );
}
