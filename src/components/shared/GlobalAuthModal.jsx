import useUIStore from '../../stores/useUIStore';
import AuthModal from '../modals/AuthModal';

export default function GlobalAuthModal() {
  const { activeModal, modalData, closeModal } = useUIStore();
  if (activeModal !== 'auth') return null;
  return (
    <AuthModal
      onClose={closeModal}
      onSuccess={(result) => {
        closeModal();
        if (modalData?.onSuccess) modalData.onSuccess(result);
      }}
      mode={modalData?.mode || 'register'}
    />
  );
}
