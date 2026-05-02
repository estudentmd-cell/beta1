import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useCmsStore from '../../components/cms/useCmsStore';
import { db, storage } from '../../firebase/config';
import { AnimatedHeading } from '../../components/motion/AnimatedSection';

const WA_LINK = 'https://wa.me/37360595984?text=' + encodeURIComponent('Bună! Vreau să profit de serviciul de design gratuit pentru albumul meu.');

async function uploadDesignImg(file) {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storageRef = ref(storage, `homepage/design-service/main.${file.name?.split('.').pop() || 'jpg'}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return await getDownloadURL(storageRef);
}

async function saveDesignImg(url) {
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'homepage_designservice', 'main'), { url, updated_at: new Date().toISOString() }, { merge: true });
}

async function loadDesignImg() {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'homepage_designservice', 'main'));
    return snap.exists() ? snap.data().url : null;
  } catch { return null; }
}

const steps = [
  { num: '1', text: 'Încarcă pozele pe site — simplu, din telefon sau calculator' },
  { num: '2', text: 'Apasă „Trimite către designer" — noi preluăm' },
  { num: '3', text: 'Designerul aranjează albumul, primești previzualizarea' },
  { num: '4', text: 'Confirmi, tipărim și livrăm acasă' },
];

export default function DesignService() {
  const editMode = useCmsStore((s) => s.editMode);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [imgUrl, setImgUrl] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { loadDesignImg().then((u) => { setImgUrl(u); setLoaded(true); }); }, []);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setUploading(true);
    const u = await uploadDesignImg(f);
    await saveDesignImg(u);
    setImgUrl(u);
    setUploading(false);
  };

  if (!loaded) return <div className="aspect-[2/1] rounded-2xl bg-[#f0f0f0] animate-pulse" />;

  return (
    <div>
      <AnimatedHeading className="text-[18px] sm:text-[28px] md:text-[36px] text-[#1c1c1c] sm:text-center mb-1 sm:mb-3 px-1" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
        Nu ai timp? Facem noi albumul
      </AnimatedHeading>
      <p className="text-[13px] sm:text-[16px] text-[#888] sm:text-center mb-4 sm:mb-12 max-w-lg sm:mx-auto px-1">
        Serviciu gratuit. Trimite pozele — primești albumul gata.
      </p>

      <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left — image */}
          <div className="relative md:w-[45%] aspect-[4/3] md:aspect-auto">
            <img src={imgUrl || '/images/familie.webp'} alt="Serviciu design gratuit" className="w-full h-full object-cover" draggable={false} />
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

          {/* Right — content */}
          <div className="flex-1 p-6 md:p-10 flex flex-col justify-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#3D6B5E] font-semibold mb-4">SERVICIU GRATUIT</p>

            <h3 className="text-[20px] md:text-[26px] text-[#1c1c1c] leading-tight mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
              Încarci pozele, noi facem albumul
            </h3>
            <p className="text-[14px] text-[#666] leading-relaxed mb-6">
              Perfect pentru cei ocupați. Încarci pozele pe site, apeși un buton — designerul nostru face restul.
            </p>

            {/* Steps */}
            <div className="space-y-3 mb-6">
              {steps.map((s) => (
                <div key={s.num} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#3D6B5E] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.num}</span>
                  <span className="text-[14px] text-[#444]">{s.text}</span>
                </div>
              ))}
            </div>

            <Link
              to="/colectie/toate"
              className="inline-block bg-[#3D6B5E] hover:bg-[#2f5549] text-white font-semibold text-[14px] px-7 py-3 rounded-full transition no-underline w-fit shadow-md"
            >
              Începe →
            </Link>

            <p className="text-[12px] text-[#999] mt-3">Gratuit · Fără obligații · Durează 2 minute</p>
          </div>
        </div>
      </div>
    </div>
  );
}
