import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase/config';

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

const outfit = { fontFamily: 'Outfit, sans-serif' };

/* ── Imagine cu upload ── */
function Img({ label, src, imgKey, onUpload, aspect = 'aspect-[4/3]', hint }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  // Forțează remount img la schimbare URL — previne flash imagine veche
  const [imgKey2, setImgKey2] = useState(0);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setUploading(true);
    setShowSpinner(true);
    try {
      const url = await uploadImg(`homepage/travel-page/${imgKey}`, f);
      setImgKey2(k => k + 1); // forțează remount img
      onUpload(imgKey, url);
    } catch (err) { alert('Eroare: ' + err.message); setShowSpinner(false); }
    setUploading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-wide" style={outfit}>{label}</p>
        {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
      </div>
      <div className={`relative bg-gray-50 rounded-xl overflow-hidden border-2 border-dashed ${src ? 'border-transparent' : 'border-gray-200'} ${aspect}`}>
        {src ? (
          <>
            {showSpinner && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F5F3F0]">
                <div className="w-6 h-6 border-2 border-[#3D6B5E]/20 border-t-[#3D6B5E] rounded-full animate-spin" />
              </div>
            )}
            <img key={imgKey2} src={src} alt="" className={`w-full h-full object-cover transition-opacity duration-300 ${showSpinner ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setShowSpinner(false)} />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
            <svg className="w-8 h-8 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
            </svg>
            <span className="text-[11px]">Fără imagine</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-2 flex justify-end">
          <button onClick={() => fileRef.current?.click()}
            className={`px-3 py-1.5 bg-white rounded-lg text-[11px] font-semibold shadow-sm hover:bg-gray-50 transition ${uploading ? 'animate-pulse' : ''}`}>
            {uploading ? '⏳ Se încarcă...' : src ? '📷 Schimbă' : '📷 Încarcă'}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

/* ── Câmp text ── */
function Txt({ label, value, onChange, textarea, placeholder }) {
  return (
    <div>
      <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-wide mb-1" style={outfit}>{label}</p>
      {textarea ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          rows={3} className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#3D6B5E]/20 focus:border-[#3D6B5E] resize-none bg-white" />
      ) : (
        <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#3D6B5E]/20 focus:border-[#3D6B5E] bg-white" />
      )}
    </div>
  );
}

/* ── Secțiune cu header ── */
function Block({ num, title, desc, children, onSave, saving, saved }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-[#3D6B5E] text-white text-[12px] font-bold flex items-center justify-center">{num}</span>
          <div>
            <h3 className="text-[14px] font-bold text-gray-900" style={outfit}>{title}</h3>
            {desc && <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>}
          </div>
        </div>
        <button onClick={onSave} disabled={saving}
          className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${
            saved ? 'bg-green-500 text-white scale-95' : 'bg-[#1C1C1E] text-white hover:bg-[#333] active:scale-95'
          } disabled:opacity-50`} style={outfit}>
          {saving ? '⏳ Salvez...' : saved ? '✓ Salvat' : 'Salvează'}
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── Separator vizual ── */
function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider" style={outfit}>{label}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

export default function AdminTravel() {
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadDoc('homepage_travel', 'content').then(d => { setData(d); setLoaded(true); }); }, []);

  const update = (key, val) => {
    const updated = { ...data, [key]: val };
    setData(updated);
    // Auto-save imagini instant (URL-urile trebuie salvate imediat)
    if (val && typeof val === 'string' && val.startsWith('http')) {
      saveDoc('homepage_travel', 'content', updated).then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    }
  };
  const handleSave = async () => {
    setSaving(true);
    await saveDoc('homepage_travel', 'content', data);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!loaded) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-[#3D6B5E] rounded-full animate-spin mr-3" />
      Se încarcă...
    </div>
  );

  const B = (props) => <Block {...props} onSave={handleSave} saving={saving} saved={saved} />;

  return (
    <div className="space-y-4 max-w-[900px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold text-gray-900" style={outfit}>Pagina Călătorie</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">Editează toate imaginile și textele de pe pagina <code className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded">/albume-de-calatorie</code></p>
        </div>
        <a href="/albume-de-calatorie" target="_blank"
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 text-[12px] font-medium rounded-xl hover:bg-gray-200 transition" style={outfit}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Vezi live
        </a>
      </div>

      {/* ═══ 1. HERO ═══ */}
      <B num={1} title="Hero — Prima impresie" desc="Carousel cu 5 mockupuri album + titlu + subtitlu. Primul lucru pe care îl vede clientul.">
        <Divider label="Imagini carousel" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3 mb-5">
          {[1,2,3,4,5].map(i => (
            <Img key={i} label={`Mockup ${i}`} src={data[`mockup_${i}`]} imgKey={`mockup_${i}`} onUpload={update} aspect="aspect-[3/4]" hint="3:4" />
          ))}
        </div>
        <Divider label="Texte" />
        <div className="grid gap-3 mt-3">
          <Txt label="Titlu principal" value={data.hero_title} onChange={v => update('hero_title', v)} textarea placeholder="Ai sute de poze din vacanță..." />
          <Txt label="Subtitlu" value={data.hero_sub} onChange={v => update('hero_sub', v)} textarea placeholder="Transformă pozele din telefon..." />
        </div>
      </B>

      {/* ═══ 2. CUM FUNCȚIONEAZĂ ═══ */}
      <B num={2} title="Cum funcționează — 3 pași" desc="Fiecare pas are imagine + titlu + descriere. Textele apar sub imagine pe pagina live.">
        <div className="space-y-5">
          {[
            { i: 1, imgKey: 'how_img_1', titleKey: 'how_title_1', descKey: 'how_desc_1', defTitle: 'Încarci pozele', defDesc: 'Direct din telefon sau calculator. Fără aplicație separată. Le tragi și gata.' },
            { i: 2, imgKey: 'how_img_2', titleKey: 'how_title_2', descKey: 'how_desc_2', defTitle: 'Albumul se creează singur', defDesc: 'Editorul distribuie automat pozele pe pagini. Echipa noastră verifică gratis fiecare album.' },
            { i: 3, imgKey: 'how_img_3', titleKey: 'how_title_3', descKey: 'how_desc_3', defTitle: 'Primești albumul acasă', defDesc: 'Tipărit pe hârtie premium, copertă rigidă. Livrare gratuită în 18 zile lucrătoare.' },
          ].map(({ i, imgKey, titleKey, descKey, defTitle, defDesc }) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4">
              <p className="text-[12px] font-bold text-gray-700 mb-3" style={outfit}>Pas {i}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Img label="Imagine" src={data[imgKey]} imgKey={imgKey} onUpload={update} />
                <div className="space-y-3">
                  <Txt label="Titlu" value={data[titleKey]} onChange={v => update(titleKey, v)} placeholder={defTitle} />
                  <Txt label="Descriere" value={data[descKey]} onChange={v => update(descKey, v)} textarea placeholder={defDesc} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </B>

      {/* ═══ 3. OBJECTION CRUSHER ═══ */}
      <B num={3} title="De ce pozele tale sunt perfecte" desc="3 carduri care elimină obiecțiile clientului. Fiecare are imagine + text editabil.">
        <Txt label="Titlu secțiune" value={data.obj_title} onChange={v => update('obj_title', v)} placeholder="Pozele tale din telefon sunt perfecte pentru un album" />
        <div className="mt-4 space-y-5">
          {[
            { i: 1, title: 'Nu ai nevoie de aparat profesional' },
            { i: 2, title: 'Nu ai nevoie de experiență de design' },
            { i: 3, title: 'Nu durează ore' },
          ].map(({ i, title }) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4">
              <p className="text-[12px] font-bold text-gray-700 mb-3" style={outfit}>Card {i}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Img label="Imagine" src={data[`obj_img_${i}`]} imgKey={`obj_img_${i}`} onUpload={update} />
                <div className="space-y-3">
                  <Txt label="Titlu card" value={data[`obj_title_${i}`]} onChange={v => update(`obj_title_${i}`, v)} placeholder={title} />
                  <Txt label="Text descriere" value={data[`obj_${i}`]} onChange={v => update(`obj_${i}`, v)} textarea placeholder="Descriere card..." />
                </div>
              </div>
            </div>
          ))}
        </div>
      </B>

      {/* ═══ 4. BLOC EMOȚIONAL ═══ */}
      <B num={4} title="Bloc Emoțional" desc="Secțiune full-width: imagine stânga + text dreapta. Impact vizual mare.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Img label="Imagine principală" src={data.block_img} imgKey="block_img" onUpload={update} aspect="aspect-[4/3]" hint="Recomandat: 1200×900px" />
          <div className="space-y-3 flex flex-col justify-center">
            <Txt label="Titlu" value={data.block_title} onChange={v => update('block_title', v)} placeholder="1000 de poze pe telefon..." />
            <Txt label="Text" value={data.block_text} onChange={v => update('block_text', v)} textarea placeholder="Plaja, munții, străduțele..." />
          </div>
        </div>
      </B>

      {/* ═══ 5. CE PRIMEȘTI ═══ */}
      <B num={5} title="Ce primești" desc="3 carduri cu ce include albumul: calitate, livrare, copertă.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Img label="Album calitativ" src={data.get_img_1} imgKey="get_img_1" onUpload={update} />
            <p className="text-[11px] text-gray-400 mt-2 text-center" style={outfit}>Hârtie premium, culori vii</p>
          </div>
          <div>
            <Img label="Livrare gratuită" src={data.get_img_2} imgKey="get_img_2" onUpload={update} />
            <p className="text-[11px] text-gray-400 mt-2 text-center" style={outfit}>În cutie protectoare</p>
          </div>
          <div>
            <Img label="Copertă rigidă" src={data.get_img_3} imgKey="get_img_3" onUpload={update} />
            <p className="text-[11px] text-gray-400 mt-2 text-center" style={outfit}>Finisaj mat, rezistentă</p>
          </div>
        </div>
      </B>

      {/* ═══ 6. GALERIE PRODUS ═══ */}
      <B num={6} title="Galerie — Așa arată albumul" desc="4 imagini reale ale produsului. Clientul le vede într-un carousel cu thumbnails.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { i: 1, hint: 'Album deschis' },
            { i: 2, hint: 'Copertă personalizată' },
            { i: 3, hint: 'Hârtie premium' },
            { i: 4, hint: 'Cutie livrare' },
          ].map(({ i, hint }) => (
            <Img key={i} label={`Foto ${i}`} src={data[`gallery_${i}`]} imgKey={`gallery_${i}`} onUpload={update} hint={hint} />
          ))}
        </div>
      </B>

      {/* ═══ 7. CTA FINAL ═══ */}
      <B num={7} title="CTA Final — Ultimul impuls" desc="Imagine fundal full-width cu text overlay. Ultimul lucru înainte de footer.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Img label="Imagine fundal" src={data.cta_img} imgKey="cta_img" onUpload={update} aspect="aspect-video" hint="Recomandat: 1600×900px" />
          <div className="flex flex-col justify-center">
            <Txt label="Titlu overlay" value={data.cta_title} onChange={v => update('cta_title', v)} textarea placeholder="Amintirile nu au termen de valabilitate..." />
            <p className="text-[11px] text-gray-400 mt-2" style={outfit}>Apare peste imagine cu fundal semi-transparent</p>
          </div>
        </div>
      </B>
    </div>
  );
}
