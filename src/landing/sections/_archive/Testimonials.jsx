import { AnimatedSection, AnimatedItem, AnimatedText } from '../../components/motion/AnimatedSection';
import { motion } from 'motion/react';
import AnimatedCounter from '../../components/motion/AnimatedCounter';

const reviews = [
  {
    name: 'Maria L.',
    title: 'Cel mai frumos album',
    text: 'Am strâns 800 de poze de la nuntă și nu știam ce să fac cu ele. Acum le arătăm tuturor musafirilor.',
    detail: 'Album de nuntă · 30×30cm',
    image: 'https://www.innocence-editions.com/cdn/shop/files/Innocence-album-rigide-portrait-v1-01.jpg?v=1731588993&width=800',
  },
  {
    name: 'Irina P.',
    title: 'Merită fiecare bănuț',
    text: 'În fiecare seară răsfoim albumul cu fiica noastră și îi arătăm cum era bebelușă.',
    detail: 'Album copii · 20×20cm',
    image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-reverie-01.jpg?v=1739448590&width=800',
  },
  {
    name: 'Andrei & Elena',
    title: 'Am comandat deja al doilea',
    text: 'Nu mă așteptam la o calitate atât de bună. Hârtia e groasă, pozele ies perfect.',
    detail: 'Album de familie · 23×23cm',
    image: 'https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-04.jpg?v=1744188647&width=800',
  },
];

export default function Testimonials() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* Header */}
        <AnimatedSection stagger staggerDelay={0.1} className="text-center mb-10">
          <AnimatedItem>
            <div className="flex items-center justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#E8B931" stroke="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
              <span className="text-[13px] text-[#8A8078] ml-2">4.9 / 5 · <AnimatedCounter value={320} suffix="+" /> recenzii</span>
            </div>
          </AnimatedItem>
          <AnimatedItem>
            <AnimatedText
              as="h2"
              className="text-[28px] md:text-[38px] text-[#1c1c1c] leading-[1.1]"
              style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
            >
              Ce spun familiile care au comandat
            </AnimatedText>
          </AnimatedItem>
        </AnimatedSection>

        {/* Cards */}
        <AnimatedSection stagger staggerDelay={0.15} className="flex overflow-x-auto gap-5 pb-4 md:grid md:grid-cols-3 md:gap-6 md:pb-0 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
          {reviews.map((r) => (
            <AnimatedItem
              key={r.name}
              preset="scaleIn"
              className="flex-shrink-0 w-[80vw] sm:w-[60vw] md:w-auto snap-center"
            >
              <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.3 }} className="glass-image-card">
                {/* Photo */}
                <div className="overflow-hidden">
                  <motion.img
                    src={r.image}
                    alt={r.title}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                    width={400}
                    height={400}
                    whileHover={{ scale: 1.04 }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Stars */}
                <div className="p-4">
                <div className="flex gap-0.5 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#1c1c1c" stroke="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>

                <h3 className="text-[15px] font-semibold text-[#1c1c1c] mb-1">
                  &ldquo;{r.title}&rdquo;
                </h3>
                <p className="text-[13px] text-[#8A8078] leading-relaxed mb-3">{r.text}</p>

                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3D6B5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="m9 11 3 3L22 4" />
                  </svg>
                  <span className="text-[13px] font-medium text-[#1c1c1c]">{r.name}</span>
                  <span className="text-[11px] text-[#B0A89E]">· {r.detail}</span>
                </div>
                </div>
              </motion.div>
            </AnimatedItem>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}
