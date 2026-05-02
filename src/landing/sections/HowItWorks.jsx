import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useCmsStore from '../../components/cms/useCmsStore';
import useAuthStore from '../../stores/useAuthStore';
import { db, storage } from '../../firebase/config';
import { AnimatedHeading } from '../../components/motion/AnimatedSection';
import { useBlockContent, EditableText } from './useBlockContent';

async function uploadStepImg(stepId, file) {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storageRef = ref(storage, `homepage/how-it-works/${stepId}.${file.name?.split('.').pop() || 'jpg'}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return await getDownloadURL(storageRef);
}

async function saveStepImg(stepId, url) {
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'homepage_howitworks', stepId), { url, updated_at: new Date().toISOString() }, { merge: true });
}

async function loadStepImgs() {
  try {
    const { collection: col, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(col(db, 'homepage_howitworks'));
    const m = {};
    snap.forEach((d) => { if (d.data().url) m[d.id] = d.data().url; });
    return m;
  } catch { return {}; }
}

async function loadDoc() {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'homepage_howitworks', 'texts'));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

const steps = [
  {
    id: 'step1',
    num: '01',
    title: 'Încarci pozele',
    desc: 'Din telefon, WhatsApp, de la fotograf. Chiar și 3000 de poze — fără limită.',
    image: '/images/newborn.webp',
  },
  {
    id: 'step2',
    num: '02',
    title: 'Noi le aranjăm',
    desc: 'Editorul distribuie pozele automat pe pagini. Detectează fețele, alege layout-uri. Echipa verifică gratis — tu doar aprobi.',
    image: '/images/familie.webp',
  },
  {
    id: 'step3',
    num: '03',
    title: 'Primești albumul acasă',
    desc: 'Confirmi macheta, achiti. În 18 zile lucrătoare de la aprobare — albumul e la ușa ta.',
    image: '/images/nunta.webp',
  },
];

function StepImage({ step, customUrl, editMode }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(customUrl);

  useEffect(() => { setUrl(customUrl); }, [customUrl]);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setUploading(true);
    const u = await uploadStepImg(step.id, f);
    await saveStepImg(step.id, u);
    setUrl(u);
    setUploading(false);
  };

  return (
    <div className="relative w-full flex items-center justify-center">
      <img src={url || step.image} alt={step.title}
        className="max-w-full max-h-[480px] w-auto h-auto object-contain drop-shadow-xl rounded-lg"
        draggable={false} />
      {editMode && (
        <button type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
          className={`absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg cursor-pointer transition ${uploading ? 'animate-pulse' : ''}`}>
          {uploading ? <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" /> : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
          )}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

export default function HowItWorks() {
  const editMode = useCmsStore((s) => s.editMode);
  const [current, setCurrent] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const scrollRef = useRef(null);
  const [imgs, setImgs] = useState({});
  const [loaded, setLoaded] = useState(false);
  const { data: t, save } = useBlockContent('homepage_howitworks', 'texts', {
    heading: 'Cum funcționează',
    subtitle: 'Încarci pozele. Noi facem restul. Tu doar aprobi.',
    step1_title: steps[0].title,
    step1_desc: steps[0].desc,
    step2_title: steps[1].title,
    step2_desc: steps[1].desc,
    step3_title: steps[2].title,
    step3_desc: steps[2].desc,
  });

  // Merge editable text into steps
  const liveSteps = steps.map((s, i) => ({
    ...s,
    title: t[`step${i + 1}_title`] || s.title,
    desc: t[`step${i + 1}_desc`] || s.desc,
  }));

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadStepImgs(), loadDoc()]).then(([oldImgs, textsDoc]) => {
      if (cancelled) return;
      const merged = { ...oldImgs };
      if (textsDoc.img_step1) merged.step1 = textsDoc.img_step1;
      if (textsDoc.img_step2) merged.step2 = textsDoc.img_step2;
      if (textsDoc.img_step3) merged.step3 = textsDoc.img_step3;
      setImgs(merged);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const handleMobileScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const itemWidth = el.scrollWidth / steps.length;
    setActiveStep(Math.round(el.scrollLeft / itemWidth));
  }, []);

  const step = liveSteps[current];

  if (!loaded) return <div className="aspect-[2/1] rounded-2xl bg-[#f0f0f0] animate-pulse" />;

  return (
    <div>
      <EditableText value={t.heading} field="heading" editMode={editMode} onSave={save} as="h2"
        className="text-[28px] sm:text-[28px] md:text-[36px] lg:text-[42px] text-[#1c1c1c] sm:text-center mb-1 sm:mb-3 px-1"
        style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
      />

      {/* ═══ MOBILE — horizontal carousel ═══ */}
      <div ref={scrollRef} onScroll={handleMobileScroll} className="sm:hidden overflow-x-auto pb-3" style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
        <div className="flex gap-3 px-4" style={{ width: 'max-content' }}>
          {liveSteps.map((s, i) => (
            <div key={s.id} className="bg-[#F5F5F5] rounded-2xl overflow-hidden shrink-0" style={{ width: '280px', maxWidth: '80vw', scrollSnapAlign: 'start' }}>
              <div className="aspect-[3/2] overflow-hidden bg-[#EEEAE5]">
                <img src={imgs[s.id] || s.image} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-4">
                <span className="text-[12px] font-bold text-[#3D6B5E]">{s.num}</span>
                <h3 className="text-[20px] font-bold text-[#1c1c1c] mt-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>{s.title}</h3>
                <p className="text-[15px] text-[#6B635B] mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Mobile scroll indicators */}
      <div className="flex justify-center gap-2 mt-3 sm:hidden">
        {steps.map((_, i) => (
          <div key={i} className={`h-2 rounded-full transition-all ${i === activeStep ? 'bg-[#3D6B5E] w-4' : 'bg-[#D4CFC8] w-2'}`} />
        ))}
      </div>

      {/* ═══ DESKTOP — clean layout like Popsa ═══ */}
      <div className="hidden sm:block">
        <EditableText value={t.subtitle} field="subtitle" editMode={editMode} onSave={save}
          className="text-[16px] text-[#888] text-center mb-10 md:mb-14 max-w-lg mx-auto"
        />
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Left — steps */}
          <div className="md:w-[42%] flex flex-col">
            {liveSteps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrent(i)}
                aria-label={`Pas ${s.num}: ${s.title}`}
                aria-current={i === current ? 'step' : undefined}
                className={`flex items-start gap-4 text-left py-4 transition-all border-l-[3px] pl-5 ${
                  i === current
                    ? 'border-[#3D6B5E] opacity-100'
                    : 'border-transparent opacity-50 hover:opacity-70'
                }`}
              >
                <div>
                  <span className={`text-[11px] uppercase tracking-[0.15em] font-semibold ${i === current ? 'text-[#3D6B5E]' : 'text-[#B0A89E]'}`}>
                    Pas {s.num}
                  </span>
                  <h3 className={`text-[18px] sm:text-[22px] font-bold leading-snug mt-1 ${i === current ? 'text-[#1c1c1c]' : 'text-[#999]'}`}
                    style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {s.title}
                  </h3>
                  {i === current && (
                    <p className="text-[14px] sm:text-[16px] text-[#666] mt-2 leading-relaxed">{s.desc}</p>
                  )}
                </div>
              </button>
            ))}
            <Link to="/colectie/toate" className="mt-6 inline-block text-[13px] font-semibold text-white bg-[#3D6B5E] hover:bg-[#2f5549] px-6 py-2.5 rounded-full transition no-underline w-fit ml-5">
              Începe albumul →
            </Link>
          </div>
          {/* Right — image (free, no box) */}
          <div className="md:w-[58%] flex items-center justify-center">
            <StepImage step={step} customUrl={imgs[step.id]} editMode={editMode} />
          </div>
        </div>
      </div>
    </div>
  );
}
