import BookCard from './BookCard';

export default function ProjectGrid({ projects, onProjectClick }) {
  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-12 text-tx-3">
        <span className="text-3xl mb-2 block">📂</span>
        <p className="text-sm">Niciun proiect încă</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
      {projects.map((p) => (
        <BookCard key={p.id} project={p} onClick={onProjectClick} />
      ))}
    </div>
  );
}
