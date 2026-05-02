import { Link } from 'react-router-dom';
import { AnimatedSection, AnimatedItem, AnimatedText } from '../../components/motion/AnimatedSection';
import { motion } from 'motion/react';

const steps = [
  {
    num: '1',
    title: 'Încarci pozele',
    desc: 'Din telefon sau calculator. Fără cont, fără aplicație.',
    image: 'https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-02.jpg?v=1744188647&width=800',
  },
  {
    num: '2',
    title: 'Noi facem designul',
    desc: 'Aranjăm pozele frumos. Tu doar confirmi.',
    image: 'https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-03.jpg?v=1744188647&width=800',
  },
  {
    num: '3',
    title: 'Primești albumul acasă',
    desc: 'Tipărit pe hârtie premium, gata de răsfoit.',
    image: 'https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-04.jpg?v=1744188647&width=800',
  },
];

const features = [
  '📱 De pe telefon sau laptop',
  '🎨 Design gratuit de la noi',
  '✅ Verifici înainte să comanzi',
  '🛡️ Garanție 100% satisfacție',
];

export default function EditorShowcase() {
  return (
    <div>
      {/* HEADER */}
      <AnimatedSection stagger staggerDelay={0.1} className="text-center mb-10 px-4">
        <AnimatedItem>
          <p className="text-[11px] uppercase tracking-[0.25em] text-white/40 mb-3">
            CUM FUNCȚIONEAZĂ
          </p>
        </AnimatedItem>
        <AnimatedItem>
          <AnimatedText
            as="h2"
            className="text-[28px] md:text-[40px] text-white leading-[1.1]"
            style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
          >
            Simplu ca 1, 2, 3
          </AnimatedText>
        </AnimatedItem>
      </AnimatedSection>

      {/* 3 STEP CARDS */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 mb-10">
        <AnimatedSection stagger staggerDelay={0.15} className="flex overflow-x-auto gap-4 pb-4 lg:grid lg:grid-cols-3 lg:gap-5 lg:pb-0 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
          {steps.map((step, i) => (
            <AnimatedItem
              key={i}
              preset="scaleIn"
              className="flex-shrink-0 w-[80vw] sm:w-[60vw] lg:w-auto snap-center"
            >
              <div className="glass-image-card relative overflow-hidden mb-4">
                <motion.img
                  src={step.image}
                  alt={step.title}
                  className="w-full aspect-[4/3] object-cover"
                  loading="lazy"
                  width={400}
                  height={300}
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.4 }}
                />
                <div className="absolute top-4 left-4 w-9 h-9 rounded-full bg-[#1c1c1c] text-white text-[14px] font-semibold flex items-center justify-center">
                  {step.num}
                </div>
              </div>
              <h3 className="text-[17px] font-semibold text-white mb-1">{step.title}</h3>
              <p className="text-[13px] text-white/50">{step.desc}</p>
            </AnimatedItem>
          ))}
        </AnimatedSection>
      </div>

      {/* FEATURES */}
      <AnimatedSection stagger staggerDelay={0.08} className="max-w-3xl mx-auto px-4 mb-10">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {features.map((f, i) => (
            <AnimatedItem key={i}>
              <span className="text-[13px] text-white/60">{f}</span>
            </AnimatedItem>
          ))}
        </div>
      </AnimatedSection>

      {/* CTA */}
      <AnimatedSection stagger staggerDelay={0.12} className="py-12 text-center bg-white/5 rounded-2xl mx-4 md:mx-8 mb-4">
        <AnimatedItem>
          <h3
            className="text-[24px] md:text-[32px] text-white mb-3"
            style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
          >
            Durează cât o cafea.
          </h3>
        </AnimatedItem>
        <AnimatedItem>
          <p className="text-white/50 text-[14px] mb-6 max-w-xs mx-auto">
            Alegi pozele, le încarci, iar noi creăm albumul. Tu doar zici da.
          </p>
        </AnimatedItem>
        <AnimatedItem>
          <Link
            to="/colectie/toate"
            className="glass-btn-white"
          >
            ÎNCEPE ALBUMUL →
          </Link>
        </AnimatedItem>
      </AnimatedSection>
    </div>
  );
}
