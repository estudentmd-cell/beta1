import { useState } from 'react';
import { AnimatedSection, AnimatedItem } from '../../components/motion/AnimatedSection';
import { motion } from 'motion/react';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      console.log('Newsletter signup:', email);
      setEmail('');
    }
  };

  return (
    <section className="relative min-h-[350px] flex items-center justify-center overflow-hidden">
      <motion.img
        src="https://www.innocence-editions.com/cdn/shop/files/calendrier-photo-innocence-02.jpg?v=1761123947&width=1260"
        alt=""
        className="absolute inset-0 w-full h-[120%] object-cover -top-[10%]"
        initial={{ scale: 1.1 }}
        whileInView={{ scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        viewport={{ once: true }}
      />
      <div className="absolute inset-0 bg-black/50" />

      <AnimatedSection stagger staggerDelay={0.12} className="relative z-10 text-center px-4 py-16">
        <AnimatedItem>
          <p className="uppercase text-[11px] tracking-[0.2em] text-white/70 mb-2">
            OFERTĂ PENTRU TINE
          </p>
        </AnimatedItem>
        <AnimatedItem>
          <h2 className="font-serif text-2xl md:text-3xl text-white mb-6 max-w-lg mx-auto">
            Primește 10% reducere la primul album
          </h2>
        </AnimatedItem>
        <AnimatedItem>
          <div className="glass-frosted p-4 rounded-lg inline-block">
          <form onSubmit={handleSubmit} className="flex gap-0 justify-center">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresa ta de email..."
              autoComplete="email"
              className="bg-white text-tx-1 px-4 py-3 text-sm w-full max-w-xs border-0 outline-none rounded-none focus:ring-2 focus:ring-white/30"
            />
            <motion.button
              type="submit"
              className="glass-btn-dark whitespace-nowrap py-3 px-6"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Abonează-te
            </motion.button>
          </form>
          </div>
        </AnimatedItem>
      </AnimatedSection>
    </section>
  );
}
