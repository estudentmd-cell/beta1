export default function PhotoGridItem({ item, onToggle }) {
  const isPending = item.status === 'pending';
  const isDone = item.status === 'done';

  return (
    <button
      onClick={() => isDone && onToggle(item.id)}
      className="relative aspect-square rounded overflow-hidden bg-bg-2 group"
    >
      {item.thumbData && (
        <img
          src={item.thumbData}
          alt={item.fileName}
          className={`w-full h-full object-cover transition-opacity ${isDone && !item.selected ? 'opacity-40' : ''}`}
        />
      )}

      {/* Uploading shimmer */}
      {isPending && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="w-full h-1 bg-white/20 overflow-hidden rounded">
            <div className="h-full bg-white/60 animate-[eupShimmer_1.5s_infinite]" style={{ width: '40%' }} />
          </div>
        </div>
      )}

      {/* Done checkmark */}
      {isDone && item.selected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-ac text-white flex items-center justify-center animate-[eupBounceIn_0.3s_ease]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Deselected indicator */}
      {isDone && !item.selected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 border-white/80 bg-black/20" />
      )}
    </button>
  );
}
