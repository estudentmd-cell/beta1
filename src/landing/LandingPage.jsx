import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import { usePageMeta } from '../utils/seo';
import { trackViewContent } from '../utils/metaPixel';
import { LandingCMSProvider } from './LandingCMSProvider';
import SectionErrorBoundary from './SectionErrorBoundary';

// Sections
import AnnouncementBar from './sections/AnnouncementBar';
import HeroSplit from './sections/HeroSplit';
import CollectionCards from './sections/CollectionCards';
import HowItWorks from './sections/HowItWorks';
import HotOffers from './sections/HotOffers';
import AlbumCarousel from './sections/AlbumCarousel';
import TrustStrip from './sections/TrustStrip';
import FAQ from './sections/FAQ';
import OpenAlbumBanner from './sections/OpenAlbumBanner';
import TravelBanner from './sections/TravelBanner';
import GiftBanner from './sections/GiftBanner';
import FloatingCTA from './sections/FloatingCTA';
import ScrollToTop from '../components/shared/ScrollToTop';

function AdminLoginButton() {
  const navigate = useNavigate();
  const { isAdmin, signInWithGoogle } = useAuthStore();
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = () => {
    if (isAdmin) return;
    setShowPopup(true);
    setError('');
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      const state = useAuthStore.getState();
      if (state.isAdmin) {
        setShowPopup(false);
      } else {
        setError('Contul ' + (state.user?.email || '') + ' nu are drepturi de admin.');
      }
    } catch (err) {
      setError(err?.message || 'Eroare la conectare');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="py-4 text-center">
        <button
          onClick={handleClick}
          className="inline-flex items-center gap-2 text-[10px] text-tx-4/50 hover:text-ac transition-colors px-4 py-2 rounded-lg hover:bg-bg-2"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          {isAdmin ? 'Admin Panel' : 'Admin'}
        </button>
      </div>

      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowPopup(false)}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-sm p-6 animate-[fadeIn_0.3s_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">🔐</div>
              <h2 className="font-serif text-xl mb-1">Admin Portal</h2>
              <p className="text-sm text-[#888]">Conectează-te cu contul de admin</p>
            </div>
            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
            )}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-[#EBEBEB] rounded-[12px] px-4 py-3.5 hover:border-[#3D6B5E]/40 hover:shadow transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm font-semibold text-[#1A1A1A]">
                {loading ? 'Se conectează...' : 'Conectare cu Google'}
              </span>
            </button>
            <button onClick={() => setShowPopup(false)} className="w-full mt-3 text-sm text-[#888] hover:text-[#333] py-2 transition-colors">
              Anulează
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function UnfinishedProjectBanner() {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { db } = await import('../firebase/config');
        if (!db || cancelled) return;
        const { collection, getDocs } = await import('firebase/firestore');
        const { default: useAuthStore } = await import('../stores/useAuthStore');
        const { activeClientId, clientEmail, clientPhone } = useAuthStore.getState();

        if (!activeClientId && !clientEmail && !clientPhone) return;

        const snap = await getDocs(collection(db, 'projects'));
        if (cancelled) return;
        const norm = (ph) => (ph || '').replace(/\D/g, '').slice(-8);
        const normEmail = (e) => (e || '').toLowerCase().trim();

        const draft = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .find(p => {
            if (p.status !== 'draft' || (p.totalPhotos || 0) === 0) return false;
            if (activeClientId && (p.client_id === activeClientId || p.activeClientId === activeClientId)) return true;
            if (clientEmail && normEmail(p.clientEmail) === normEmail(clientEmail)) return true;
            if (clientPhone && norm(p.clientPhone) === norm(clientPhone)) return true;
            return false;
          });

        if (!cancelled && draft) setProject(draft);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  if (!project || dismissed) return null;

  const photosCount = project.totalPhotos || 0;
  const progress = project.progress || 0;
  const thumbs = (project.photos || [])
    .filter(p => p.thumbData || p.previewUrl)
    .slice(0, 4);

  const handleDelete = async () => {
    if (!confirm('Ești sigur? Se vor șterge toate pozele și proiectul.')) return;
    try {
      const { deleteProject } = await import('../utils/projectStorage');
      await deleteProject(project.id);
      setDismissed(true);
    } catch {}
  };

  return (
    <div className="mx-4 my-3 bg-white rounded-2xl shadow-lg overflow-hidden border border-[#E8E4DB]">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#E8F2ED] flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3D6B5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-[#1c1c1c]">Ai un album neterminat</p>
            <p className="text-[12px] text-[#6B635B]">{photosCount} poze · {Math.round(progress)}% gata</p>
          </div>
        </div>

        {thumbs.length > 0 && (
          <div className="flex gap-1 mb-3">
            {thumbs.map((p, i) => (
              <div key={i} className="w-14 h-14 rounded-lg overflow-hidden bg-[#F5F1EB]">
                <img src={p.thumbData || p.previewUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {photosCount > 4 && (
              <div className="w-14 h-14 rounded-lg bg-[#F5F3F0] flex items-center justify-center text-[11px] text-[#6B635B] font-bold">
                +{photosCount - 4}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/app/editor/${project.id}`)}
            className="flex-1 py-3 rounded-full bg-[#3D6B5E] text-white text-[14px] font-semibold active:scale-[0.97] transition-all"
          >
            Continuă
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-3 rounded-full text-[#B54A3A] text-[13px] font-medium active:scale-[0.97] transition-all"
            style={{ border: '1.5px solid #FDE8E5' }}
          >
            Șterge
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isAdmin } = useAuthStore();
  const location = useLocation();
  usePageMeta({ path: '/' });

  // Meta Pixel — ViewContent (landing page)
  useEffect(() => {
    trackViewContent({ contentName: 'Landing Page', contentType: 'page' });
  }, []);

  // Scroll to hash section when navigating from another page (e.g. /#oferte)
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [location.hash]);

  // Handle invite link — save data + log click
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteSlug = params.get('invite');
    if (!inviteSlug || sessionStorage.getItem('_invite_done_' + inviteSlug)) return;
    sessionStorage.setItem('_invite_done_' + inviteSlug, '1');
    localStorage.setItem('fc_invite_slug', inviteSlug);
    (async () => {
      try {
        const { db } = await import('../firebase/config');
        if (!db) return;
        const { collection: col, getDocs, doc, updateDoc, increment } = await import('firebase/firestore');
        const snap = await getDocs(col(db, 'invitations'));
        const inv = snap.docs.map(d => ({ id: d.id, ...d.data() })).find(i => i.slug === inviteSlug);
        if (inv?.id) {
          // Log click
          const clickData = { clicks: increment(1), lastClickAt: new Date().toISOString(), lastClickDevice: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop' };
          if (!inv.firstClickAt) clickData.firstClickAt = new Date().toISOString();
          updateDoc(doc(db, 'invitations', inv.id), clickData).catch(() => {});
          // Save invite data for auth pre-fill
          try { localStorage.setItem('fc_invite_data', JSON.stringify({ name: inv.name, phone: inv.phone })); } catch {}
        }
      } catch {}
    })();
  }, []);

  return (
    <LandingCMSProvider>
    <div className="min-h-screen bg-bg pb-16 sm:pb-0 snap-landing overflow-x-hidden">
      {/* 1. Announcement Bar — preț vizibil instant */}
      <SectionErrorBoundary name="AnnouncementBar">
        <AnnouncementBar />
      </SectionErrorBoundary>

      <main id="main-content">
      {/* Unfinished project banner */}
      <SectionErrorBoundary name="UnfinishedProjectBanner">
        <UnfinishedProjectBanner />
      </SectionErrorBoundary>

      {/* 2. Hero — emoție + USP + CTA */}
      <SectionErrorBoundary name="HeroSplit">
        <HeroSplit />
      </SectionErrorBoundary>



      {/* 3. ThemeCards — 4 teme emoționale cu preț */}
      <section className="py-10 sm:py-16 md:py-20 bg-white">
        <div className="max-w-[1360px] mx-auto px-4 md:px-12">
          <SectionErrorBoundary name="CollectionCards">
            <CollectionCards />
          </SectionErrorBoundary>
        </div>
      </section>

      {/* 4. Travel banner — CTA călătorie (între colecție și cum funcționează) */}
      <SectionErrorBoundary name="TravelBanner">
        <TravelBanner />
      </SectionErrorBoundary>

      {/* 5. HowItWorks — 3 pași (include "noi aranjăm") */}
      <section id="cum-functioneaza" className="py-10 sm:py-16 md:py-20 bg-[#FAFAFA]">
        <div className="max-w-[1360px] mx-auto px-4 md:px-12">
          <SectionErrorBoundary name="HowItWorks">
            <HowItWorks />
          </SectionErrorBoundary>
        </div>
      </section>

      {/* 6. Album deschis — tangibilitate */}
      <SectionErrorBoundary name="OpenAlbumBanner">
        <OpenAlbumBanner />
      </SectionErrorBoundary>

      {/* 7. Oferte cu countdown */}
      <section className="py-10 sm:py-16 md:py-20 bg-white">
        <SectionErrorBoundary name="HotOffers">
          <HotOffers />
        </SectionErrorBoundary>
      </section>

      {/* 8. Albume reale — dovadă vizuală */}
      <SectionErrorBoundary name="AlbumCarousel">
        <AlbumCarousel />
      </SectionErrorBoundary>

      {/* 9. Cadou — CTA emoțional */}
      <SectionErrorBoundary name="GiftBanner">
        <GiftBanner />
      </SectionErrorBoundary>

      {/* 10. Trust + FAQ — combinate */}
      <SectionErrorBoundary name="TrustStrip">
        <TrustStrip />
      </SectionErrorBoundary>
      <SectionErrorBoundary name="FAQ">
        <FAQ />
      </SectionErrorBoundary>

      {/* Admin Login (discrete) */}
      <AdminLoginButton />

      </main>

      {/* Floating CTA — sticky bottom mobile */}
      <SectionErrorBoundary name="FloatingCTA">
        <FloatingCTA />
      </SectionErrorBoundary>

      <ScrollToTop />
    </div>
    </LandingCMSProvider>
  );
}
