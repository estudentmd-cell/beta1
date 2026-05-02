import PhotoGridItem from './PhotoGridItem';

export default function PhotoGrid({ items, onToggle }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 animate-[eupFadeIn_0.3s_ease]">
      {items.map((item) => (
        <PhotoGridItem key={item.id} item={item} onToggle={onToggle} />
      ))}
    </div>
  );
}
