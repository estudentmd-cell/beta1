import { useState, useEffect } from 'react';
import useAuthStore from '../stores/useAuthStore';

export default function MaintenancePage() {
  // Site deschis pentru clienți — maintenance dezactivat
  return null;

  const { isAdmin } = useAuthStore();
  const [bypassed, setBypassed] = useState(false);

  // Bypass via Firestore config (admin sets maintenance_bypass_hash)
  // No hardcoded passwords — admin uses Google sign-in
  useEffect(() => {
    const stored = sessionStorage.getItem('maintenance_bypass');
    if (stored === 'admin_verified') setBypassed(true);
  }, []);

  // Admin or bypassed — don't show maintenance
  if (isAdmin || bypassed) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#FAF8F5] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="w-20 h-20 bg-[#3D6B5E] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
        </div>

        <h1 className="font-serif text-3xl text-[#1C1C1E] mb-3">
          Fotocarte
        </h1>

        <p className="text-[#8A8078] text-base leading-relaxed mb-2">
          Lucrăm la ceva special pentru tine.
        </p>
        <p className="text-[#B0A89E] text-sm leading-relaxed mb-8">
          Site-ul nostru este în curs de actualizare.<br/>
          Revino în curând pentru albumele foto personalizate.
        </p>

        {/* Decorative line */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-[#E8E4DB]" />
          <div className="w-2 h-2 rounded-full bg-[#3D6B5E]/30" />
          <div className="flex-1 h-px bg-[#E8E4DB]" />
        </div>

        {/* Contact */}
        <div className="space-y-2 mb-10">
          <p className="text-[13px] text-[#8A8078]">
            Între timp, ne poți contacta:
          </p>
          <a href="mailto:fotocartemd@gmail.com" className="text-[14px] text-[#3D6B5E] font-medium hover:underline block">
            fotocartemd@gmail.com
          </a>
          <a href="tel:+37360595984" className="text-[14px] text-[#3D6B5E] font-medium hover:underline block">
            +373 60 595 984
          </a>
        </div>

        {/* Admin access — Google sign-in only, no password */}
        <p className="text-[11px] text-[#D0CBC4]">
          Echipa: conectează-te cu contul Google de admin
        </p>
      </div>
    </div>
  );
}
