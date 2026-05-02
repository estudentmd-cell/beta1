import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useProjectStore from '../stores/useProjectStore';
import useEditorStore from '../stores/useEditorStore';
import { db } from '../firebase/config';

/* Search projects by phone in Firestore */
async function findProjectsByPhone(phone) {
  const last8 = phone.replace(/\D/g, '').slice(-8);
  if (!last8 || last8.length < 6) return [];

  const results = [];

  // Search Firestore projects collection
  if (db) {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'projects'));
      for (const d of snap.docs) {
        const data = { id: d.id, ...d.data() };
        const p = (data.clientPhone || '').replace(/\D/g, '').slice(-8);
        if (p === last8) results.push(data);
      }
    } catch {}
  }

  return results.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
}

function ProjectCard({ project, onResume }) {
  const cfg = project.productConfig;
  const name = cfg?.name || cfg?.slug || 'Album';
  const format = cfg?.format || '';
  const pages = cfg?.pages || cfg?.initialPages || '';
  const photos = project.totalPhotos || 0;
  const progress = project.progress || 0;
  const date = project.updatedAt || project.createdAt || '';
  const dateStr = date ? new Date(date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-xl bg-[#F5F0EB] flex items-center justify-center text-2xl shrink-0">
        📖
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[#1A1A1A] text-sm">{name}</h3>
        <p className="text-xs text-[#888] mt-0.5">{format} · {pages} pagini · {photos} poze</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div className="h-full bg-[#3D6B5E] rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] text-[#888] font-medium">{progress}%</span>
        </div>
        {dateStr && <p className="text-[10px] text-[#AAA] mt-1">Ultima editare: {dateStr}</p>}
      </div>
      <button
        onClick={() => onResume(project)}
        className="shrink-0 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] active:scale-[0.97] transition-all"
      >
        Continuă →
      </button>
    </div>
  );
}

export default function RevinScreen() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [projects, setProjects] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (phone.replace(/\D/g, '').length < 6) {
      setError('Introdu un număr valid');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const found = await findProjectsByPhone(phone);
      setProjects(found);
      if (found.length === 0) setError('Nu am găsit proiecte pentru acest număr');
    } catch {
      setError('Eroare la căutare. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = (project) => {
    // Auth is handled via email_code or google — no phone sign-in needed
    // If not authenticated, the editor will prompt auth via the unified modal

    // Restore project config
    const projStore = useProjectStore.getState();
    if (project.productConfig) {
      projStore.setProductConfig(project.productConfig);
    }
    if (project.coverTemplate) {
      projStore.setCoverTemplate(project.coverTemplate);
    }
    if (project.id) {
      projStore.setProjectId(project.id);
    }

    // Navigate to editor
    navigate('/app/editor');
  };

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-[#1A1A1A]">fotocarte<span className="text-[#3D6B5E]">.</span></h1>
          <p className="text-sm text-[#888] mt-2">Introdu numărul de telefon pentru a reveni la proiectul tău</p>
        </div>

        {/* Phone input */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EBEBEB] p-6 mb-4">
          <label className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2 block">Număr de telefon</label>
          <div className="flex gap-2">
            <input
              value="+373"
              readOnly
              className="w-[70px] px-3 py-3 rounded-xl border border-[#EBEBEB] bg-[#FAFAFA] text-sm text-center text-[#888]"
            />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="69 123 456"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setProjects(null); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-3 rounded-xl border border-[#EBEBEB] bg-white text-sm outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]"
              autoFocus
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || phone.replace(/\D/g, '').length < 6}
            className="w-full mt-4 py-3 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold hover:bg-[#333] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Caut...' : 'Găsește proiectul meu →'}
          </button>

          {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
        </div>

        {/* Results */}
        {projects && projects.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-[#888] font-medium px-1">
              {projects.length} {projects.length === 1 ? 'proiect găsit' : 'proiecte găsite'}
            </p>
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} onResume={handleResume} />
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="text-center mt-6">
          <button onClick={() => navigate('/')} className="text-sm text-[#888] hover:text-[#3D6B5E] transition-colors">
            ← Înapoi la pagina principală
          </button>
        </div>
      </div>
    </div>
  );
}
