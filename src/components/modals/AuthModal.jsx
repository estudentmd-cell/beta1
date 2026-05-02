import { useState, useRef, useEffect } from 'react';
import { createEmailCode } from '../../firebase/emailCode';
import useAuthStore from '../../stores/useAuthStore';
import { trackLead, trackContact, updateUserData } from '../../utils/metaPixel';

/**
 * Auth Modal — 3 steps:
 * 1. CHOOSE: "Intră în cont" / "Creează cont"
 * 2. FORM:   Login = email only, Register = email + name + phone
 * 3. CODE:   4-digit verification
 */
export default function AuthModal({ onClose, onSuccess, mode: initialMode = 'register' }) {
  // Skip choice step if caller explicitly set login/register
  const [step, setStep] = useState(initialMode === 'login' ? 'form' : initialMode === 'register' ? 'choose' : 'choose');
  const [mode, setMode] = useState(initialMode === 'login' ? 'login' : 'register');
  const [returningUser, setReturningUser] = useState(false);
  // Pre-fill din invitație (dacă clientul vine din link generat de manager)
  const inviteData = (() => { try { return JSON.parse(localStorage.getItem('fc_invite_data') || '{}'); } catch { return {}; } })();
  const [email, setEmail] = useState('');
  const [name, setName] = useState(inviteData.name || '');
  const [phone, setPhone] = useState((inviteData.phone || '').replace('+373', '').replace(/\D/g, '').slice(-8));
  const [code, setCode] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  const isLogin = mode === 'login';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSend = async () => {
    if (!email.includes('@')) { setError('Introdu un email valid'); return; }

    if (!isLogin) {
      const nameParts = name.trim().split(/\s+/).filter(Boolean);
      if (nameParts.length < 2) { setError('Introdu numele complet (prenume și nume)'); return; }
      if (nameParts[0].toLowerCase() === nameParts[1].toLowerCase()) { setError('Prenumele și numele trebuie să fie diferite'); return; }
      if (nameParts.some(p => p.length < 2)) { setError('Numele este prea scurt'); return; }

      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 8) { setError('Numărul de telefon trebuie să aibă 8 cifre'); return; }
      if (cleanPhone.startsWith('0')) { setError('Introdu numărul fără zero (ex: 60335030)'); return; }
    }
    setError('');
    setLoading(true);
    try {
      const result = await createEmailCode(email.trim(), mode);
      // Meta Pixel — Contact (email submitted)
      trackContact({ step: 'email_submitted' });
      if (result?.exists && !isLogin) {
        // Clientul există — notifică și trimite la cod
        setReturningUser(true);
        setMode('login');
      }
      setStep('code');
    } catch (e) {
      setError(e.message || 'Eroare la trimitere. Încearcă din nou.');
    }
    setLoading(false);
  };

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 3) inputRefs[index + 1].current?.focus();
    const fullCode = newCode.join('');
    if (fullCode.length === 4 && !loading) handleVerify(fullCode);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) inputRefs[index - 1].current?.focus();
  };

  const handleVerify = async (fullCode) => {
    if (loading) return; // Prevent double-submit
    setError('');
    setLoading(true);
    try {
      const result = await useAuthStore.getState().verifyAndSignIn(
        email, fullCode,
        isLogin ? '' : name,
        isLogin ? '' : (phone ? `+373${phone}` : ''),
        mode,
      );

      // Meta Pixel — Lead (cont nou) sau Contact (login)
      if (result?.isNew) {
        trackLead({
          user: {
            email: email.trim(),
            phone: phone ? `+373${phone}` : '',
            firstName: name.trim().split(' ')[0],
            lastName: name.trim().split(' ').slice(1).join(' '),
            externalId: result?.clientId,
          },
        });
      } else {
        trackContact({ step: 'login_verified' });
      }
      // Update Advanced Matching with verified user data
      updateUserData({
        email: email.trim(),
        phone: phone ? `+373${phone}` : '',
        name: isLogin ? '' : name.trim(),
        externalId: result?.clientId,
      });

      if (onSuccess) onSuccess(result);
      if (onClose) onClose();
    } catch (e) {
      console.error('Auth verify error:', e?.code, e?.message, e);
      const msg = e?.message || '';
      if (msg.includes('greșit') || msg.includes('PERMISSION_DENIED')) setError('Cod greșit. Verifică și încearcă din nou.');
      else if (msg.includes('expirat') || msg.includes('DEADLINE_EXCEEDED')) setError('Codul a expirat. Trimite unul nou.');
      else setError(msg || 'Eroare. Încearcă din nou.');
      setCode(['', '', '', '', '', '']);
      inputRefs[0].current?.focus();
    }
    setLoading(false);
  };

  useEffect(() => { if (step === 'code') inputRefs[0].current?.focus(); }, [step]);

  const formValid = isLogin
    ? email.includes('@')
    : email.includes('@') && name.trim().split(/\s+/).length >= 2 && phone.replace(/\D/g, '').length === 8;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => onClose?.()}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}>
      <div className="absolute inset-0 bg-black/50" />

      <div
        className="relative bg-white w-full sm:max-w-[400px] sm:rounded-2xl rounded-t-[20px] shadow-xl max-h-[95vh] overflow-y-auto animate-[slideUp_0.25s_ease]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobil */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#DDD]" />
        </div>

        {/* Close */}
        <button onClick={() => onClose?.()} className="absolute top-2 right-2 sm:top-4 sm:right-4 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-[#F2F2F7] active:bg-[#E5E5EA] transition-colors text-[#999] z-10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <div className="px-5 pb-6 pt-2 sm:p-6">

          {/* ═══ STEP 1: CHOOSE ═══ */}
          {step === 'choose' && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#EAF0EC] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3D6B5E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h3 className="text-[20px] sm:text-[18px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Salvează-ți albumul
                </h3>
                <p className="text-[14px] sm:text-[13px] text-[#888] mt-1">
                  Conectează-te pentru a salva pozele<br />și a reveni oricând la albumul tău
                </p>
              </div>

              <div className="space-y-3">
                <button onClick={() => { setMode('login'); setStep('form'); setError(''); }}
                  className="w-full h-[56px] sm:h-[52px] bg-[#1C1C1E] text-white rounded-xl text-[16px] sm:text-[15px] font-bold active:scale-[0.97] transition-all flex items-center justify-center gap-2.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Intră în cont
                </button>

                <button onClick={() => { setMode('register'); setStep('form'); setError(''); }}
                  className="w-full h-[56px] sm:h-[52px] bg-[#F5F3F0] text-[#1A1A1A] rounded-xl text-[16px] sm:text-[15px] font-bold active:scale-[0.97] transition-all border border-[#E5E5EA] flex items-center justify-center gap-2.5 hover:bg-[#ECEAE6]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  Prima comandă? Creează cont
                </button>
              </div>
            </>
          )}

          {/* ═══ STEP 2: FORM ═══ */}
          {step === 'form' && (
            <>
              <div className="text-center mb-5 sm:mb-6">
                <h3 className="text-[20px] sm:text-[18px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {isLogin ? 'Intră în cont' : 'Creează cont'}
                </h3>
                <p className="text-[14px] sm:text-[13px] text-[#888] mt-1">
                  {isLogin
                    ? 'Introdu emailul cu care te-ai înregistrat'
                    : 'Completează datele pentru a-ți salva albumul'}
                </p>
              </div>

              {error && <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-50 text-red-600 text-[13px]">{error}</div>}

              <div className="space-y-3">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
                  className="w-full h-[52px] sm:h-[48px] px-4 rounded-xl border border-[#DDD] text-[16px] sm:text-[15px] focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]"
                  autoFocus autoComplete="email" inputMode="email"
                  onKeyDown={(e) => e.key === 'Enter' && formValid && handleSend()} />

                {!isLogin && (
                  <>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Prenume Nume"
                      className="w-full h-[52px] sm:h-[48px] px-4 rounded-xl border border-[#DDD] text-[16px] sm:text-[15px] focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]"
                      autoComplete="name" />
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] text-[#666] bg-[#F5F5F5] h-[52px] sm:h-[48px] px-3 rounded-xl flex items-center border border-[#DDD] font-medium">+373</span>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="60335030" maxLength={8}
                        className="flex-1 h-[52px] sm:h-[48px] px-4 rounded-xl border border-[#DDD] text-[16px] sm:text-[15px] focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]"
                        inputMode="numeric" autoComplete="tel" />
                    </div>
                  </>
                )}
              </div>

              <button onClick={handleSend} disabled={loading || !formValid}
                className="w-full h-[52px] sm:h-[48px] mt-4 bg-[#1C1C1E] text-white rounded-xl text-[16px] sm:text-[15px] font-bold active:scale-[0.97] transition-all disabled:opacity-40">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Se trimite...
                  </span>
                ) : 'Continuă'}
              </button>

              {/* Switch mode — direct la formularul celălalt, fără step intermediar */}
              <button onClick={() => {
                  const newMode = isLogin ? 'register' : 'login';
                  setMode(newMode);
                  setError('');
                }}
                className="w-full text-center text-[13px] text-[#888] mt-4 py-1">
                {isLogin ? (
                  <>Nu ai cont? <span className="text-[#3D6B5E] font-semibold">Creează unul</span></>
                ) : (
                  <>Ai deja cont? <span className="text-[#3D6B5E] font-semibold">Intră în cont</span></>
                )}
              </button>
            </>
          )}

          {/* ═══ STEP 3: CODE ═══ */}
          {step === 'code' && (
            <>
              <div className="text-center mb-6">
                {/* Returning user banner */}
                {returningUser && (
                  <div className="mb-4 px-4 py-3 rounded-xl bg-[#EAF0EC] border border-[#3D6B5E]/20">
                    <p className="text-[14px] font-semibold text-[#3D6B5E]">Bine ai revenit!</p>
                    <p className="text-[12px] text-[#5A8A72] mt-0.5">Ai deja un cont. Am trimis codul pe email.</p>
                  </div>
                )}

                <div className="w-14 h-14 bg-[#EAF0EC] rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-[#3D6B5E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <h3 className="text-[20px] sm:text-[18px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Outfit, sans-serif' }}>Verifică emailul</h3>
                <p className="text-[14px] sm:text-[13px] text-[#888] mt-1">
                  Am trimis codul pe<br /><strong className="text-[#1A1A1A]">{email}</strong>
                </p>
              </div>

              {error && <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-50 text-red-600 text-[13px]">{error}</div>}

              <div className="flex justify-center gap-2 sm:gap-2 mb-6">
                {code.map((digit, i) => (
                  <input key={i} ref={inputRefs[i]} type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-[48px] h-[56px] sm:w-[46px] sm:h-[52px] text-center text-[22px] sm:text-[20px] font-bold rounded-xl border-2 border-[#DDD] focus:border-[#3D6B5E] focus:outline-none transition-colors" />
                ))}
              </div>

              {loading && (
                <div className="flex flex-col items-center gap-2 mb-4 py-2">
                  <div className="w-6 h-6 border-2 border-[#3D6B5E]/20 border-t-[#3D6B5E] rounded-full animate-spin" />
                  <span className="text-[15px] text-[#3D6B5E] font-medium">Se conectează contul tău...</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => { setStep('form'); setCode(['', '', '', '', '', '']); setError(''); setReturningUser(false); }}
                  className="text-[14px] sm:text-[13px] text-[#3D6B5E] font-medium py-2 active:opacity-60">← Schimbă emailul</button>
                <button onClick={handleSend}
                  className="text-[14px] sm:text-[13px] text-[#3D6B5E] font-medium py-2 active:opacity-60">Trimite din nou</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
