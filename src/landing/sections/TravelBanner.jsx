import { Link } from 'react-router-dom';
import useCmsStore from '../../components/cms/useCmsStore';
import BannerCarousel, { useBannerCarousel } from './BannerCarousel';
import { useBlockContent, EditableText } from './useBlockContent';

export default function TravelBanner() {
  const editMode = useCmsStore((s) => s.editMode);
  const { images, loaded, handleUpload, addSlot, removeSlot } = useBannerCarousel(
    'travel-banner',
    ['homepage_travelbanner', 'carousel'],
    '/images/familie.webp'
  );
  const { data: t, save } = useBlockContent('homepage_travelbanner', 'texts', {
    title: 'Vacanța s-a terminat.\nPozele — încă pe telefon.',
    text: 'Mare, munți, apusuri — toate alea frumoase pe care le-ai pozat și nu le-ai mai deschis. Pune-le într-un album înainte să le uiți complet.',
    cta: 'Album de călătorie →',
  });

  if (!loaded) return <div className="aspect-[2/1] sm:aspect-[3/1] bg-[#1c1c1c] animate-pulse" />;

  return (
    <section className="py-10 sm:py-16 md:py-20">
      <div className="max-w-[1360px] mx-auto px-4 md:px-12">
        <div className="flex flex-col md:flex-row min-h-[360px] md:min-h-[440px] rounded-2xl overflow-hidden bg-[#1c1c1c]">
          <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 md:px-16 py-10 md:py-16">
            <EditableText value={t.title} field="title" editMode={editMode} onSave={save} as="h2"
              className="text-[28px] sm:text-[32px] md:text-[40px] lg:text-[46px] text-white leading-[1.1] mb-4 whitespace-pre-line"
              style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
            />
            <EditableText value={t.text} field="text" editMode={editMode} onSave={save}
              className="text-[15px] sm:text-[16px] text-white/70 leading-relaxed mb-8 max-w-[440px]"
            />
            <Link to="/colectie/calatorie"
              className="inline-flex items-center justify-center w-fit px-8 py-4 bg-white text-[#1c1c1c] text-[15px] font-semibold rounded-full no-underline hover:bg-[#F5F5F5] active:scale-[0.97] transition-all"
            >{t.cta}</Link>
          </div>
          <div className="relative flex-1 min-h-[240px] md:min-h-0">
            <BannerCarousel images={images} editMode={editMode} onUpload={handleUpload} onAdd={addSlot} onRemove={removeSlot} />
          </div>
        </div>
      </div>
    </section>
  );
}
