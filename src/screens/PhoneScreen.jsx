import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneCard from '../components/shared/PhoneCard';
import PhoneInput from '../components/shared/PhoneInput';
import useAuthStore from '../stores/useAuthStore';
import useUIStore from '../stores/useUIStore';
import { getClient } from '../firebase/clients';

export default function PhoneScreen() {
  const navigate = useNavigate();
  const { setClientInfo, setPendingClient } = useAuthStore();
  const { openModal } = useUIStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [digits, setDigits] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = name.trim().length >= 2 && digits.length >= 8 && consent;

  const handleSubmit = async () => {
    if (!isValid) return;
    setError('');
    setLoading(true);

    try {
      const phoneDigits = phone.replace(/\D/g, '');
      const clientId = `c_${phoneDigits}`;

      setClientInfo(name.trim(), phone);
      setPendingClient(clientId);

      const existing = await getClient(clientId);
      if (existing) {
        setPendingClient(clientId);
      }

      navigate('/app/phone-confirm', { state: { existing: !!existing, clientName: existing?.name } });
    } catch (e) {
      setError('A apărut o eroare. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhoneCard>
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-ac-light flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📱</span>
        </div>
        <h1 className="font-serif text-2xl mb-1">Să începem!</h1>
        <p className="text-sm text-tx-2">Introdu numele și numărul tău de telefon pentru a continua</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-tx-2 mb-1">Numele tău</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Numele tău (ex: Maria)"
            className="w-full bg-card border border-bdr rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ac/30 focus:border-ac"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-tx-2 mb-1">Numărul de telefon</label>
          <PhoneInput
            value={phone}
            onChange={(full, dig) => { setPhone(full); setDigits(dig); }}
          />
        </div>

        {error && (
          <p className="text-danger text-sm">{error}</p>
        )}

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 accent-ac w-4 h-4"
          />
          <span className="text-xs text-tx-3 leading-relaxed">
            Sunt de acord cu{' '}
            <button
              type="button"
              onClick={() => openModal('terms')}
              className="text-ac underline"
            >
              Termenii și Condițiile
            </button>
            {' '}și prelucrarea datelor personale
          </span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className={`w-full py-3 rounded font-semibold text-sm transition-all min-h-[44px]
            ${isValid && !loading ? 'bg-tx-1 text-white hover:bg-tx-2 active:scale-[0.98]' : 'bg-bg-3 text-tx-4 cursor-not-allowed'}`}
        >
          {loading ? 'Se încarcă...' : 'Continuă →'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="bg-bg rounded p-3 text-center">
          <span className="text-lg mb-1 block">💾</span>
          <span className="text-[11px] text-tx-3">Salvare automată</span>
        </div>
        <div className="bg-bg rounded p-3 text-center">
          <span className="text-lg mb-1 block">📲</span>
          <span className="text-[11px] text-tx-3">Notificări SMS</span>
        </div>
      </div>
    </PhoneCard>
  );
}
