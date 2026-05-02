import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useUIStore from '../stores/useUIStore';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawReturn = searchParams.get('returnTo') || '/app/cabinet';
  const returnTo = rawReturn.startsWith('/') && !rawReturn.startsWith('//') ? rawReturn : '/app/cabinet';
  const { isAuthenticated } = useAuthStore();

  // Already authenticated → redirect
  useEffect(() => {
    if (isAuthenticated) navigate(returnTo, { replace: true });
  }, [isAuthenticated, navigate, returnTo]);

  // Open auth modal
  useEffect(() => {
    if (!isAuthenticated) {
      useUIStore.getState().openModal?.('auth', {
        returnTo,
        hideSkip: true,
        onSuccess: () => navigate(returnTo, { replace: true }),
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#3D6B5E]/20 border-t-[#3D6B5E] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[13px] text-[#857D74]">Se încarcă...</p>
      </div>
    </div>
  );
}
