import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import { updateProject } from '../../firebase/projects';

export default function CancelModal() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectStore();
  const { closeModal, addToast } = useUIStore();
  const [step, setStep] = useState(1);

  const handleSave = async () => {
    if (currentProjectId) {
      await updateProject(currentProjectId, { status: 'in_cart' });
    }
    addToast('Album salvat pentru mai târziu');
    closeModal();
    navigate('/app/cabinet');
  };

  const handleCancel = async () => {
    addToast('Comanda a fost anulată');
    closeModal();
    navigate('/app/cabinet');
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={closeModal}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-card rounded-[16px] shadow-lg w-full max-w-sm p-6 animate-[modalIn_0.3s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 1 ? (
          <>
            <div className="text-center mb-5">
              <span className="text-4xl mb-2 block">🤔</span>
              <h2 className="font-serif text-xl mb-1">Ce dorești să faci?</h2>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleSave}
                className="w-full py-3 rounded font-semibold text-sm bg-ac text-white hover:bg-ac-2 transition-colors min-h-[44px]"
              >
                Salvează pe mai târziu
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-full py-3 rounded font-semibold text-sm bg-bg-2 text-tx-2 hover:bg-bg-3 transition-colors min-h-[44px]"
              >
                Anulează comanda
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-5">
              <span className="text-4xl mb-2 block">⚠️</span>
              <h2 className="font-serif text-xl mb-1">Sigur anulezi?</h2>
              <p className="text-sm text-danger">Toate datele vor fi pierdute</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleCancel}
                className="w-full py-3 rounded font-semibold text-sm bg-danger text-white hover:bg-danger/90 transition-colors min-h-[44px]"
              >
                Da, anulează tot
              </button>
              <button
                onClick={handleSave}
                className="w-full py-3 rounded font-semibold text-sm bg-ac text-white hover:bg-ac-2 transition-colors min-h-[44px]"
              >
                Mă răzgândesc, salvează
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
