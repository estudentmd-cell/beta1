import { useState, useEffect } from 'react';
import useUIStore from '../../stores/useUIStore';
import useAuthStore from '../../stores/useAuthStore';
import { db } from '../../firebase/config';

const CACHE_KEY = 'momentive-addresses';

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; } catch { return []; }
}
function writeCache(addresses) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(addresses)); } catch {}
}

// Firestore: save addresses on client doc
async function saveAddressesToFirestore(addresses) {
  if (!db) return;
  const { activeClientId } = useAuthStore.getState();
  if (!activeClientId) return;
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'clients', activeClientId), { addresses }, { merge: true });
  } catch (e) {
    console.warn('Addresses Firestore save failed:', e);
  }
}

async function loadAddressesFromFirestore() {
  if (!db) return null;
  const { activeClientId } = useAuthStore.getState();
  if (!activeClientId) return null;
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'clients', activeClientId));
    if (snap.exists() && snap.data().addresses) {
      return snap.data().addresses;
    }
  } catch {}
  return null;
}

function getAddresses() { return readCache(); }

async function saveAddresses(addresses) {
  await saveAddressesToFirestore(addresses);
  writeCache(addresses);
}

function AddressCard({ address, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-[12px] p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#EAF0EC] flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-[#3D6B5E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
            <circle cx="12" cy="11" r="3" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold text-[#1A1A1A]">{address.name}</p>
            {address.isDefault && (
              <span className="inline-flex items-center px-2 py-[2px] text-[11px] font-bold rounded-full bg-[#EAF0EC] text-[#3D6B5E]">Implicită</span>
            )}
          </div>
          <p className="text-[13px] text-[#555] mt-1">{address.street}</p>
          <p className="text-[13px] text-[#555]">{address.city}</p>
          {address.phone && <p className="text-[13px] text-[#888] mt-1">{address.phone}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#F0F0F0]">
        <button onClick={() => onDelete(address)} className="text-[13px] font-semibold text-[#C0392B] hover:text-[#a02e22] transition-colors">
          Șterge
        </button>
      </div>
    </div>
  );
}

export default function CabinetAddresses({ onNavigate }) {
  const { addToast } = useUIStore();
  const [addresses, setAddresses] = useState(getAddresses);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', street: '', city: '', phone: '' });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.street || !form.city) return;
    const newAddr = { ...form, id: Date.now(), isDefault: addresses.length === 0 };
    const updated = [...addresses, newAddr];
    await saveAddresses(updated);
    setAddresses(updated);
    setForm({ name: '', street: '', city: '', phone: '' });
    setShowForm(false);
    addToast('Adresă adăugată!');
  };

  const handleDelete = async (addr) => {
    const updated = addresses.filter((a) => a.id !== addr.id);
    await saveAddresses(updated);
    setAddresses(updated);
    addToast('Adresă ștearsă');
  };

  // Load from Firestore on mount
  useEffect(() => {
    loadAddressesFromFirestore().then((fs) => {
      if (fs && fs.length > 0) {
        writeCache(fs);
        setAddresses(fs);
      }
    });
  }, []);

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease]">
      <div className="hidden md:flex items-center gap-3">
        <button onClick={() => onNavigate('account')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F0F0F0] transition-colors">
          <svg className="w-5 h-5 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-serif text-[24px] text-[#1A1A1A]">Adrese de livrare</h1>
        <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-2 text-[12px] font-bold rounded-full bg-[#EAF0EC] text-[#3D6B5E]">
          {addresses.length}
        </span>
      </div>

      {addresses.length === 0 && !showForm && (
        <div className="text-center py-8">
          <span className="text-3xl block mb-2">📍</span>
          <p className="text-[14px] text-[#888]">Nu ai nicio adresă salvată</p>
        </div>
      )}

      {addresses.map((addr) => (
        <AddressCard key={addr.id} address={addr} onDelete={handleDelete} />
      ))}

      {showForm ? (
        <form onSubmit={handleAdd} className="bg-white rounded-[12px] p-4 space-y-3">
          <input type="text" placeholder="Nume adresă (ex: Acasă)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 text-[14px] bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
          <input type="text" placeholder="Strada, nr, apartament" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })}
            className="w-full px-4 py-3 text-[14px] bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
          <input type="text" placeholder="Oraș, cod poștal" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full px-4 py-3 text-[14px] bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
          <input type="tel" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3 text-[14px] bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 h-[44px] bg-[#3D6B5E] text-white text-[15px] font-semibold rounded-xl active:scale-[0.97] transition-all">Salvează</button>
            <button type="button" onClick={() => setShowForm(false)} className="h-[44px] px-5 text-[15px] text-[#8E8E93] active:opacity-50 transition-opacity">Anulează</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="w-full h-[44px] bg-white rounded-[12px] flex items-center justify-center gap-2 text-[15px] font-medium text-[#3D6B5E] active:scale-[0.98] transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Adresă nouă
        </button>
      )}
    </div>
  );
}
