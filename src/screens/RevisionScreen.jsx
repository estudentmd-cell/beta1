import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useOrderStore from '../stores/useOrderStore';
import useUIStore from '../stores/useUIStore';
import { updateOrder, addTimeline } from '../firebase/orders';

export default function RevisionScreen() {
  const navigate = useNavigate();
  const { approvalOrder, approvalOrderId } = useOrderStore();
  const { addToast } = useUIStore();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!approvalOrder) {
    navigate('/app/phone-return');
    return null;
  }

  const revisionCount = approvalOrder.revision_count || 0;
  const revisionMax = approvalOrder.revision_max || 3;

  const handleSubmit = async () => {
    if (!message.trim()) {
      addToast('Descrie modificările dorite');
      return;
    }

    setLoading(true);
    try {
      await updateOrder(approvalOrderId, {
        status: 'revision_requested',
        revision_count: revisionCount + 1,
        revision_msg: message.trim(),
      });
      await addTimeline(approvalOrderId, 'Revizuire solicitată', message.trim());
      addToast('Cererea de modificare a fost trimisă');
      navigate('/app/cabinet');
    } catch (e) {
      addToast('Eroare. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-[fadeIn_0.4s_ease] min-h-screen pt-[72px] px-4 pb-8">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate('/app/approval')}
          className="flex items-center gap-1 text-sm text-tx-2 hover:text-tx-1 transition-colors mb-4 min-h-[44px]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          Înapoi la machetă
        </button>

        <h1 className="font-serif text-2xl mb-2">Solicită modificări</h1>
        <p className="text-sm text-tx-2 mb-6">Descrie ce dorești să fie schimbat în machetă</p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ex: Vreau să schimb ordinea pozelor pe paginile 5-6, și să adaug un text pe ultima pagină..."
          rows={5}
          className="w-full bg-card border border-bdr rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ac/30 resize-none mb-4"
        />

        <div className="flex items-center justify-between mb-6">
          <span className={`text-xs font-medium ${revisionCount >= revisionMax ? 'text-danger' : 'text-tx-3'}`}>
            Revizii: {revisionCount} din {revisionMax} incluse
          </span>
          {revisionCount >= revisionMax && (
            <span className="text-xs text-danger">Reviziile suplimentare pot fi taxate</span>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !message.trim()}
          className={`w-full py-3 rounded font-semibold text-sm transition-all min-h-[44px] ${
            message.trim() && !loading
              ? 'bg-tx-1 text-white hover:bg-tx-2'
              : 'bg-bg-3 text-tx-4 cursor-not-allowed'
          }`}
        >
          {loading ? 'Se trimite...' : 'Trimite cererea de modificare'}
        </button>
      </div>
    </div>
  );
}
