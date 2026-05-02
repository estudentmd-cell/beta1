import { useNavigate, useLocation } from 'react-router-dom';
import PhoneCard from '../components/shared/PhoneCard';
import useAuthStore from '../stores/useAuthStore';
import { createClient, updateClientAccess } from '../firebase/clients';

export default function PhoneConfirmScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientName, clientPhone, pendingClientId, confirmClient } = useAuthStore();

  const existing = location.state?.existing;
  const existingName = location.state?.clientName;

  const maskedName = existingName
    ? existingName.charAt(0) + '***' + existingName.charAt(existingName.length - 1)
    : '';

  const formattedPhone = clientPhone
    ? clientPhone.replace(/(\+\d{2,3})(\d{2})(\d{3})(\d{3})/, '$1 $2 $3 $4')
    : '';

  const handleConfirm = async () => {
    try {
      if (existing) {
        await updateClientAccess(pendingClientId);
      } else {
        await createClient(pendingClientId, {
          name: clientName,
          phone: clientPhone,
          consent_terms: true,
          consent_sms: true,
          consent_at: new Date().toISOString(),
        });
      }
      confirmClient(pendingClientId);
      navigate('/app/cabinet');
    } catch (e) {
      console.error('Confirm failed', e);
    }
  };

  const handleBack = () => {
    navigate('/app/phone');
  };

  if (!pendingClientId) {
    navigate('/app/phone');
    return null;
  }

  return (
    <PhoneCard>
      <div className="text-center mb-6">
        {existing ? (
          <>
            <div className="w-16 h-16 rounded-full bg-ac-light flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👋</span>
            </div>
            <h1 className="font-serif text-2xl mb-1">Bine ai revenit!</h1>
            <p className="text-sm text-tx-2">
              Am găsit un cont asociat cu acest număr{maskedName && <> ({maskedName})</>}
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-ac-light flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📱</span>
            </div>
            <h1 className="font-serif text-2xl mb-1">Verifică numărul</h1>
            <p className="text-sm text-tx-2">
              Confirmă că acest număr este corect
            </p>
          </>
        )}
      </div>

      <div className="bg-bg rounded-[12px] p-4 mb-6 text-center">
        <p className="text-lg font-semibold text-tx-1 tracking-wide">{formattedPhone}</p>
        <p className="text-sm text-tx-3 mt-1">{clientName}</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleConfirm}
          className="w-full py-3 rounded font-semibold text-sm bg-tx-1 text-white hover:bg-tx-2 active:scale-[0.98] transition-all min-h-[44px]"
        >
          Da, sunt eu →
        </button>
        <button
          onClick={handleBack}
          className="w-full py-3 rounded font-semibold text-sm bg-bg-2 text-tx-2 hover:bg-bg-3 transition-all min-h-[44px] flex items-center justify-center gap-1"
        >
          ✏️ Corectează numărul
        </button>
      </div>
    </PhoneCard>
  );
}
