import { useNavigate } from 'react-router-dom';
import useProjectStore from '../../stores/useProjectStore';
import useAuthStore from '../../stores/useAuthStore';
import useUIStore from '../../stores/useUIStore';
import { trackServiceSelected } from '../../utils/metaPixel';

export default function ServicePickerModal() {
  const navigate = useNavigate();
  const { setChosenPath, setServiceLevel } = useProjectStore();
  const { user, authMethod } = useAuthStore();
  const { closeModal, openModal } = useUIStore();

  const handleDesigner = () => {
    trackServiceSelected('designer');
    setServiceLevel('full_design');
    setChosenPath('designer');

    const hasAuth = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
    closeModal();
    if (!hasAuth) {
      openModal('auth', { returnTo: '/app/checkout' });
    } else {
      navigate('/app/checkout');
    }
  };

  const handleSelf = () => {
    trackServiceSelected('self');
    setServiceLevel('self_service');
    setChosenPath('self');
    closeModal();
    // Small delay to avoid modal overlap
    setTimeout(() => openModal('autoFill'), 100);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" onClick={closeModal}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-[20px] sm:rounded-[20px] shadow-2xl w-full sm:max-w-md sm:mx-4 animate-[modalIn_0.3s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#3D6B5E] text-white p-6 rounded-t-[20px] sm:rounded-t-[20px]">
          <button onClick={closeModal} className="absolute top-4 right-4 text-white/60 hover:text-white text-xl leading-none">×</button>
          <h2 className="font-serif text-xl mb-1">Cum vrei să fie creat albumul?</h2>
          <p className="text-sm text-white/70">Serviciile sunt gratuite</p>
        </div>

        {/* Options */}
        <div className="p-5 space-y-3">
          {/* Vreau designer */}
          <button
            onClick={handleDesigner}
            className="w-full text-left p-4 rounded-[14px] border-2 border-[#3D6B5E] bg-[#EAF0EC] hover:bg-[#dde8e1] transition-all relative"
          >
            <span className="absolute -top-2 right-3 text-[9px] font-bold bg-[#3D6B5E] text-white px-2 py-0.5 rounded-full uppercase">
              Recomandat
            </span>
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">✨</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px] text-[#1A1A1A]">Vreau designer</p>
                <p className="text-[12px] text-[#777] mt-1 leading-relaxed">
                  Încarci pozele, noi aranjăm totul profesional. Tu doar aprobi rezultatul.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold text-[#3D6B5E] bg-[#3D6B5E]/10 px-2 py-0.5 rounded-full">GRATUIT</span>
                  <span className="text-[10px] text-[#999]">Gata în 24-48h</span>
                </div>
              </div>
            </div>
          </button>

          {/* Creez singur */}
          <button
            onClick={handleSelf}
            className="w-full text-left p-4 rounded-[14px] border-2 border-[#EBEBEB] hover:border-[#3D6B5E]/30 transition-all"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🎨</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px] text-[#1A1A1A]">Creez singur</p>
                <p className="text-[12px] text-[#777] mt-1 leading-relaxed">
                  Aranjezi pozele pe pagini cum dorești. Noi verificăm calitatea înainte de tipar.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold text-[#3D6B5E] bg-[#3D6B5E]/10 px-2 py-0.5 rounded-full">GRATUIT</span>
                  <span className="text-[10px] text-[#999]">12h verificare</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        <p className="text-center text-[10px] text-[#BBB] pb-5">Poți modifica oricând după plată</p>
      </div>
    </div>
  );
}
