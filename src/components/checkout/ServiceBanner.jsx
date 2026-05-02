import { SERVICE_INFO } from '../../utils/constants';
import useProjectStore from '../../stores/useProjectStore';
import useAuthStore from '../../stores/useAuthStore';

export default function ServiceBanner() {
  const { selectedServiceLevel } = useProjectStore();
  const { clientPhone } = useAuthStore();
  const info = SERVICE_INFO[selectedServiceLevel];

  if (!info) return null;

  return (
    <div className="bg-ac-light border border-ac/20 rounded-[12px] p-4 mb-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{info.icon}</span>
        <div className="flex-1">
          <p className="font-semibold text-sm text-tx-1">{info.title}</p>
          <p className="text-xs text-tx-3">Gata în {info.time} · {clientPhone}</p>
        </div>
        <span className="text-xs font-semibold text-ac bg-white px-2 py-1 rounded">Inclus gratuit</span>
      </div>
    </div>
  );
}
