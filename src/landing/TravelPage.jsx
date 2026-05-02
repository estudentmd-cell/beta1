import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getAllCoverTemplatesAsync } from '../utils/coverData';
import { usePageMeta } from '../utils/seo';
import useCmsStore from '../components/cms/useCmsStore';
import { db, storage } from '../firebase/config';

/* ═══ Firebase ═══ */
async function uploadImg(blockId, file) {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const ext = file.name?.split('.').pop() || 'jpg';
  const ts = Date.now();
  const r = ref(storage, `homepage/travel-page/${blockId}_${ts}.${ext}`);
  await uploadBytes(r, file, { contentType: file.type, cacheControl: 'public, max-age=86400' });
  return await getDownloadURL(r);
}
async function saveData(d) { const { doc, setDoc } = await import('firebase/firestore'); await setDoc(doc(db, 'homepage_travel', 'content'), { ...d, updated_at: new Date().toISOString() }, { merge: true }); }
async function loadData() { try { const { doc, getDoc } = await import('firebase/firestore'); const s = await getDoc(doc(db, 'homepage_travel', 'content')); return s.exists() ? s.data() : {}; } catch { return {}; } }

/* ═══ Admin helpers ═══ */
function EditBtn({ id, onUpload, edit, cls = 'top-3 right-3' }) {
  const r = useRef(null);
  const [up, setUp] = useState(false);
  if (!edit) return null;
  return (<>
    <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); r.current?.click(); }}
      className={`absolute z-30 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg cursor-pointer transition ${up?'animate-pulse':''} ${cls}`}>
      {up ? <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>}
    </button>
    <input ref={r} type="file" accept="image/*" className="hidden" onChange={async e => { const f=e.target.files?.[0]; if(!f) return; e.target.value=''; setUp(true); const url=await uploadImg(id,f); onUpload(id,url); setUp(false); }} />
  </>);
}

function Editable({ value, field, edit, onSave, className, style, as: T='p' }) {
  const r = useRef(null);
  const blur = () => { const t=r.current?.innerText?.trim(); if(t&&t!==value) onSave(field,t); };
  if (edit) return <T ref={r} contentEditable suppressContentEditableWarning onBlur={blur} className={`${className} outline-none ring-1 ring-[#3D6B5E]/30 rounded px-1 -mx-1 cursor-text`} style={style}>{value}</T>;
  return <T className={className} style={style}>{value}</T>;
}

const F = { fontFamily: 'Outfit, sans-serif' };

/* ═══ Reusable Carousel component ═══ */
function Carousel({ items, renderItem, className = '' }) {
  const [cur, setCur] = useState(0);
  const touchRef = useRef(null);

  const onTouchStart = (e) => { touchRef.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchRef.current === null) return;
    const diff = touchRef.current - e.changedTouches[0].clientX;
    touchRef.current = null;
    if (Math.abs(diff) > 40) {
      setCur(p => diff > 0 ? Math.min(p + 1, items.length - 1) : Math.max(p - 1, 0));
    }
  };

  return (
    <div className={`sm:hidden ${className}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="overflow-hidden">
        <div className="flex" style={{ transform: `translateX(-${cur * 100}%)`, transition: 'transform 0.4s ease-out' }}>
          {items.map((item, i) => (
            <div key={i} className="w-full shrink-0 px-1">{renderItem(item, i)}</div>
          ))}
        </div>
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {items.map((_, i) => (
            <button key={i} onClick={() => setCur(i)} className="flex items-center justify-center min-h-[32px] min-w-[32px]">
              <span className={`block h-[4px] rounded-full transition-all duration-300 ${i === cur ? 'w-7 bg-[#1c1c1c]' : 'w-3 bg-[#D0CAC0]'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ DEFAULTS ═══ */
const D = {
  hero_title: 'Ai sute de poze din vacanță.\nZero pe raft.',
  hero_sub: 'Transformă pozele din telefon într-un album premium pe care îl vei ține în mâini — nu pe ecran.',
  mockup_1: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-evasion-01.jpg?v=1739446018&width=800',
  mockup_2: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-horizon-01.jpg?v=1739446682&width=800',
  mockup_3: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-odyssee-01.jpg?v=1739449038&width=800',
  mockup_4: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-nomade-01.jpg?v=1739447003&width=800',
  mockup_5: '',
  obj_title: 'Pozele tale din telefon sunt perfecte pentru un album',
  obj_1: 'Nu ai nevoie de aparat foto profesional. Albumele noastre sunt create din pozele tale, exact așa cum le-ai făcut — naturale, reale, cu suflet.',
  obj_2: 'Nu ai nevoie de experiență de design. Editorul nostru aranjează totul automat. Tu doar încarci pozele.',
  obj_3: 'Nu durează ore. Majoritatea albumelor sunt gata în 5-10 minute.',
  obj_img_1: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-evasion-01.jpg?v=1739446018&width=800',
  obj_img_2: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-horizon-01.jpg?v=1739446682&width=800',
  obj_img_3: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-odyssee-01.jpg?v=1739449038&width=800',
  how_img_1: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-nomade-01.jpg?v=1739447003&width=800',
  how_img_2: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-evasion-01.jpg?v=1739446018&width=800',
  how_img_3: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-horizon-01.jpg?v=1739446682&width=800',
  get_img_1: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-evasion-01.jpg?v=1739446018&width=800',
  get_img_2: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-odyssee-01.jpg?v=1739449038&width=800',
  get_img_3: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-nomade-01.jpg?v=1739447003&width=800',
  gallery_1: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-evasion-01.jpg?v=1739446018&width=900',
  gallery_2: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-horizon-01.jpg?v=1739446682&width=900',
  gallery_3: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-odyssee-01.jpg?v=1739449038&width=900',
  gallery_4: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-nomade-01.jpg?v=1739447003&width=900',
  block_img: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-horizon-01.jpg?v=1739446682&width=1200',
  block_title: '1000 de poze pe telefon, dar câte le-ai mai privit?',
  block_text: 'Plaja, munții, străduțele din orașul vechi, copiii care se jucau pe nisip — le-ai trăit cu sufletul. Dar stau ascunse în telefon, între screenshot-uri și meme-uri. Dă-le viața pe care o merită.',
  cta_img: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-nomade-01.jpg?v=1739447003&width=1600',
  cta_title: 'Amintirile nu au termen de valabilitate. Dar telefonul tău — da.',
};

/* ═══════════════════════════════════════════
   1. HERO — imagine de fundal + text + CTA
   ═══════════════════════════════════════════ */
function HeroSection({ data, edit, onSave, onUpload }) {
  return (
    <section className="relative min-h-[480px] sm:min-h-[560px] md:min-h-[620px] flex items-center overflow-hidden">
      <img src={data.mockup_1} alt="Album de călătorie" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
      <div className="absolute inset-0 bg-black/50" />
      <EditBtn id="mockup_1" onUpload={onUpload} edit={edit} />

      <div className="relative z-10 max-w-3xl mx-auto px-5 text-center py-16 sm:py-20">
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/50 mb-4" style={F}>ALBUME FOTO DE CĂLĂTORIE</p>
        <Editable value={data.hero_title||D.hero_title} field="hero_title" edit={edit} onSave={onSave} as="h1"
          className="text-[30px] sm:text-[44px] md:text-[56px] text-white leading-[1.08] mb-4 whitespace-pre-line" style={{...F, fontWeight: 700}} />
        <Editable value={data.hero_sub||D.hero_sub} field="hero_sub" edit={edit} onSave={onSave}
          className="text-[15px] sm:text-[17px] md:text-[19px] text-white/70 leading-relaxed max-w-xl mx-auto mb-5" style={F} />
        <p className="text-[14px] sm:text-[15px] text-white/60 mb-6" style={F}>
          De la <span className="text-[26px] sm:text-[32px] font-bold text-white">890 lei</span>
          <span className="text-white/50 ml-1.5 text-[13px] sm:text-[14px]">· 40 pagini · copertă rigidă</span>
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/colectie/calatorie"
            className="w-full sm:w-auto inline-flex items-center justify-center h-[54px] px-10 bg-white text-[#1c1c1c] text-[13px] sm:text-[12px] font-semibold uppercase tracking-[0.12em] rounded-full no-underline active:scale-[0.97] hover:bg-white/90 transition-all shadow-lg" style={F}>
            Creează albumul tău
          </Link>
          <a href="#cum-functioneaza" className="text-[13px] text-white/60 underline underline-offset-4 hover:text-white transition-colors py-2" style={F}>Cum funcționează?</a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 text-[13px] text-white/50" style={F}>
          <span className="flex items-center gap-1.5"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Verificare gratis</span>
          <span className="flex items-center gap-1.5"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-4"/></svg>Copertă rigidă</span>
          <span className="flex items-center gap-1.5"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>Livrare gratuită</span>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   2. SOCIAL PROOF
   ═══════════════════════════════════════════ */
function SocialProof() {
  return (
    <section className="py-5 sm:py-6 bg-white border-y border-[#F0EDE6]">
      <div className="max-w-4xl mx-auto px-5 flex flex-wrap items-center justify-center gap-4 sm:gap-10">
        <div className="flex items-center gap-1.5">
          {[1,2,3,4,5].map(i => <svg key={i} className="w-4 h-4 text-[#F5A623]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
          <span className="text-[14px] font-semibold text-[#1c1c1c] ml-1" style={F}>4.9</span>
        </div>
        <span className="text-[14px] text-[#8A8078]" style={F}>Peste <strong className="text-[#1c1c1c]">1,200</strong> albume create</span>
        <span className="text-[14px] text-[#8A8078]" style={F}>Livrare în toată <strong className="text-[#1c1c1c]">Moldova</strong></span>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   3. CUM FUNCȚIONEAZĂ — carousel
   ═══════════════════════════════════════════ */
function HowItWorks({ data, edit, onUpload }) {
  const steps = [
    { n: '01', imgKey: 'how_img_1', title: data.how_title_1 || 'Încarci pozele', desc: data.how_desc_1 || 'Direct din telefon sau calculator. Fără aplicație separată. Le tragi și gata.' },
    { n: '02', imgKey: 'how_img_2', title: data.how_title_2 || 'Albumul se creează singur', desc: data.how_desc_2 || 'Editorul distribuie automat pozele pe pagini. Echipa noastră verifică gratis fiecare album.' },
    { n: '03', imgKey: 'how_img_3', title: data.how_title_3 || 'Primești albumul acasă', desc: data.how_desc_3 || 'Tipărit pe hârtie premium, copertă rigidă. Livrare gratuită în 18 zile lucrătoare.' },
  ];

  const StepCard = (s) => (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.04)' }}>
      <div className="relative">
        <img src={data[s.imgKey]||D[s.imgKey]} alt={s.title} className="w-full h-auto block" loading="lazy" />
        <EditBtn id={s.imgKey} onUpload={onUpload} edit={edit} />
        <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-[#1c1c1c] text-white text-[13px] font-bold flex items-center justify-center" style={F}>{s.n}</div>
      </div>
      <div className="p-4 text-center">
        <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#1c1c1c]" style={F}>{s.title}</h3>
      </div>
    </div>
  );

  return (
    <section id="cum-functioneaza" className="py-14 sm:py-20 bg-[#FAF8F5]">
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-8 sm:mb-14">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#B0A89E] mb-3" style={F}>CUM FUNCȚIONEAZĂ</p>
          <h2 className="text-[28px] sm:text-[36px] md:text-[44px] text-[#1c1c1c] leading-[1.1]" style={{...F, fontWeight: 700}}>3 pași. 5 minute. Un album pe viață.</h2>
        </div>
        <div className="hidden sm:grid sm:grid-cols-3 gap-6">
          {steps.map((s,i) => <div key={i}>{StepCard(s)}</div>)}
        </div>
        <Carousel items={steps} renderItem={(s) => StepCard(s)} />
        <div className="text-center mt-8">
          <Link to="/colectie/calatorie" className="inline-flex items-center justify-center h-[48px] px-7 bg-[#1c1c1c] text-white text-[12px] font-semibold uppercase tracking-[0.1em] rounded-full no-underline active:scale-[0.97] hover:bg-[#333] transition-all" style={F}>Începe acum — e gratuit</Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   4. OBJECTION CRUSHER — carousel
   ═══════════════════════════════════════════ */
function ObjectionCrusher({ data, edit, onSave, onUpload }) {
  const cards = [
    { imgKey: 'obj_img_1', title: data.obj_title_1 || 'Nu ai nevoie de aparat profesional', textKey: 'obj_1' },
    { imgKey: 'obj_img_2', title: data.obj_title_2 || 'Nu ai nevoie de experiență de design', textKey: 'obj_2' },
    { imgKey: 'obj_img_3', title: data.obj_title_3 || 'Nu durează ore', textKey: 'obj_3' },
  ];

  const ObjCard = (c) => (
    <div className="bg-[#FAF8F5] rounded-2xl overflow-hidden">
      <div className="relative">
        <img src={data[c.imgKey]||D[c.imgKey]} alt={c.title} className="w-full h-auto block rounded-2xl" loading="lazy" />
        <EditBtn id={c.imgKey} onUpload={onUpload} edit={edit} />
      </div>
    </div>
  );

  return (
    <section className="py-14 sm:py-20 bg-white">
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-8 sm:mb-10">
          <Editable value={data.obj_title||D.obj_title} field="obj_title" edit={edit} onSave={onSave} as="h2"
            className="text-[26px] sm:text-[34px] md:text-[42px] text-[#1c1c1c] leading-[1.1]" style={{...F, fontWeight: 700}} />
        </div>
        <div className="hidden sm:grid sm:grid-cols-3 gap-6">
          {cards.map((c,i) => <div key={i}>{ObjCard(c)}</div>)}
        </div>
        <Carousel items={cards} renderItem={(c) => ObjCard(c)} />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   5. BLOC EMOȚIONAL
   ═══════════════════════════════════════════ */
function EmotionalBlock({ data, edit, onSave, onUpload }) {
  return (
    <section className="bg-[#F5F1EB]">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[380px] md:min-h-[500px]">
        <div className="relative aspect-[4/3] md:aspect-auto">
          <img src={data.block_img||D.block_img} alt="Album de călătorie" className="w-full h-full object-cover" loading="lazy" />
          <EditBtn id="block_img" onUpload={onUpload} edit={edit} />
        </div>
        <div className="flex items-center px-5 sm:px-10 md:px-16 py-10 md:py-0">
          <div className="max-w-md">
            <Editable value={data.block_title||D.block_title} field="block_title" edit={edit} onSave={onSave} as="h2"
              className="text-[26px] sm:text-[32px] md:text-[40px] leading-[1.12] text-[#1c1c1c] mb-4" style={{...F, fontWeight: 700}} />
            <Editable value={data.block_text||D.block_text} field="block_text" edit={edit} onSave={onSave}
              className="text-[15px] sm:text-[16px] text-[#8A8078] leading-relaxed mb-7" style={F} />
            <Link to="/colectie/calatorie" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#1c1c1c] hover:text-[#3D6B5E] transition-colors no-underline" style={F}>
              Alege un design pentru vacanța ta <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   6. CE PRIMEȘTI — carousel
   ═══════════════════════════════════════════ */
function WhatYouGet({ data, edit, onUpload }) {
  const items = [
    { imgKey: 'get_img_1', label: 'Album calitativ', sub: 'Hârtie fotografică premium, culori vii, detalii cristaline' },
    { imgKey: 'get_img_2', label: 'Livrare gratuită', sub: 'În toată Republica Moldova, în cutie protectoare' },
    { imgKey: 'get_img_3', label: 'Copertă mat rigidă', sub: 'Finisaj mat elegant, rezistentă în timp, plăcută la atingere' },
  ];

  const GetCard = (it) => (
    <div className="bg-[#FAF8F5] rounded-2xl overflow-hidden">
      <div className="relative aspect-[4/3]">
        <img src={data[it.imgKey]||D[it.imgKey]} alt={it.label} className="w-full h-full object-cover" loading="lazy" />
        <EditBtn id={it.imgKey} onUpload={onUpload} edit={edit} />
      </div>
      <div className="p-5 text-center">
        <p className="text-[18px] font-semibold text-[#1c1c1c] mb-2" style={F}>{it.label}</p>
        <p className="text-[15px] text-[#8A8078] leading-relaxed" style={F}>{it.sub}</p>
      </div>
    </div>
  );

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-5xl mx-auto px-5">
        <h2 className="text-[26px] sm:text-[32px] text-center text-[#1c1c1c] mb-8 sm:mb-10" style={{...F, fontWeight: 700}}>Ce primești</h2>
        <div className="hidden sm:grid sm:grid-cols-3 gap-6">
          {items.map((it,i) => <div key={i}>{GetCard(it)}</div>)}
        </div>
        <Carousel items={items} renderItem={(it) => GetCard(it)} />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   7. GALERIE PRODUS — carousel cu thumbnails
   ═══════════════════════════════════════════ */
function ProductGallery({ data, edit, onUpload }) {
  const images = [data.gallery_1||D.gallery_1, data.gallery_2||D.gallery_2, data.gallery_3||D.gallery_3, data.gallery_4||D.gallery_4].filter(Boolean);
  const [cur, setCur] = useState(0);
  const touchRef = useRef(null);

  return (
    <section className="py-14 sm:py-20 bg-[#F5F1EB]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#B0A89E] mb-3" style={F}>VEZI CU OCHII TĂI</p>
          <h2 className="text-[26px] sm:text-[34px] md:text-[42px] text-[#1c1c1c] leading-[1.1]" style={{...F, fontWeight: 700}}>Așa arată albumul tău</h2>
        </div>

        {/* ═══ DESKTOP — thumbnails stânga + imagine mare dreapta (stil Rosemood) ═══ */}
        <div className="hidden sm:flex gap-4">
          {/* Thumbnails vertical */}
          <div className="flex flex-col gap-2.5 w-[90px] md:w-[110px] shrink-0">
            {images.map((src, i) => (
              <button key={i} onClick={() => setCur(i)}
                className={`rounded-xl overflow-hidden aspect-square transition-all duration-300 border-2 ${i === cur ? 'border-[#3D6B5E] opacity-100' : 'border-transparent opacity-60 hover:opacity-90'}`}>
                <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
          {/* Imagine mare */}
          <div className="flex-1 relative rounded-2xl overflow-hidden bg-[#EBE7DF]">
            <img src={images[cur]} alt="Album foto" className="w-full h-full object-contain bg-[#F5F1EB]" loading="lazy" />
            <EditBtn id={`gallery_${cur+1}`} onUpload={onUpload} edit={edit} />
            {/* Counter */}
            <div className="absolute bottom-4 right-4 bg-[#1c1c1c]/60 text-white text-[13px] font-medium px-3 py-1 rounded-full backdrop-blur-sm" style={F}>
              {cur + 1} / {images.length}
            </div>
            {/* Arrows */}
            {cur > 0 && (
              <button onClick={() => setCur(p => p - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-lg transition">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            )}
            {cur < images.length - 1 && (
              <button onClick={() => setCur(p => p + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-lg transition">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* ═══ MOBIL — carousel full-width swipeable ═══ */}
        <div className="sm:hidden"
          onTouchStart={e => { touchRef.current = e.touches[0].clientX; }}
          onTouchEnd={e => { if(touchRef.current===null) return; const d=touchRef.current-e.changedTouches[0].clientX; touchRef.current=null; if(Math.abs(d)>40) setCur(p => d>0?Math.min(p+1,images.length-1):Math.max(p-1,0)); }}>
          <div className="relative rounded-2xl overflow-hidden bg-[#EBE7DF]">
            <div className="overflow-hidden">
              <div className="flex" style={{ transform: `translateX(-${cur*100}%)`, transition: 'transform 0.4s ease-out' }}>
                {images.map((src, i) => (
                  <div key={i} className="w-full shrink-0 relative">
                    <img src={src} alt="Album foto" className="w-full h-auto object-contain bg-[#F5F1EB]" loading="lazy" />
                    <EditBtn id={`gallery_${i+1}`} onUpload={onUpload} edit={edit} />
                  </div>
                ))}
              </div>
            </div>
            {/* Counter */}
            <div className="absolute bottom-3 right-3 bg-[#1c1c1c]/60 text-white text-[12px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm" style={F}>
              {cur + 1} / {images.length}
            </div>
          </div>
          {/* Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCur(i)} className="flex items-center justify-center min-h-[32px] min-w-[32px]">
                <span className={`block h-[4px] rounded-full transition-all duration-300 ${i===cur?'w-7 bg-[#1c1c1c]':'w-3 bg-[#D0CAC0]'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   8. COLECȚIE — covers carousel pe mobil
   ═══════════════════════════════════════════ */
function CollectionSection() {
  const [templates, setTemplates] = useState([]);
  useEffect(() => { getAllCoverTemplatesAsync().then(setTemplates).catch(() => {}); }, []);
  const covers = templates.filter(t => ['travel','vacation'].includes(t.theme));
  if (covers.length === 0) return null;

  const CoverCard = (t) => {
    const img = t.coverStyle?.mockupImage || t.coverStyle?.previewImage || t.coverStyle?.bgImage;
    if (!img) return null;
    return (
      <Link to={`/app/product/pagini-groase?coverId=${encodeURIComponent(t.id)}&coverName=${encodeURIComponent(t.name)}`} className="group block no-underline">
        <div className="relative bg-white rounded-xl overflow-hidden aspect-[3/4] mb-2.5 border border-[#EBE7DF] transition-shadow duration-300 group-hover:shadow-lg">
          <img src={img} alt={t.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
        <h3 className="text-[14px] sm:text-[15px] text-[#1c1c1c] leading-snug mb-1 line-clamp-2" style={F}>{t.name}</h3>
        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#3D6B5E] group-hover:underline" style={F}>
          Alege design <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </span>
      </Link>
    );
  };

  return (
    <section className="py-14 sm:py-20 bg-[#FAF8F5]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#B0A89E] mb-3" style={F}>DESIGNURI DE CĂLĂTORIE</p>
          <h2 className="text-[26px] sm:text-[34px] md:text-[42px] text-[#1c1c1c] leading-[1.1]" style={{...F, fontWeight: 700}}>Alege stilul care se potrivește vacanței tale</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {covers.map(t => <div key={t.id}>{CoverCard(t)}</div>)}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   9. CTA FINAL
   ═══════════════════════════════════════════ */
function FinalCTA({ data, edit, onSave, onUpload }) {
  return (
    <section className="relative min-h-[340px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
      <img src={data.cta_img||D.cta_img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-black/55" />
      <EditBtn id="cta_img" onUpload={onUpload} edit={edit} />
      <div className="relative z-10 text-center px-5 py-14 sm:py-20 max-w-2xl mx-auto">
        <Editable value={data.cta_title||D.cta_title} field="cta_title" edit={edit} onSave={onSave} as="h2"
          className="text-[26px] sm:text-[36px] md:text-[46px] text-white leading-[1.1] mb-3" style={{...F, fontWeight: 700}} />
        <p className="text-[14px] sm:text-[16px] text-white/50 mb-8" style={F}>De la 890 lei · Hârtie premium · Design inclus · Livrare gratuită</p>
        <Link to="/colectie/calatorie"
          className="w-full sm:w-auto inline-flex items-center justify-center h-[52px] px-10 bg-white text-[#1c1c1c] text-[12px] font-semibold uppercase tracking-[0.12em] rounded-full no-underline active:scale-[0.97] hover:bg-white/90 transition-all shadow-lg" style={F}>
          Creează albumul de călătorie
        </Link>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   10. STICKY CTA MOBIL
   ═══════════════════════════════════════════ */
function StickyCTA() {
  const [v, setV] = useState(false);
  useEffect(() => { const fn = () => setV(window.scrollY > 500); window.addEventListener('scroll', fn, { passive: true }); return () => window.removeEventListener('scroll', fn); }, []);
  if (!v) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="bg-white/95 backdrop-blur-xl border-t border-black/[0.06] px-4 py-3">
        <Link to="/colectie/calatorie" className="flex items-center justify-center h-[48px] bg-[#1c1c1c] text-white text-[13px] font-semibold rounded-full no-underline active:scale-[0.97] transition-all w-full" style={F}>
          Creează albumul — de la 890 lei
        </Link>
      </div>
    </div>
  );
}

/* ═══ No localStorage cache — always load fresh from Firestore to avoid stale image flash ═══ */

/* ═══════════════════════════════════════════
   PAGINA PRINCIPALĂ
   ═══════════════════════════════════════════ */
export default function TravelPage() {
  const edit = useCmsStore(s => s.editMode);
  const [data, setData] = useState(D);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadData().then(d => {
      if (cancelled) return;
      setData({ ...D, ...d });
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  usePageMeta({
    title: 'Albume foto de călătorie — transformă pozele din vacanță într-un album',
    description: 'Ai sute de poze din vacanță pe telefon. Transformă-le într-un album premium cu copertă rigidă, hârtie fotografică și livrare gratuită în toată Moldova. De la 890 lei.',
    path: '/albume-de-calatorie',
  });

  const save = async (f, v) => { const u = {...data, [f]: v}; setData(u); await saveData(u); };
  const upload = async (id, url) => { const u = {...data, [id]: url}; setData(u); await saveData(u); };

  /* Skeleton while waiting for Firestore (first visit, no cache) */
  if (!ready) return (
    <div className="min-h-screen bg-white animate-pulse">
      <div className="h-[480px] sm:h-[560px] md:h-[620px] bg-[#EBE7DF]" />
      <div className="py-6 bg-white"><div className="max-w-4xl mx-auto px-5 h-6 bg-[#F0EDE6] rounded" /></div>
      <div className="py-14 bg-[#FAF8F5]"><div className="max-w-5xl mx-auto px-5 grid sm:grid-cols-3 gap-6">{[1,2,3].map(i=><div key={i} className="h-64 bg-[#EBE7DF] rounded-2xl" />)}</div></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-0 overflow-x-hidden">
      <HeroSection data={data} edit={edit} onSave={save} onUpload={upload} />
      <SocialProof />
      <HowItWorks data={data} edit={edit} onUpload={upload} />
      <CollectionSection />
      <ObjectionCrusher data={data} edit={edit} onSave={save} onUpload={upload} />
      <EmotionalBlock data={data} edit={edit} onSave={save} onUpload={upload} />
      <WhatYouGet data={data} edit={edit} onUpload={upload} />
      <ProductGallery data={data} edit={edit} onUpload={upload} />
      <FinalCTA data={data} edit={edit} onSave={save} onUpload={upload} />
      <StickyCTA />
    </div>
  );
}
