import { useRef, useState, useEffect } from 'react';
import useCmsStore from '../../components/cms/useCmsStore';
import { db, storage } from '../../firebase/config';

async function uploadWhyImage(file) {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const ext = file.name?.split('.').pop() || 'jpg';
  const path = `homepage/why-choose/album.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: 'public, max-age=31536000' });
  return await getDownloadURL(storageRef);
}

async function saveWhyData(data) {
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'homepage_whychoose', 'main'), { ...data, updated_at: new Date().toISOString() }, { merge: true });
}

async function loadWhyData() {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'homepage_whychoose', 'main'));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

const reasons = [
  {
    icon: '♥',
    title: 'Șabloane gata făcute',
    desc: 'Designerii s-au gândit la toate — fotografia și textul vor arăta armonios.',
  },
  {
    icon: '♥',
    title: 'Sprijin grijuliu',
    desc: 'Răspundem în 3 minute și luăm întotdeauna partea clientului.',
  },
  {
    icon: '♥',
    title: 'Livrare rapidă',
    desc: 'Tipărim în 2-3 zile, livrăm în toată Moldova.',
  },
  {
    icon: '♥',
    title: 'Economisești timp',
    desc: 'Un editor simplu și rapid. Sau ne trimiți pozele și facem noi totul.',
  },
];

export default function WhyChoose() {
  const editMode = useCmsStore((s) => s.editMode);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { loadWhyData().then((d) => { setData(d); setLoaded(true); }); }, []);

  const imgSrc = data?.url || '/images/familie.webp';

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setUploading(true);
    const url = await uploadWhyImage(f);
    await saveWhyData({ url });
    setData({ ...data, url });
    setUploading(false);
  };

  if (!loaded) return <div className="aspect-[2/1] rounded-2xl bg-[#f0f0f0] animate-pulse" />;

  return (
    <div>
      {/* ═══ MOBILE — horizontal carousel ═══ */}
      <div className="sm:hidden overflow-x-auto pb-2" style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
        <div className="flex gap-3 px-4" style={{ width: 'max-content' }}>
          {reasons.map((r, i) => (
            <div key={i} className="bg-[#F5F5F5] rounded-2xl p-4 shrink-0" style={{ width: '220px', scrollSnapAlign: 'start' }}>
              <span className="text-[#3D6B5E] text-xl" aria-hidden="true">♥</span>
              <h3 className="text-[14px] text-[#1c1c1c] font-bold mt-1 mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{r.title}</h3>
              <p className="text-[12px] text-[#8A8078] leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ DESKTOP — original layout ═══ */}
      <div className="hidden sm:block rounded-2xl bg-[#F5F5F5] p-6 md:p-10">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
          <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reasons.map((r, i) => (
              <div key={i}>
                <span className="text-[#3D6B5E] text-lg" aria-hidden="true">♥</span>
                <h3 className="text-[16px] md:text-[18px] text-[#1c1c1c] font-semibold mt-1 mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{r.title}</h3>
                <p className="text-[13px] text-[#666] leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
          <div className="relative w-full md:w-[40%] flex-shrink-0">
            <div className="relative aspect-square rounded-xl overflow-hidden">
              <img src={imgSrc} alt="Album foto premium" className="w-full h-full object-cover" draggable={false} />
              {editMode && (
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
                  className={`absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg cursor-pointer transition ${uploading ? 'animate-pulse' : ''}`}>
                  {uploading ? <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" /> :
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
