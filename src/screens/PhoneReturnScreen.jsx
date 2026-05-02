import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneCard from '../components/shared/PhoneCard';
import PhoneInput from '../components/shared/PhoneInput';
import useOrderStore from '../stores/useOrderStore';
import { getOrdersByPhone } from '../firebase/orders';

export default function PhoneReturnScreen() {
  const navigate = useNavigate();
  const { setApprovalOrder } = useOrderStore();

  const [phone, setPhone] = useState('');
  const [digits, setDigits] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (digits.length < 8) {
      setError('Introdu un număr valid');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const orders = await getOrdersByPhone(phone);
      const approvalOrder = orders.find((o) => o.status === 'pending_client_approval');

      if (approvalOrder) {
        setApprovalOrder(approvalOrder.id, approvalOrder);
        navigate('/app/approval');
      } else {
        setError('Nu am găsit o machetă de aprobat pentru acest număr');
      }
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
          <span className="text-3xl">🔐</span>
        </div>
        <h1 className="font-serif text-2xl mb-1">Verificare identitate</h1>
        <p className="text-sm text-tx-2">Introdu numărul de telefon pentru a vedea macheta</p>
      </div>

      <div className="space-y-4">
        <PhoneInput
          value={phone}
          onChange={(full, dig) => { setPhone(full); setDigits(dig); }}
        />

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          onClick={handleVerify}
          disabled={digits.length < 8 || loading}
          className={`w-full py-3 rounded font-semibold text-sm transition-all min-h-[44px] ${
            digits.length >= 8 && !loading
              ? 'bg-tx-1 text-white hover:bg-tx-2'
              : 'bg-bg-3 text-tx-4 cursor-not-allowed'
          }`}
        >
          {loading ? 'Se verifică...' : 'Verifică →'}
        </button>
      </div>
    </PhoneCard>
  );
}
