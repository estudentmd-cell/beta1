import { useState, useEffect, useRef, useId } from 'react';
import { AnimatedSection, AnimatedItem, AnimatedText } from '../../components/motion/AnimatedSection';
import { JsonLd, faqSchema } from '../../utils/seo';
import useCmsStore from '../../components/cms/useCmsStore';
import { db } from '../../firebase/config';

const faqs = [
  {
    q: 'Am prea multe poze (3000+). Ce fac?',
    a: 'Perfect. Încarci toate — editorul le distribuie automat pe pagini. Nu trebuie să selectezi tu. Echipa noastră verifică și ajustează gratis.',
  },
  {
    q: 'Cât durează până primesc albumul?',
    a: '18 zile lucrătoare din momentul în care aprobi macheta și achiti. Termenul începe DUPĂ aprobarea ta finală — nu înainte.',
  },
  {
    q: 'Cât costă?',
    a: 'Albumele încep de la 85 MDL (pagini subțiri, 20×20) sau 100 MDL (pagini groase, 20×20). Prețul include aranjarea pozelor. Prețul final depinde de format și pagini — îl vezi înainte de comandă.',
  },
  {
    q: 'Pozele de pe telefon ies bine la tipar?',
    a: 'Da. Telefoanele moderne fac poze excelente pentru tipar. Verificăm fiecare imagine înainte de producție.',
  },
  {
    q: 'Ce se întâmplă dacă încep și nu termin?',
    a: 'Proiectul se salvează automat. Revii oricând — peste o oră sau o săptămână.',
  },
  {
    q: 'Pot vedea albumul înainte de tipar?',
    a: 'Da. Primești preview digital complet. Ceri modificări până ești mulțumit. Termenul de 18 zile începe doar după aprobarea ta finală.',
  },
];

function FAQItem({ q, a, editMode, onEdit, index }) {
  const [open, setOpen] = useState(false);
  const qRef = useRef(null);
  const aRef = useRef(null);
  const uid = useId();
  const buttonId = `faq-btn-${uid}`;
  const panelId = `faq-panel-${uid}`;

  const handleBlur = (field, ref) => {
    const t = ref.current?.innerText?.trim();
    if (t && t !== (field === 'q' ? q : a)) onEdit(field, t);
  };

  return (
    <div className="border-b border-[#E4E4E4]">
      <button
        id={buttonId}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
      >
        {editMode ? (
          <span ref={qRef} contentEditable suppressContentEditableWarning
            onBlur={() => handleBlur('q', qRef)}
            onClick={(e) => e.stopPropagation()}
            className="text-[15px] sm:text-[16px] font-medium text-[#1c1c1c] outline-none ring-1 ring-[#3D6B5E]/30 rounded px-1 -mx-1 cursor-text flex-1"
          >{q}</span>
        ) : (
          <span className="text-[15px] sm:text-[16px] font-medium text-[#1c1c1c]">{q}</span>
        )}
        <span className={`text-[28px] leading-none text-[#857D74] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-45' : ''}`} aria-hidden="true">
          +
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`overflow-hidden transition-all duration-300 ${open || editMode ? 'max-h-40 pb-5' : 'max-h-0'}`}
      >
        {editMode ? (
          <p ref={aRef} contentEditable suppressContentEditableWarning
            onBlur={() => handleBlur('a', aRef)}
            className="text-[15px] sm:text-[16px] text-[#6B635B] leading-relaxed outline-none ring-1 ring-[#3D6B5E]/30 rounded px-1 -mx-1 cursor-text"
          >{a}</p>
        ) : (
          <p className="text-[15px] sm:text-[16px] text-[#6B635B] leading-relaxed">{a}</p>
        )}
      </div>
    </div>
  );
}

export default function FAQ() {
  const editMode = useCmsStore((s) => s.editMode);
  const [liveFaqs, setLiveFaqs] = useState(faqs);
  const [faqImage, setFaqImage] = useState('');

  // Load from Firestore if admin has edited
  useEffect(() => {
    let cancelled = false;
    if (!db) return;
    (async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'homepage_faq', 'content'));
        if (!cancelled && snap.exists()) {
          if (snap.data().items?.length > 0) setLiveFaqs(snap.data().items);
          if (snap.data().image) setFaqImage(snap.data().image);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const handleEdit = async (idx, field, value) => {
    const updated = [...liveFaqs];
    updated[idx] = { ...updated[idx], [field]: value };
    setLiveFaqs(updated);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'homepage_faq', 'content'), { items: updated, updated_at: new Date().toISOString() }, { merge: true });
    } catch {}
  };

  return (
    <section>
      <JsonLd data={faqSchema(faqs)} />
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* FAQ — left */}
          <div className="px-6 md:px-16 py-10 md:py-16 bg-white">
            <AnimatedSection stagger staggerDelay={0.08}>
              <AnimatedItem>
                <AnimatedText
                  as="h2"
                  className="text-[28px] md:text-[38px] text-[#1c1c1c] leading-[1.1] mb-2"
                  style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
                >
                  Întrebări frecvente
                </AnimatedText>
              </AnimatedItem>
              <AnimatedItem>
                <p className="text-[15px] text-[#6B635B] mb-8">
                  Tot ce trebuie să știi despre albumele noastre.
                </p>
              </AnimatedItem>
              {liveFaqs.map((faq, i) => (
                <AnimatedItem key={i}>
                  <FAQItem q={faq.q} a={faq.a} index={i} editMode={editMode} onEdit={(field, val) => handleEdit(i, field, val)} />
                </AnimatedItem>
              ))}
            </AnimatedSection>
          </div>

          {/* IMAGE — right */}
          <div className="hidden md:block">
            <img
              src={faqImage || 'https://www.innocence-editions.com/cdn/shop/files/calendrier-photo-innocence-02.jpg?v=1761123947&width=1200'}
              alt="Album foto premium"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
