import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import HotOffers from '../landing/sections/HotOffers';

export default function OffersScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header — now in RootLayout globally */}

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 md:px-12 pt-4">
        <nav className="flex items-center gap-2 text-[12px] text-[#B0A89E]">
          <Link to="/" className="hover:text-[#1c1c1c] transition-colors">Acasă</Link>
          <span>/</span>
          <span className="text-[#1c1c1c]">Oferte active</span>
        </nav>
      </div>

      {/* Offers — same component as homepage */}
      <section className="py-12 md:py-16" style={{ backgroundColor: '#FBF0EE' }}>
        <HotOffers />
      </section>

      {/* Bottom CTA */}
      <div className="py-12 text-center">
        <p className="font-serif text-2xl text-[#1c1c1c] mb-2">Cauți altceva?</p>
        <p className="text-[#B0A89E] text-[15px] mb-6">Explorează toate designurile noastre de albume foto.</p>
        <Link
          to="/colectie/toate"
          className="inline-block border border-[#1c1c1c] text-[#1c1c1c] uppercase tracking-[0.12em] text-[13px] px-8 py-3.5 hover:bg-[#1c1c1c] hover:text-white transition-all"
        >
          VEZI TOATE ALBUMELE →
        </Link>
      </div>
    </div>
  );
}
