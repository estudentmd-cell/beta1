import { Link } from 'react-router-dom';
import { AnimatedSection, AnimatedItem, AnimatedText } from '../../components/motion/AnimatedSection';

export default function EmotionalHook() {
  return (
    <section>
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* IMAGE — left */}
          <AnimatedSection preset="slideRight" className="aspect-square md:aspect-auto overflow-hidden">
            <img
              src="https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-02.jpg?v=1744188647&width=1200"
              alt="Album foto deschis"
              className="w-full h-full object-cover"
              loading="lazy"
              width={600}
              height={600}
            />
          </AnimatedSection>

          {/* TEXT — right */}
          <div className="flex items-center bg-[#F5F1EB] glass-subtle px-8 md:px-16 py-16 md:py-0">
            <AnimatedSection stagger staggerDelay={0.15} className="max-w-md">
              <AnimatedItem>
                <AnimatedText
                  as="h2"
                  className="text-[26px] sm:text-[32px] md:text-[40px] leading-[1.1] text-[#1c1c1c] mb-4"
                  style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
                >
                  Amintirile nu trebuie să rămână în telefon
                </AnimatedText>
              </AnimatedItem>
              <AnimatedItem>
                <p className="text-[15px] text-[#8A8078] leading-relaxed mb-8">
                  Fiecare zâmbet, fiecare nuntă, fiecare vacanță — tipărește-le într-un album pe care îl vei răsfoi mereu.
                </p>
              </AnimatedItem>
              <AnimatedItem>
                <Link
                  to="/colectie/toate"
                  className="glass-btn-dark no-underline"
                >
                  ÎNCEPE ALBUMUL →
                </Link>
              </AnimatedItem>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}
