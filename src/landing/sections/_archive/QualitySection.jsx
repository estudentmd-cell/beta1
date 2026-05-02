import { Link } from 'react-router-dom';
import { AnimatedSection, AnimatedItem, AnimatedText } from '../../components/motion/AnimatedSection';

const guarantees = [
  {
    icon: 'https://www.innocence-editions.com/cdn/shop/files/Innocence-album-rigide-portrait-v1-01.jpg?v=1731588993&width=80',
    title: 'Calitate premium garantată',
    desc: 'Hârtie fotografică groasă, culori vii, rezistente în timp.',
  },
  {
    icon: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-reverie-01.jpg?v=1739448590&width=80',
    title: 'Gata în câteva minute',
    desc: 'Încarci pozele, noi facem designul. Tu doar confirmi.',
  },
  {
    icon: 'https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-04.jpg?v=1744188647&width=80',
    title: '320+ familii mulțumite',
    desc: 'Rating 4.9 din 5. Clienții revin pentru al doilea album.',
  },
];

export default function QualitySection() {
  return (
    <section>
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* TEXT — left */}
          <div className="flex items-center bg-white glass glass-specular px-8 md:px-16 py-16 md:py-0 order-2 md:order-1">
            <AnimatedSection stagger staggerDelay={0.12} className="max-w-md">
              <AnimatedItem>
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#B0A89E] mb-3">
                  GARANȚIA FOTOCARTE
                </p>
              </AnimatedItem>
              <AnimatedItem>
                <AnimatedText
                  as="h2"
                  className="text-[26px] sm:text-[32px] md:text-[38px] leading-[1.1] text-[#1c1c1c] mb-8"
                  style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
                >
                  Calitate pe care o simți din prima atingere
                </AnimatedText>
              </AnimatedItem>

              {guarantees.map((g, i) => (
                <AnimatedItem key={i} className="glass-inner p-3 flex gap-4 items-start mb-6">
                  <img
                    src={g.icon}
                    alt=""
                    className="w-14 h-14 rounded-md object-cover flex-shrink-0"
                    loading="lazy"
                    width={56}
                    height={56}
                  />
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#1c1c1c] mb-0.5">{g.title}</h3>
                    <p className="text-[13px] text-[#8A8078]">{g.desc}</p>
                  </div>
                </AnimatedItem>
              ))}
            </AnimatedSection>
          </div>

          {/* IMAGE — right */}
          <AnimatedSection preset="slideLeft" className="aspect-square md:aspect-auto order-1 md:order-2 overflow-hidden">
            <img
              src="https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-03.jpg?v=1744188647&width=1200"
              alt="Album foto calitate premium"
              className="w-full h-full object-cover"
              loading="lazy"
              width={600}
              height={600}
            />
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
