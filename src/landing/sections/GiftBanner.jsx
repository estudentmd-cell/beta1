import { Link } from 'react-router-dom';
import useCmsStore from '../../components/cms/useCmsStore';
import BannerCarousel, { useBannerCarousel } from './BannerCarousel';
import { useBlockContent, EditableText } from './useBlockContent';

export default function GiftBanner() {
  const editMode = useCmsStore((s) => s.editMode);
  const { images, loaded, handleUpload, addSlot, removeSlot } = useBannerCarousel(
    'gift-banner',
    ['homepage_giftbanner', 'carousel'],
    '/images/nunta.webp'
  );
  const { data: t, save } = useBlockContent('homepage_giftbanner', 'texts', {
    label: 'IDEE DE CADOU',
    title: 'Cel mai bun cadou?\nAmintirile tipărite.',
    text: 'Nu e un obiect. E o emoție care se deschide la fiecare pagină. Pentru mamă, pentru bunici, pentru cei care contează.',
    cta: 'Creează un cadou →',
  });

  if (!loaded) return <div className="aspect-[2/1] sm:aspect-[3/1] bg-[#FAF8F5] animate-pulse" />;

  return (
    <section className="py-10 sm:py-16 md:py-20">
      <div className="max-w-[1360px] mx-auto px-4 md:px-12">
        <div className="flex flex-col md:flex-row-reverse min-h-[320px] md:min-h-[400px] rounded-2xl overflow-hidden bg-[#FAF8F5]">
          <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 md:px-16 py-8 md:py-16">
            <EditableText value={t.label} field="label" editMode={editMode} onSave={save}
              className="text-[12px] uppercase tracking-[0.15em] text-[#B0A89E] font-semibold mb-3"
            />
            <EditableText value={t.title} field="title" editMode={editMode} onSave={save} as="h2"
              className="text-[28px] sm:text-[30px] md:text-[38px] text-[#1c1c1c] leading-[1.1] mb-3 whitespace-pre-line"
              style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
            />
            <EditableText value={t.text} field="text" editMode={editMode} onSave={save}
              className="text-[15px] sm:text-[15px] text-[#666] leading-relaxed mb-6 max-w-[440px]"
            />
            <Link to="/colectie/toate"
              className="inline-flex items-center justify-center w-fit px-7 py-3.5 bg-[#1c1c1c] text-white text-[15px] font-semibold rounded-full no-underline hover:bg-[#333] active:scale-[0.97] transition-all"
            >{t.cta}</Link>
          </div>
          <div className="relative flex-1 min-h-[220px] md:min-h-0">
            <BannerCarousel images={images} editMode={editMode} onUpload={handleUpload} onAdd={addSlot} onRemove={removeSlot} />
          </div>
        </div>
      </div>
    </section>
  );
}
