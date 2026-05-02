import useAuthStore from '../../stores/useAuthStore';

export default function CabinetHeader() {
  const { clientName } = useAuthStore();
  const initial = clientName ? clientName.charAt(0).toUpperCase() : '?';

  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="w-12 h-12 rounded-full bg-ac text-white flex items-center justify-center text-lg font-bold shrink-0">
        {initial}
      </div>
      <div>
        <p className="text-sm text-tx-3">Bine ai revenit!</p>
        <h1 className="font-serif text-2xl">Proiectele Mele</h1>
      </div>
    </div>
  );
}
