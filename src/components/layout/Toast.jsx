import { AnimatePresence, motion } from 'motion/react';
import useUIStore from '../../stores/useUIStore';

export default function Toast() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-auto flex items-center gap-3 px-5 py-3 max-w-sm cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              borderRadius: '16px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
              border: '0.5px solid rgba(255,255,255,0.65)',
            }}
            onClick={() => removeToast(toast.id)}
          >
            {/* Icon */}
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#3D6B5E] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            {/* Message */}
            <span className="text-sm font-medium text-tx-1">{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
