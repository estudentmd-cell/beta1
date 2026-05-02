import { Link } from 'react-router-dom';

export default function BrandStory() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 min-h-[400px]">
      {/* Left — large image */}
      <div className="min-h-[300px] md:min-h-0">
        <img
          src="https://www.innocence-editions.com/cdn/shop/files/Semainier-01-fleur-verte-02.jpg?v=1731586823&width=2000"
          alt="Atelier Fotocarte"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Center — dark panel */}
      <div className="bg-[#2C2520] flex items-center justify-center px-8 py-12 md:py-0">
        <div className="text-center max-w-xs">
          <h2 className="font-serif text-2xl text-white mb-4 leading-snug">
            CREAT CU DRAGOSTE ÎN MOLDOVA
          </h2>
          <p className="text-sm text-white/70 mb-6 leading-relaxed">
            Fiecare album este tipărit cu grijă în atelierul nostru, pe hârtie fotografică de cea mai înaltă calitate.
          </p>
          <Link
            to="/despre"
            className="inline-block border border-white text-white uppercase text-[12px] tracking-[0.1em] px-6 py-3 hover:bg-white hover:text-[#2C2520] transition-colors duration-300"
          >
            AFLĂ MAI MULT →
          </Link>
        </div>
      </div>

      {/* Right — beige quote panel */}
      <div className="bg-[#F0EDE6] flex items-center justify-center px-8 py-12 md:py-0">
        <p className="font-serif italic text-lg text-tx-2 leading-relaxed max-w-xs text-center">
          &ldquo;Amintirile merită mai mult decât un ecran de telefon. Merită să fie atinse, răsfoite și transmise generațiilor viitoare.&rdquo;
        </p>
      </div>
    </section>
  );
}
