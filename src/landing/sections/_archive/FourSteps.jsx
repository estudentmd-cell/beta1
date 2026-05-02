import { useState, useRef, useEffect } from 'react';
import useCmsStore from '../../components/cms/useCmsStore';
import { db, storage } from '../../firebase/config';

/* ─── Firebase helpers ─── */
async function uploadStepImage(stepId, file) {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const ext = file.name?.split('.').pop() || 'jpg';
  const path = `homepage/four-steps/${stepId}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: 'public, max-age=31536000' });
  return await getDownloadURL(storageRef);
}

async function saveStepData(stepId, data) {
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'homepage_foursteps', stepId), { ...data, updated_at: new Date().toISOString() }, { merge: true });
}

async function loadAllSteps() {
  try {
    const { collection: col, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(col(db, 'homepage_foursteps'));
    const map = {};
    snap.forEach((d) => { map[d.id] = d.data(); });
    return map;
  } catch { return {}; }
}

const steps = [
  {
    id: 'step1',
    num: 1,
    title: 'Încarcă pozele',
    desc: 'De pe telefon sau calculator — trage pozele și gata.',
    image: '/images/nunta.webp',
  },
  {
    id: 'step2',
    num: 2,
    title: 'Alege layout-ul',
    desc: 'Peste 50 de template-uri. Sau aranjează manual cum vrei.',
    image: '/images/newborn.webp',
  },
  {
    id: 'step3',
    num: 3,
    title: 'Personalizează',
    desc: 'Schimbă textul, fonturile, culorile. Fă-l al tău.',
    image: '/images/familie.webp',
  },
  {
    id: 'step4',
    num: 4,
    title: 'Comandă și primești acasă',
    desc: 'Tipărim premium, livrăm în 3-5 zile în toată Moldova.',
    image: '/images/nunta.webp',
  },
];

function StepCard({ step, stepData, editMode, onUpdate, active }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const imgSrc = stepData?.url || step.image;

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setUploading(true);
    const url = await uploadStepImage(step.id, f);
    await saveStepData(step.id, { url });
    onUpdate(step.id, { ...stepData, url });
    setUploading(false);
  };

  return (
    <div className={`flex-shrink-0 w-full rounded-2xl bg-[#F5F5F5] p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-40'}`}>
      {/* Text */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[20px] md:text-[24px] text-[#1c1c1c] leading-tight mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          {step.title}
        </h3>
        <p className="text-[14px] text-[#666] leading-relaxed">{step.desc}</p>
      </div>

      {/* Image mask */}
      <div className="relative w-full md:w-[55%] aspect-[16/10] rounded-xl overflow-hidden flex-shrink-0">
        <img src={imgSrc} alt={step.title} className="w-full h-full object-cover" draggable={false} />
        {editMode && (
          <button type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
            className={`absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg cursor-pointer transition ${uploading ? 'animate-pulse' : ''}`}>
            {uploading ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            )}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

export default function FourSteps() {
  const editMode = useCmsStore((s) => s.editMode);
  const [current, setCurrent] = useState(0);
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { loadAllSteps().then((d) => { setData(d); setLoaded(true); }); }, []);

  const handleUpdate = (id, d) => setData((prev) => ({ ...prev, [id]: d }));

  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => Math.min(steps.length - 1, c + 1));

  if (!loaded) return <div className="aspect-[2/1] rounded-2xl bg-[#f0f0f0] animate-pulse" />;

  return (
    <div>
      {/* Slider */}
      <div className="relative">
        <StepCard
          step={steps[current]}
          stepData={data[steps[current].id]}
          editMode={editMode}
          onUpdate={handleUpdate}
          active
        />

        {/* Arrows */}
        <button onClick={prev} disabled={current === 0}
          className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition disabled:opacity-30 hidden md:flex">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button onClick={next} disabled={current === steps.length - 1}
          className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition disabled:opacity-30 hidden md:flex">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mt-5">
        <span className="text-[13px] font-semibold text-[#3D6B5E]">Pasul {current + 1}</span>
      </div>
      <div className="flex gap-2 mt-2">
        {steps.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= current ? '#3D6B5E' : '#E0E0E0' }}
          />
        ))}
      </div>

      {/* Mobile swipe buttons */}
      <div className="flex gap-3 mt-4 md:hidden">
        <button onClick={prev} disabled={current === 0}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 disabled:opacity-30 transition">← Înapoi</button>
        <button onClick={next} disabled={current === steps.length - 1}
          className="flex-1 py-2.5 rounded-xl bg-[#3D6B5E] text-white text-sm font-medium disabled:opacity-30 transition">Următorul →</button>
      </div>
    </div>
  );
}
