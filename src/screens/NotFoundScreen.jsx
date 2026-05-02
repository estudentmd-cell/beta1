import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { usePageMeta } from '../utils/seo';

export default function NotFoundScreen() {
  usePageMeta({ title: 'Pagina nu a fost găsită', path: '/404' });
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4">
      <motion.div
        className="text-center max-w-md glass p-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-[80px] mb-4">📸</div>
        <h1 className="text-[48px] font-bold text-[#1c1c1c] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>404</h1>
        <p className="text-[18px] text-[#8A8078] mb-8">Pagina nu a fost găsită. Poate albumul tău te așteaptă în altă parte.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="glass-btn-dark no-underline">Acasă</Link>
          <Link to="/colectie/toate" className="glass-btn-accent no-underline">Explorează albumele</Link>
        </div>
      </motion.div>
    </div>
  );
}
