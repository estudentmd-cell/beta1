import { AnimatedSection, AnimatedItem } from '../../components/motion/AnimatedSection';
import useCmsStore from '../../components/cms/useCmsStore';
import { useBlockContent, EditableText } from './useBlockContent';

export default function TrustStrip() {
  const editMode = useCmsStore((s) => s.editMode);
  const { data: t, save } = useBlockContent('homepage_truststrip', 'texts', {
    title1: 'LIVRARE ÎN TOATĂ MOLDOVA', desc1: 'Primești albumul acasă',
    title2: 'HÂRTIE FOTOGRAFICĂ PREMIUM', desc2: 'Culori vii, rezistente în timp',
    title3: 'DESIGN GRATUIT', desc3: 'Aranjăm pozele pentru tine',
  });
  const defaultIcons = [
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2" ry="2" /><polyline points="16 8 20 8 23 11 23 16 20 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,
  ];
  const items = [1, 2, 3].map((n, i) => ({
    icon: t[`icon${n}`]
      ? <img src={t[`icon${n}`]} alt="" className="w-6 h-6 object-contain" />
      : defaultIcons[i],
    title: t[`title${n}`],
    desc: t[`desc${n}`],
  }));

  return (
    <section className="bg-[#FAFAFA] border-y border-[#E4E4E4]">
      {/* Mobile — 3 columns compact */}
      <div className="sm:hidden py-5 px-4">
        <ul role="list" className="grid grid-cols-3 gap-3">
          {items.map((item, i) => (
            <li key={i} className="flex flex-col items-center text-center gap-1.5 bg-white rounded-xl px-2 py-3" style={{ boxShadow: '0 5px 40px rgba(0,0,0,0.06)' }}>
              <div className="text-[#3D6B5E]" aria-hidden="true">{item.icon}</div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#1c1c1c] leading-tight">{item.title}</p>
              <p className="text-[11px] text-[#6B635B] leading-tight">{item.desc}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Desktop — grid */}
      <div className="hidden sm:block max-w-6xl mx-auto px-4 md:px-12 py-6">
        <AnimatedSection stagger staggerDelay={0.12} as="ul" role="list" className="grid md:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <AnimatedItem key={i} as="li" className="flex items-start gap-3 bg-white rounded-xl p-4" style={{ boxShadow: '0 5px 40px rgba(0,0,0,0.06)' }}>
              <div className="text-tx-2 flex-shrink-0 mt-0.5" aria-hidden="true">{item.icon}</div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-tx-1">{item.title}</p>
                <p className="text-[14px] text-tx-3">{item.desc}</p>
              </div>
            </AnimatedItem>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}
