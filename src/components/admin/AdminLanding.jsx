import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase/config';

/* ═══ Firebase helpers ═══ */
async function loadDoc(col, docId) {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, col, docId));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

async function saveDoc(col, docId, data) {
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, col, docId), { ...data, updated_at: new Date().toISOString() }, { merge: true });
}

async function uploadImg(path, file) {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const ext = file.name?.split('.').pop() || 'webp';
  const storageRef = ref(storage, `${path}_${Date.now()}.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return await getDownloadURL(storageRef);
}

/* ═══ Section Card — exact ca Hero Slideshow ═══ */
function SectionCard({ num, title, subtitle, collection, docId, storagePath, images = [], fields = [], gallerySlots = 0, children }) {
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [imgLoading, setImgLoading] = useState({});
  const fileRefs = useRef({});

  useEffect(() => { loadDoc(collection, docId).then(d => { setData(d); setLoaded(true); }); }, []);

  const update = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const handleUpload = async (key, file) => {
    setUploading(key);
    setImgLoading(prev => ({ ...prev, [key]: true }));
    try {
      const url = await uploadImg(`${storagePath || `homepage/${collection}`}/${key}`, file);
      update(key, url);
      await saveDoc(collection, docId, { [key]: url });
    } catch (err) {
      alert('Eroare: ' + err.message);
      setImgLoading(prev => ({ ...prev, [key]: false }));
    }
    setUploading(null);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveDoc(collection, docId, data);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!loaded) return <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-40" />;

  const galleryKeys = gallerySlots > 0 ? Array.from({ length: gallerySlots }, (_, i) => `img${i + 1}`) : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">#{num}</span>
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          </div>
          {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={handleSave} disabled={saving}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
            saved ? 'bg-green-500 text-white' : 'bg-[#3D6B5E] text-white hover:bg-[#2d5445]'
          } disabled:opacity-50`}>
          {saving ? 'Se salvează...' : saved ? '✓ Salvat!' : 'Salvează'}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Images + Fields — 2 columns like Hero */}
        <div className={`grid gap-4 ${images.length > 0 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Left: Images */}
          {images.length > 0 && (
            <div className="space-y-3">
              {images.map(img => (
                <div key={img.key}>
                  <p className="text-[10px] text-gray-500 font-medium uppercase mb-1.5">{img.label}</p>
                  <div className={`relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center ${img.aspect || 'aspect-[4/3]'}`}>
                    {data[img.key] ? (
                      <>
                        {imgLoading[img.key] && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F5F3F0]">
                            <div className="w-6 h-6 border-2 border-[#3D6B5E]/20 border-t-[#3D6B5E] rounded-full animate-spin" />
                          </div>
                        )}
                        <img src={data[img.key]} alt=""
                          className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoading[img.key] ? 'opacity-0' : 'opacity-100'}`}
                          onLoad={() => setImgLoading(prev => ({ ...prev, [img.key]: false }))} />
                      </>
                    ) : (
                      <div className="text-center text-gray-400">
                        <p className="text-3xl mb-1">📷</p>
                        <p className="text-xs">Încarcă imagine</p>
                      </div>
                    )}
                    <button onClick={() => fileRefs.current[img.key]?.click()}
                      className={`absolute top-2 right-2 px-3 py-1.5 bg-white/90 rounded-lg text-xs font-medium shadow hover:bg-white transition ${uploading === img.key ? 'animate-pulse' : ''}`}>
                      {uploading === img.key ? 'Se încarcă...' : data[img.key] ? 'Schimbă' : 'Încarcă'}
                    </button>
                    <input ref={el => fileRefs.current[img.key] = el} type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handleUpload(img.key, e.target.files[0]); e.target.value = ''; }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Right: Text fields */}
          {fields.length > 0 && (
            <div className="space-y-3">
              {fields.map(f => (
                <div key={f.key}>
                  <p className="text-[10px] text-gray-500 font-medium uppercase mb-1">{f.label}</p>
                  {f.type === 'textarea' ? (
                    <textarea value={data[f.key] || f.default || ''} onChange={e => update(f.key, e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]/30 resize-none" />
                  ) : f.type === 'color' ? (
                    <div className="flex items-center gap-2">
                      <input type="color" value={data[f.key] || f.default || '#000000'} onChange={e => update(f.key, e.target.value)}
                        className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                      <input value={data[f.key] || f.default || ''} onChange={e => update(f.key, e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]/30 font-mono" />
                    </div>
                  ) : (
                    <input value={data[f.key] || f.default || ''} onChange={e => update(f.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]/30" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gallery grid */}
        {gallerySlots > 0 && (
          <div className="mt-4">
            <p className="text-[10px] text-gray-500 font-medium uppercase mb-2">Galerie ({gallerySlots} imagini)</p>
            <div className="grid grid-cols-3 gap-3">
              {galleryKeys.map(slot => (
                <div key={slot} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  {data[slot] ? (
                    <>
                      {imgLoading[slot] && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F5F3F0]">
                          <div className="w-5 h-5 border-2 border-[#3D6B5E]/20 border-t-[#3D6B5E] rounded-full animate-spin" />
                        </div>
                      )}
                      <img src={data[slot]} alt=""
                        className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoading[slot] ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={() => setImgLoading(prev => ({ ...prev, [slot]: false }))} />
                    </>
                  ) : (
                    <div className="text-center text-gray-400">
                      <p className="text-2xl">+</p>
                    </div>
                  )}
                  <button onClick={() => fileRefs.current[slot]?.click()}
                    className={`absolute top-1 right-1 px-2 py-1 bg-white/90 rounded text-[10px] font-medium shadow hover:bg-white transition ${uploading === slot ? 'animate-pulse' : ''}`}>
                    {uploading === slot ? '...' : data[slot] ? '✏️' : '📷'}
                  </button>
                  <input ref={el => fileRefs.current[slot] = el} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleUpload(slot, e.target.files[0]); e.target.value = ''; }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom children (FAQ etc) */}
        {children}
      </div>
    </div>
  );
}

/* ═══ FAQ Editor ═══ */
function FAQEditor() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadDoc('homepage_faq', 'content').then(d => {
      setItems(d.items || [
        { q: 'Am prea multe poze (3000+). Ce fac?', a: 'Perfect. Încarci toate — editorul le distribuie automat pe pagini.' },
        { q: 'Cât durează până primesc albumul?', a: '18 zile lucrătoare din momentul în care aprobi macheta și achiti.' },
        { q: 'Cât costă?', a: 'Albumele încep de la 85 MDL (pagini subțiri) sau 100 MDL (pagini groase).' },
      ]);
      setLoaded(true);
    });
  }, []);

  const handleChange = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const addItem = () => setItems([...items, { q: '', a: '' }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    await saveDoc('homepage_faq', 'content', { items });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!loaded) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">#11</span>
          <h3 className="text-sm font-bold text-gray-900">FAQ — Întrebări frecvente</h3>
          <span className="text-[11px] text-gray-400">{items.length} întrebări</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addItem} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300 transition">
            + Întrebare
          </button>
          <button onClick={handleSave} disabled={saving}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              saved ? 'bg-green-500 text-white' : 'bg-[#3D6B5E] text-white hover:bg-[#2d5445]'
            } disabled:opacity-50`}>
            {saving ? 'Se salvează...' : saved ? '✓ Salvat!' : 'Salvează'}
          </button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-gray-500 font-medium uppercase">Întrebarea {i + 1}</span>
              <button onClick={() => removeItem(i)} className="text-[10px] text-red-400 hover:text-red-600">Șterge</button>
            </div>
            <input value={item.q} onChange={e => handleChange(i, 'q', e.target.value)} placeholder="Întrebarea..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]/30 mb-2" />
            <textarea value={item.a} onChange={e => handleChange(i, 'a', e.target.value)} placeholder="Răspunsul..." rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]/30 resize-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ MAIN ═══ */
export default function AdminLanding() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Landing Page</h2>
          <p className="text-sm text-gray-500 mt-0.5">12 secțiuni · Pagina principală</p>
        </div>
      </div>

      {/* 1. Announcement Bar */}
      <SectionCard num={1} title="Bara de sus (Announcement)" collection="homepage_announcement" docId="texts"
        fields={[
          { key: 'fallback_message', label: 'Mesaj (când nu sunt oferte)', default: '📸 Album foto de la 85 MDL · Încarci pozele, noi aranjăm · Livrare în toată Moldova', type: 'textarea' },
          { key: 'fallback_link_text', label: 'Text link', default: 'Începe acum →' },
          { key: 'fallback_link_url', label: 'URL link', default: '/colectie/toate' },
          { key: 'bg_color', label: 'Culoare fundal', default: '#2C2520', type: 'color' },
          { key: 'text_color', label: 'Culoare text', default: '#ffffff', type: 'color' },
        ]}
      />

      {/* 2. Hero — link */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">#2</span>
            <h3 className="text-sm font-bold text-gray-900">Hero Slideshow</h3>
            <span className="text-[11px] text-gray-400">Pagină dedicată</span>
          </div>
          <a href="/admin_panel/hero" className="px-4 py-1.5 bg-[#3D6B5E] text-white rounded-lg text-xs font-bold hover:bg-[#2d5445] transition">
            Editează Hero →
          </a>
        </div>
      </div>

      {/* 3. Teme albume — 4 carduri individuale */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#3D6B5E] text-white text-[12px] font-bold flex items-center justify-center">3</span>
            <div>
              <h3 className="text-[14px] font-bold text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Teme albume</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">4 carduri cu tematică — fiecare cu imagine + text emoțional</p>
            </div>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { id: 'bunici', label: 'Newborn', defText: 'Primele zile sunt irepetabile. Pune-le într-un album.' },
            { id: 'copii', label: 'Copii', defText: 'Copiii cresc în fiecare zi. Pozele rămân în telefon.' },
            { id: 'nunti', label: 'Nuntă', defText: '2000 de poze de la nuntă. Câte le-ai mai răsfoit?' },
            { id: 'telefon', label: 'Zi de naștere', defText: 'Fiecare zi de naștere e unică. Fă-le un album.' },
          ].map(card => (
            <SectionCard key={card.id} num="" title={card.label} subtitle={`Card "${card.label}"`}
              collection="homepage_images" docId="texts"
              storagePath="homepage/collection-cards"
              images={[
                { key: `img_${card.id}`, label: `Imagine — ${card.label}`, aspect: 'aspect-[3/4]' },
              ]}
              fields={[
                { key: `${card.id}_emotional`, label: 'Text emoțional', default: card.defText, type: 'textarea' },
              ]}
            />
          ))}
        </div>
      </div>

      {/* 4. Cum funcționează */}
      <SectionCard num={4} title="Cum funcționează" subtitle="3 pași cu imagine + text"
        collection="homepage_howitworks" docId="texts"
        images={[
          { key: 'img_step1', label: 'Imagine pas 1', aspect: 'aspect-[16/10]' },
          { key: 'img_step2', label: 'Imagine pas 2', aspect: 'aspect-[16/10]' },
          { key: 'img_step3', label: 'Imagine pas 3', aspect: 'aspect-[16/10]' },
        ]}
        fields={[
          { key: 'heading', label: 'Titlu secțiune', default: 'Cum funcționează' },
          { key: 'subtitle', label: 'Subtitlu', default: 'Încarci pozele. Noi facem restul. Tu doar aprobi.' },
          { key: 'step1_title', label: 'Pas 1 — Titlu', default: 'Încarci pozele' },
          { key: 'step1_desc', label: 'Pas 1 — Descriere', default: 'Din telefon, WhatsApp, de la fotograf.', type: 'textarea' },
          { key: 'step2_title', label: 'Pas 2 — Titlu', default: 'Noi le aranjăm' },
          { key: 'step2_desc', label: 'Pas 2 — Descriere', default: 'Editorul distribuie pozele automat pe pagini.', type: 'textarea' },
          { key: 'step3_title', label: 'Pas 3 — Titlu', default: 'Primești albumul acasă' },
          { key: 'step3_desc', label: 'Pas 3 — Descriere', default: 'Confirmi macheta, achiti. În 18 zile — albumul e la ușa ta.', type: 'textarea' },
        ]}
      />

      {/* 5. Album deschis */}
      <SectionCard num={5} title="Album deschis" subtitle="Galerie 6 poze + texte"
        collection="homepage_openalbum" docId="texts"
        images={[
          { key: 'bg_image', label: 'Imagine fundal', aspect: 'aspect-video' },
        ]}
        fields={[
          { key: 'title', label: 'Titlu', default: 'Așa arată pozele tale tipărite' },
          { key: 'subtitle', label: 'Subtitlu', default: 'Hârtie premium, culori vii, pagini groase.', type: 'textarea' },
        ]}
      />
      <SectionCard num="5b" title="Album deschis — Galerie" subtitle="6 imagini"
        collection="open-album-gallery" docId="gallery"
        storagePath="homepage/open-album-gallery"
        gallerySlots={6}
        fields={[]}
      />

      {/* 6. Oferte */}
      <SectionCard num={6} title="Secțiunea Oferte" subtitle="Header text"
        collection="homepage_hotoffers" docId="texts"
        fields={[
          { key: 'label', label: 'Label mic', default: 'OFERTE LIMITATE' },
          { key: 'heading', label: 'Titlu', default: 'Prețuri speciale' },
        ]}
      />

      {/* 7. Carusel albume */}
      <SectionCard num={7} title="Carusel albume" subtitle="Titlu + buton"
        collection="homepage_carousel" docId="texts"
        fields={[
          { key: 'label', label: 'Label mic', default: 'ALBUMURILE FOTO CELE MAI VÂNDUTE' },
          { key: 'heading', label: 'Titlu', default: 'Cărți foto cartonate' },
          { key: 'cta_text', label: 'Text buton', default: 'VEZI TOT' },
          { key: 'cta_link', label: 'Link buton', default: '/colectie/toate' },
        ]}
      />

      {/* 8. Banner Călătorie */}
      <SectionCard num={8} title="Banner Călătorie" subtitle="Carousel imagini + text + buton"
        collection="homepage_travelbanner" docId="texts"
        storagePath="homepage/travel-banner"
        images={[
          { key: 'image', label: 'Imagine 1', aspect: 'aspect-video' },
          { key: 'image_2', label: 'Imagine 2', aspect: 'aspect-video' },
          { key: 'image_3', label: 'Imagine 3', aspect: 'aspect-video' },
        ]}
        fields={[
          { key: 'title', label: 'Titlu', default: 'Vacanța s-a terminat.\nPozele — încă pe telefon.', type: 'textarea' },
          { key: 'text', label: 'Text', default: 'Mare, munți, apusuri — toate alea frumoase pe care le-ai pozat.', type: 'textarea' },
          { key: 'cta', label: 'Buton text', default: 'Album de călătorie →' },
        ]}
      />

      {/* 9. Banner Cadou */}
      <SectionCard num={9} title="Banner Cadou" subtitle="Carousel imagini + text + buton"
        collection="homepage_giftbanner" docId="texts"
        storagePath="homepage/gift-banner"
        images={[
          { key: 'image', label: 'Imagine 1', aspect: 'aspect-video' },
          { key: 'image_2', label: 'Imagine 2', aspect: 'aspect-video' },
          { key: 'image_3', label: 'Imagine 3', aspect: 'aspect-video' },
        ]}
        fields={[
          { key: 'label', label: 'Label mic', default: 'IDEE DE CADOU' },
          { key: 'title', label: 'Titlu', default: 'Cel mai bun cadou?\nAmintirile tipărite.', type: 'textarea' },
          { key: 'text', label: 'Text', default: 'Nu e un obiect. E o emoție care se deschide la fiecare pagină.', type: 'textarea' },
          { key: 'cta', label: 'Buton text', default: 'Creează un cadou →' },
        ]}
      />

      {/* 10. Trust Strip */}
      <SectionCard num={10} title="Trust Strip" subtitle="3 badge-uri"
        collection="homepage_truststrip" docId="texts"
        images={[
          { key: 'icon1', label: 'Icon 1', aspect: 'aspect-square' },
          { key: 'icon2', label: 'Icon 2', aspect: 'aspect-square' },
          { key: 'icon3', label: 'Icon 3', aspect: 'aspect-square' },
        ]}
        fields={[
          { key: 'title1', label: 'Badge 1 — Titlu', default: 'LIVRARE ÎN TOATĂ MOLDOVA' },
          { key: 'desc1', label: 'Badge 1 — Descriere', default: 'Primești albumul acasă' },
          { key: 'title2', label: 'Badge 2 — Titlu', default: 'HÂRTIE FOTOGRAFICĂ PREMIUM' },
          { key: 'desc2', label: 'Badge 2 — Descriere', default: 'Culori vii, rezistente în timp' },
          { key: 'title3', label: 'Badge 3 — Titlu', default: '2000+ ALBUME TIPĂRITE' },
          { key: 'desc3', label: 'Badge 3 — Descriere', default: 'Rating 4.9 pe Google' },
        ]}
      />

      {/* 11. FAQ */}
      <SectionCard num={11} title="FAQ — Imagine" subtitle="Imaginea din dreapta"
        collection="homepage_faq" docId="content"
        images={[
          { key: 'image', label: 'Imagine FAQ', aspect: 'aspect-[3/4]' },
        ]}
        fields={[]}
      />
      <FAQEditor />

      {/* 12. Buton flotant */}
      <SectionCard num={12} title="Buton flotant" subtitle="Doar mobil"
        collection="homepage_floatingcta" docId="texts"
        fields={[
          { key: 'label', label: 'Text (fără ofertă)', default: 'Începe albumul — de la {price} MDL' },
          { key: 'label_offer', label: 'Text (cu ofertă)', default: 'Începe albumul — {price} MDL' },
          { key: 'link', label: 'Link', default: '/colectie/toate' },
        ]}
      />
    </div>
  );
}
