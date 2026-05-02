import { useState } from 'react';
import { Link } from 'react-router-dom';

const questions = [
  {
    title: 'Pentru ce vrei albumul?',
    key: 'scop',
    options: [
      { id: 'cadou', emoji: '🎁', label: 'Cadou pentru cineva drag' },
      { id: 'vacanta', emoji: '🏖️', label: 'Amintiri din vacanță' },
      { id: 'nunta', emoji: '💒', label: 'Album de nuntă / botez' },
      { id: 'bebe', emoji: '👶', label: 'Primul an al bebelușului' },
      { id: 'personal', emoji: '📸', label: 'Să-mi păstrez pozele' },
    ],
  },
  {
    title: 'Câte poze vrei să pui?',
    key: 'poze',
    options: [
      { id: '50', label: 'Până la 50' },
      { id: '100', label: '50 – 100' },
      { id: '150', label: '100 – 150' },
      { id: '200', label: 'Peste 150' },
    ],
  },
  {
    title: 'Ce format preferi?',
    key: 'format',
    options: [
      { id: 'patrat', label: 'Pătrat (20×20)' },
      { id: 'orizontal', label: 'Orizontal (20×30)' },
      { id: 'mare', label: 'Mare (30×30)' },
      { id: 'nu-stiu', label: 'Nu știu — recomandă-mi' },
    ],
  },
  {
    title: 'Care e bugetul tău?',
    key: 'buget',
    options: [
      { id: '500', label: 'Până la 500 lei' },
      { id: '800', label: '500 – 800 lei' },
      { id: '1000', label: 'Peste 800 lei' },
      { id: 'orice', label: 'Nu contează, vreau calitate' },
    ],
  },
];

function getRecommendation(answers) {
  const { scop, format } = answers;

  // Mapare scop → colecție
  const scopMap = {
    nunta: { slug: 'nunti', name: 'Album de Nuntă', desc: 'Design elegant pentru cea mai frumoasă zi.' },
    bebe: { slug: 'copii', name: 'Album Primul An', desc: 'Fiecare moment al primului an, într-un album de suflet.' },
    vacanta: { slug: 'calatorie', name: 'Album de Călătorie', desc: 'Destinațiile tale merită un album premium.' },
    cadou: { slug: 'familie', name: 'Album de Familie', desc: 'Cel mai frumos cadou — amintirile tipărite.' },
    personal: { slug: 'toate', name: 'Album Foto Personalizat', desc: 'Alege din peste 50 de template-uri.' },
  };

  const rec = scopMap[scop] || scopMap.personal;

  // Format recomandat
  let formatText = '20×20 cm';
  if (format === 'orizontal') formatText = '20×30 cm';
  else if (format === 'mare') formatText = '30×30 cm';
  else if (format === 'nu-stiu') {
    formatText = scop === 'nunta' ? '23×23 cm' : '20×20 cm';
  }

  return { ...rec, format: formatText };
}

/* ─── Quiz Modal ─── */
function QuizModal({ onClose }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);

  const isResult = step >= questions.length;
  const progress = Math.round(((step) / questions.length) * 100);

  const handleSelect = (optionId) => {
    setSelected(optionId);
  };

  const handleNext = () => {
    if (!selected && !isResult) return;
    const q = questions[step];
    setAnswers({ ...answers, [q.key]: selected });
    setSelected(null);
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep(step - 1);
    const prevQ = questions[step - 1];
    setSelected(answers[prevQ.key] || null);
  };

  const handleReset = () => {
    setStep(0);
    setAnswers({});
    setSelected(null);
  };

  const rec = isResult ? getRecommendation(answers) : null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <span className="text-[12px] text-[#999]">{isResult ? 'Rezultat' : `Întrebarea ${step + 1} din ${questions.length}`}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 pt-4">
          {!isResult ? (
            <>
              <h3 className="text-[22px] md:text-[26px] text-[#1c1c1c] mb-6" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
                {questions[step].title}
              </h3>
              <div className={`grid gap-3 ${questions[step].options.length > 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {questions[step].options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition ${
                      selected === opt.id
                        ? 'border-[#3D6B5E] bg-[#3D6B5E]/5'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {opt.emoji && <span className="text-2xl">{opt.emoji}</span>}
                    <span className="text-[14px] text-[#1c1c1c] font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* Result */
            <div>
              <h3 className="text-[22px] md:text-[26px] text-[#1c1c1c] mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
                Ți-am găsit albumul perfect
              </h3>
              <p className="text-[14px] text-[#666] mb-6">Pe baza răspunsurilor tale, îți recomandăm:</p>

              <div className="rounded-xl bg-[#F5F5F5] p-6">
                <h4 className="text-[20px] text-[#1c1c1c] font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {rec.name}
                </h4>
                <p className="text-[14px] text-[#666] mb-4">{rec.desc}</p>
                <div className="flex flex-wrap gap-3 text-[12px] text-[#555]">
                  <span className="bg-white px-3 py-1.5 rounded-full">Format: {rec.format}</span>
                  <span className="bg-white px-3 py-1.5 rounded-full">Pagini groase 2mm</span>
                  <span className="bg-white px-3 py-1.5 rounded-full">Design gratuit</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <Link
                    to={`/colectie/${rec.slug}`}
                    onClick={onClose}
                    className="inline-flex items-center justify-center gap-2 bg-[#3D6B5E] hover:bg-[#2f5549] text-white font-semibold text-[14px] px-6 py-3 rounded-full transition no-underline"
                  >
                    Creează albumul →
                  </Link>
                  <button onClick={handleReset} className="text-[13px] text-[#888] hover:text-[#333] transition">
                    ↺ Repetă quizul
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer — progress + nav */}
        <div className="p-5 pt-0">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-semibold text-[#3D6B5E]">{isResult ? '100' : progress}%</span>
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#3D6B5E] rounded-full transition-all duration-500" style={{ width: `${isResult ? 100 : progress}%` }} />
            </div>
          </div>

          {/* Buttons */}
          {!isResult && (
            <div className="flex justify-between items-center">
              <button onClick={handleBack} disabled={step === 0}
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition disabled:opacity-30">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button onClick={handleNext} disabled={!selected}
                className="bg-[#3D6B5E] hover:bg-[#2f5549] text-white font-semibold text-[13px] px-6 py-2.5 rounded-full transition disabled:opacity-40">
                {step === questions.length - 1 ? 'Vezi rezultatul →' : 'Următorul →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Homepage card ─── */
export default function ProductQuizCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl bg-[#F5F5F5] overflow-hidden">
        <div className="flex flex-col md:flex-row items-center">
          {/* Text */}
          <div className="flex-1 p-8 md:p-12">
            <h2 className="text-[24px] md:text-[32px] text-[#1c1c1c] leading-tight mb-3" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
              Ai nevoie de ajutor în alegere?
            </h2>
            <p className="text-[14px] md:text-[16px] text-[#666] leading-relaxed mb-6 max-w-md">
              Răspunde la 4 întrebări și găsim produsul perfect pentru tine. Durează 30 de secunde.
            </p>
            <button
              onClick={() => setOpen(true)}
              className="bg-[#1c1c1c] hover:bg-[#333] text-white font-semibold text-[14px] px-7 py-3 rounded-full transition"
            >
              Începe →
            </button>
          </div>

          {/* Visual — large question mark area */}
          <div className="w-full md:w-[40%] flex-shrink-0 flex items-center justify-center p-8 md:p-12">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">
              <span className="text-[60px] md:text-[80px] text-[#3D6B5E] font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>?</span>
            </div>
          </div>
        </div>
      </div>

      {open && <QuizModal onClose={() => setOpen(false)} />}
    </>
  );
}
