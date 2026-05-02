import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';

export default function StickyUploadBar() {
  const location = useLocation();
  const { isAdmin } = useAuthStore();

  const showOn = ['/', '/colectie', '/preturi'];
  const shouldShow = showOn.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

  if (!shouldShow || isAdmin) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-pb">
      <Link
        to="/colectie/toate"
        className="block bg-[#1c1c1c] px-4 py-3 text-center no-underline"
      >
        <span className="text-white text-[14px] font-semibold">
          Începe albumul — e gratuit →
        </span>
      </Link>
    </div>
  );
}
