import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useEditorStore from '../../stores/useEditorStore';
import useUIStore from '../../stores/useUIStore';
import useProjectStore from '../../stores/useProjectStore';
import useAuthStore from '../../stores/useAuthStore';

/*
  Smart nudge — appears ONLY when:
  1. ALL photos are uploaded (upload complete, not in progress)
  2. Client does post-upload actions (cycles layout, moves photos, etc.)
  Non-aggressive — slides in from bottom, easy to dismiss.
*/
export default function DesignerNudge() {
  const navigate = useNavigate();
  const photos = useEditorStore((s) => s.photos);
  const isUploading = useEditorStore((s) => s.isUploading);
  const spreads = useEditorStore((s) => s.spreads);
  const { openModal } = useUIStore();
  const { setChosenPath, setServiceLevel } = useProjectStore();
  const { user, authMethod } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const actionCount = useRef(0);
  const prevSpreadsRef = useRef(null);

  // Detectăm când upload-ul s-a terminat
  useEffect(() => {
    if (!isUploading && photos.length >= 5 && !uploadDone) {
      // Toate pozele încărcate — marcăm ca done
      const allProcessed = photos.every(p => p.thumbData || p.previewUrl || p.blob);
      if (allProcessed) setUploadDone(true);
    }
  }, [isUploading, photos, uploadDone]);

  // Detectăm acțiuni post-upload (schimbări în spreads = ciclare layout, swap, move, etc.)
  useEffect(() => {
    if (!uploadDone || dismissed || visible) return;
    const shown = sessionStorage.getItem('momentive-nudge-shown');
    if (shown) return;

    // Comparăm spreads cu versiunea anterioară
    const spreadsStr = JSON.stringify(spreads.map(s => ({ vi: s.full?._vi, lvi: s.left?._vi, rvi: s.right?._vi, m: s.mode })));
    if (prevSpreadsRef.current && prevSpreadsRef.current !== spreadsStr) {
      actionCount.current++;
    }
    prevSpreadsRef.current = spreadsStr;

    // După 2 acțiuni post-upload → arată nudge
    if (actionCount.current >= 2) {
      const timer = setTimeout(() => {
        setVisible(true);
        sessionStorage.setItem('momentive-nudge-shown', '1');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [uploadDone, dismissed, visible, spreads]);

  if (!visible || dismissed) return null;

  const handleDesigner = () => {
    setDismissed(true);
    setChosenPath('designer');
    setServiceLevel('full_design');

    const hasAuth = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
    if (!hasAuth) {
      openModal('auth', { returnTo: '/app/checkout' });
    } else {
      navigate('/app/checkout');
    }
  };

  const handleSelf = () => {
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 z-[60] w-[420px] max-w-[calc(100%-32px)] animate-[slideUp_0.4s_ease]">
      <div className="bg-white rounded-[16px] shadow-2xl border border-[#EBEBEB] p-5 relative">
        {/* Close */}
        <button onClick={handleSelf} className="absolute top-3 right-3 text-[#BBB] hover:text-[#666] text-lg leading-none">×</button>

        {/* Content */}
        <div className="flex items-start gap-3">
          <span className="text-3xl">✨</span>
          <div>
            <p className="text-[14px] font-bold text-[#1A1A1A]">
              Ai încărcat {photos.length} fotografii!
            </p>
            <p className="text-[12px] text-[#666] mt-1 leading-relaxed">
              Vrei ca designerii noștri să creeze albumul <strong>gratuit</strong> pentru tine? Tu doar aprobi rezultatul.
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleDesigner}
                className="px-4 py-2 bg-[#3D6B5E] text-white text-[12px] font-bold rounded-lg hover:bg-[#2d5445] active:scale-[0.97] transition-all"
              >
                Da, designerii fac totul →
              </button>
              <button
                onClick={handleSelf}
                className="px-3 py-2 text-[12px] text-[#888] hover:text-[#555] font-medium transition-colors"
              >
                Continui singur
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
