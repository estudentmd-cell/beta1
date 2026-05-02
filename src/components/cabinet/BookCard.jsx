import Badge from '../shared/Badge';
import { formatDate } from '../../utils/delivery';

export default function BookCard({ project, onClick }) {
  return (
    <button
      onClick={() => onClick(project)}
      className="bg-card rounded-[12px] overflow-hidden shadow hover:-translate-y-0.5 hover:shadow-lg transition-all text-left group w-full"
    >
      <div className="aspect-[3/4] bg-bg-2 flex items-center justify-center relative overflow-hidden">
        {project.thumb_url ? (
          <img src={project.thumb_url} alt={project.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl opacity-40">📖</span>
        )}
        <div className="absolute top-2 right-2">
          <Badge status={project.status} />
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-tx-1 truncate">{project.title || 'Album fără titlu'}</p>
        <p className="text-[11px] text-tx-3 mt-0.5">
          {project.page_count || 40} pag · {project.updated_at ? formatDate(project.updated_at) : ''}
        </p>
      </div>
    </button>
  );
}
