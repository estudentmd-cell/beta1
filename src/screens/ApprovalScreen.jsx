import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useOrderStore from '../stores/useOrderStore';
import useProjectStore from '../stores/useProjectStore';
import { updateOrder, addTimeline } from '../firebase/orders';
import useUIStore from '../stores/useUIStore';

export default function ApprovalScreen() {
  const navigate = useNavigate();
  const { approvalOrder, approvalOrderId } = useOrderStore();
  const { setApprovalEditMode } = useProjectStore();
  const { addToast } = useUIStore();

  const [currentSpread, setCurrentSpread] = useState(0);

  if (!approvalOrder) {
    navigate('/app/phone-return');
    return null;
  }

  const spreads = approvalOrder.project_data?.spreads || [];
  const totalSpreads = spreads.length || 10;

  const handleApprove = async () => {
    try {
      await updateOrder(approvalOrderId, { status: 'approved_print' });
      await addTimeline(approvalOrderId, 'Machetă aprobată', 'Clientul a aprobat macheta');
      navigate('/app/confirm-approved');
    } catch (e) {
      addToast('Eroare. Încearcă din nou.');
    }
  };

  const handleRevise = () => {
    navigate('/app/revision');
  };

  const handleEdit = () => {
    setApprovalEditMode(true);
    navigate('/app/editor');
  };

  return (
    <div className="animate-[fadeIn_0.4s_ease] min-h-screen pt-[72px] px-4 pb-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-serif text-2xl mb-1">Macheta albumului tău</h1>
          <p className="text-sm text-tx-3">
            {approvalOrder.product_name} · {approvalOrder.product_format} · {approvalOrder.product_pages} pagini
          </p>
        </div>

        {/* Spread preview */}
        <div className="bg-card rounded-[16px] shadow p-4 mb-6">
          <div className="aspect-[2/1] bg-bg-2 rounded flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center text-tx-4 text-sm">
              <span>MACHETĂ · fotocarte</span>
            </div>
            <div className="grid grid-cols-2 gap-1 w-full h-full p-2">
              <div className="bg-bg-3 rounded flex items-center justify-center text-tx-4 text-xs">
                Pagina {currentSpread * 2 + 1}
              </div>
              <div className="bg-bg-3 rounded flex items-center justify-center text-tx-4 text-xs">
                Pagina {currentSpread * 2 + 2}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setCurrentSpread(Math.max(0, currentSpread - 1))}
              disabled={currentSpread === 0}
              className="px-3 py-2 text-sm text-tx-2 hover:text-tx-1 disabled:opacity-30 min-h-[44px]"
            >
              ← Prev
            </button>
            <span className="text-xs text-tx-3">{currentSpread + 1} / {totalSpreads}</span>
            <button
              onClick={() => setCurrentSpread(Math.min(totalSpreads - 1, currentSpread + 1))}
              disabled={currentSpread >= totalSpreads - 1}
              className="px-3 py-2 text-sm text-tx-2 hover:text-tx-1 disabled:opacity-30 min-h-[44px]"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleApprove}
            className="w-full py-3 rounded font-semibold text-sm bg-ac text-white hover:bg-ac-2 transition-colors min-h-[44px] flex items-center justify-center gap-2"
          >
            ✅ Aprobă macheta
          </button>
          <button
            onClick={handleRevise}
            className="w-full py-3 rounded font-semibold text-sm bg-bg-2 text-tx-1 hover:bg-bg-3 transition-colors min-h-[44px] flex items-center justify-center gap-2"
          >
            ✏️ Solicită modificări
          </button>
          <button
            onClick={handleEdit}
            className="w-full py-3 rounded font-semibold text-sm bg-bg-2 text-tx-1 hover:bg-bg-3 transition-colors min-h-[44px] flex items-center justify-center gap-2"
          >
            🎨 Editează personal
          </button>
        </div>
      </div>
    </div>
  );
}
