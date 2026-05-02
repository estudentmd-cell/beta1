import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useProjectStore from '../stores/useProjectStore';
import AppHeader from '../components/layout/AppHeader';

const CATEGORIES = ['Toate', 'Călătorie', 'Familie', 'Nuntă', 'Copii', 'Baby', 'Vacanță', 'Simplu', 'Zi de naștere', 'Poze din telefon'];

const THEMES = [
  { id: 'explore',         name: 'Explore',           style: 'Bold',    cat: ['Călătorie', 'Vacanță'],    emoji: '🌍', color: 'from-teal-600 to-emerald-500' },
  { id: 'povestea-noastra', name: 'Povestea Noastră', style: 'Clasic',  cat: ['Familie', 'Copii'],        emoji: '💛', color: 'from-amber-500 to-orange-400' },
  { id: 'nunta-eleganta',  name: 'Nunta Elegantă',    style: 'Clasic',  cat: ['Nuntă'],                   emoji: '💍', color: 'from-rose-400 to-pink-500' },
  { id: 'aventuri-mici',   name: 'Aventuri Mici',     style: 'Jucăuș',  cat: ['Copii', 'Baby'],           emoji: '🧸', color: 'from-sky-400 to-blue-500' },
  { id: 'amintiri-simple', name: 'Amintiri Simple',   style: 'Minimal', cat: ['Simplu', 'Poze din telefon'], emoji: '📸', color: 'from-stone-400 to-stone-500' },
];

export default function ThemeScreen() {
  const navigate = useNavigate();
  const { productConfig } = useProjectStore();
  const [activeCat, setActiveCat] = useState('Toate');

  const filtered = activeCat === 'Toate'
    ? THEMES
    : THEMES.filter((t) => t.cat.includes(activeCat));

  const handleSelect = (theme) => {
    // Store selected theme for later use
    useProjectStore.setState({ selectedTheme: theme.id });
    navigate('/app/editor');
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Header — now in RootLayout globally */}

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-serif text-2xl mb-1">Alege stilul albumului tău</h1>
        <p className="text-sm text-tx-2 mb-5">
          Fiecare temă vine cu un design unic de copertă. Selectează stilul care se potrivește cel mai bine cu fotografiile tale.
        </p>

        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-5 -mx-4 px-4 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCat(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCat === cat
                  ? 'bg-ac text-white'
                  : 'bg-card border border-bdr text-tx-2 hover:border-ac/40'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Theme count */}
        <p className="text-xs text-tx-3 mb-3">{filtered.length} teme disponibile</p>

        {/* Theme grid */}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((theme) => (
            <button key={theme.id} onClick={() => handleSelect(theme)}
              className="bg-card rounded-[16px] overflow-hidden shadow hover:-translate-y-1 hover:shadow-lg transition-all text-left group">
              {/* Cover preview */}
              <div className={`aspect-[3/4] bg-gradient-to-br ${theme.color} flex flex-col items-center justify-center p-4 relative`}>
                <span className="text-4xl mb-2">{theme.emoji}</span>
                <span className="text-white font-serif text-lg text-center leading-tight">{theme.name}</span>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-white text-tx-1 px-4 py-2 rounded-full text-xs font-bold shadow transition-opacity">
                    Selectează →
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-bold text-tx-1">{theme.name}</p>
                <p className="text-[11px] text-tx-3">{theme.style}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-tx-3">
            <span className="text-3xl block mb-2">🎨</span>
            <p className="text-sm">Nicio temă în această categorie</p>
          </div>
        )}
      </div>
    </div>
  );
}
