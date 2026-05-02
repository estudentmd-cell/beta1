import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useUIStore from '../stores/useUIStore';

export default function useUploadCTA() {
  const navigate = useNavigate();
  const { user, authMethod } = useAuthStore();
  const { openModal } = useUIStore();

  const startUpload = () => {
    const hasIdentity = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
    if (hasIdentity) {
      // Already auth — go to editor
      navigate('/app/editor');
    } else {
      // Need auth first — modal, then redirect to editor
      openModal('auth', { mode: 'upload', returnTo: '/app/editor' });
    }
  };

  return { startUpload };
}
