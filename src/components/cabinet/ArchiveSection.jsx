import { useState } from 'react';
import ProjectGrid from './ProjectGrid';

export default function ArchiveSection({ projects, onProjectClick }) {
  const [open, setOpen] = useState(false);

  if (!projects || projects.length === 0) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-tx-3 hover:text-tx-2 transition-colors mb-3"
      >
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        Amintiri în așteptare ({projects.length})
      </button>
      {open && <ProjectGrid projects={projects} onProjectClick={onProjectClick} />}
    </div>
  );
}
