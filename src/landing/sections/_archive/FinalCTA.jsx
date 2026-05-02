import { useRef, useState, useEffect } from 'react';
import useCmsStore from '../../components/cms/useCmsStore';
import { db, storage } from '../../firebase/config';

async function uploadCtaImage(file) {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const ext = file.name?.split('.').pop() || 'jpg';
  const storageRef = ref(storage, `homepage/final-cta/album.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: 'public, max-age=31536000' });
  return await getDownloadURL(storageRef);
}

async function saveCtaData(data) {
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'homepage_finalcta', 'main'), { ...data, updated_at: new Date().toISOString() }, { merge: true });
}

async function loadCtaData() {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'homepage_finalcta', 'main'));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

const WA_NUMBER = '37360595984';
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Bună! Vreau să aflu mai multe despre albumele foto.')}`;

export default function FinalCTA() {
  const editMode = useCmsStore((s) => s.editMode);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { loadCtaData().then((d) => { setData(d); setLoaded(true); }); }, []);

  const imgSrc = data?.url || '/images/familie.webp';

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setUploading(true);
    const url = await uploadCtaImage(f);
    await saveCtaData({ url });
    setData({ ...data, url });
    setUploading(false);
  };

  return (
    <section className="py-10 sm:py-16 md:py-20 bg-white">
      <div className="max-w-[1360px] mx-auto px-4 md:px-12">
        <div className="rounded-2xl bg-[#F5F5F5] overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-0">

            {/* Text */}
            <div className="flex-1 p-8 md:p-12">
              <h2 className="text-[24px] md:text-[32px] text-[#1c1c1c] leading-tight mb-4" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
                Ai întrebări? Scrie-ne direct
              </h2>
              <p className="text-[14px] md:text-[16px] text-[#666] leading-relaxed mb-6 max-w-md">
                Răspundem în 3 minute. Te ajutăm cu tot — de la alegerea albumului până la livrare.
              </p>

              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1EB954] text-white font-semibold text-[14px] px-6 py-3 rounded-full transition no-underline shadow-md"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Scrie pe WhatsApp
              </a>

              <p className="text-[12px] text-[#999] mt-3">Disponibil Luni–Vineri, 9:00–20:00</p>
            </div>

            {/* Image — editabilă */}
            <div className="relative w-full md:w-[45%] flex-shrink-0 aspect-[4/3] md:aspect-auto md:self-stretch">
              <img src={imgSrc} alt="Album foto premium" className="w-full h-full object-cover md:rounded-r-2xl" draggable={false} />
              {editMode && (
                <button type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
                  className={`absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg cursor-pointer transition ${uploading ? 'animate-pulse' : ''}`}>
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                    </svg>
                  )}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
