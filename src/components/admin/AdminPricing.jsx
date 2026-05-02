import { useState, useEffect } from 'react';
import { useLivePricing, savePricing } from '../../hooks/usePricingAdmin';

const FORMATS = ['20×20', '20×30', '23×23', '30×30'];

export default function AdminPricing() {
  const { pricing, loading } = useLivePricing();
  const [activeTab, setActiveTab] = useState('pagini-groase');
  const [prices, setPrices] = useState(null);
  const [pageOptions, setPageOptions] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPages, setNewPages] = useState('');

  // Init from live data
  useEffect(() => {
    if (!loading && pricing) {
      setPrices({
        'pagini-groase': JSON.parse(JSON.stringify(pricing['pagini-groase']?.prices || {})),
        'pagini-subtiri': JSON.parse(JSON.stringify(pricing['pagini-subtiri']?.prices || {})),
      });
      setPageOptions({
        'pagini-groase': [...(pricing['pagini-groase']?.pageOptions || [])],
        'pagini-subtiri': [...(pricing['pagini-subtiri']?.pageOptions || [])],
      });
    }
  }, [loading, pricing]);

  if (loading || !prices || !pageOptions) {
    return <div className="p-8 text-center text-gray-400">Se încarcă prețurile...</div>;
  }

  const currentPrices = prices[activeTab] || {};
  const currentOptions = pageOptions[activeTab] || [];
  const tabLabel = activeTab === 'pagini-groase' ? 'Pagini Groase (Layflat)' : 'Pagini Subțiri (Revistă)';

  const updatePrice = (format, pages, value) => {
    const num = parseInt(value) || 0;
    setPrices(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [format]: { ...prev[activeTab][format], [pages]: num },
      },
    }));
    setSaved(false);
  };

  const addPageOption = () => {
    const num = parseInt(newPages);
    if (!num || num < 2 || currentOptions.includes(num)) return;
    const updated = [...currentOptions, num].sort((a, b) => a - b);
    setPageOptions(prev => ({ ...prev, [activeTab]: updated }));
    // Add default price 0 for all formats
    const newPrices = { ...prices[activeTab] };
    FORMATS.forEach(f => {
      if (newPrices[f]) newPrices[f] = { ...newPrices[f], [num]: 0 };
    });
    setPrices(prev => ({ ...prev, [activeTab]: newPrices }));
    setNewPages('');
    setSaved(false);
  };

  const removePageOption = (pages) => {
    if (!confirm(`Ștergi opțiunea de ${pages} pagini?`)) return;
    const updated = currentOptions.filter(p => p !== pages);
    setPageOptions(prev => ({ ...prev, [activeTab]: updated }));
    // Remove from price tables
    const newPrices = { ...prices[activeTab] };
    FORMATS.forEach(f => {
      if (newPrices[f]) {
        const copy = { ...newPrices[f] };
        delete copy[pages];
        newPrices[f] = copy;
      }
    });
    setPrices(prev => ({ ...prev, [activeTab]: newPrices }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePricing(
        prices['pagini-groase'],
        prices['pagini-subtiri'],
        pageOptions['pagini-groase'],
        pageOptions['pagini-subtiri'],
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Eroare la salvare: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1c1c1c]">Prețuri</h1>
          <p className="text-sm text-gray-500 mt-1">Editează prețurile per format și număr de pagini</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97] ${
            saved ? 'bg-green-500 text-white' :
            saving ? 'bg-gray-300 text-gray-500' :
            'bg-[#3D6B5E] text-white hover:bg-[#2d5445]'
          }`}
        >
          {saved ? '✓ Salvat' : saving ? 'Se salvează...' : 'Salvează prețurile'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'pagini-groase', label: 'Pagini Groase' },
          { key: 'pagini-subtiri', label: 'Pagini Subțiri' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-[#3D6B5E] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Price table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase w-32">Format</th>
                {currentOptions.map(pages => (
                  <th key={pages} className="px-3 py-3 text-center">
                    <div className="text-xs font-bold text-gray-700">{pages} pag</div>
                    <button
                      onClick={() => removePageOption(pages)}
                      className="text-[9px] text-red-400 hover:text-red-600 mt-0.5"
                    >
                      șterge
                    </button>
                  </th>
                ))}
                <th className="px-3 py-3 text-center w-24">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={newPages}
                      onChange={e => setNewPages(e.target.value)}
                      placeholder="Nr"
                      className="w-12 text-xs border border-gray-300 rounded px-1.5 py-1 text-center"
                      onKeyDown={e => e.key === 'Enter' && addPageOption()}
                    />
                    <button
                      onClick={addPageOption}
                      className="text-xs bg-[#3D6B5E] text-white px-2 py-1 rounded font-bold hover:bg-[#2d5445]"
                    >
                      +
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {FORMATS.map((format, fi) => (
                <tr key={format} className={`border-b border-gray-100 ${fi % 2 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-[#1c1c1c]">{format}</span>
                    <span className="text-[10px] text-gray-400 block">cm</span>
                  </td>
                  {currentOptions.map(pages => {
                    const price = currentPrices[format]?.[pages] ?? 0;
                    return (
                      <td key={pages} className="px-2 py-2 text-center">
                        <input
                          type="number"
                          value={price}
                          onChange={e => updatePrice(format, pages, e.target.value)}
                          className="w-16 text-center text-sm font-semibold border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E] transition-all"
                        />
                        <div className="text-[9px] text-gray-400 mt-0.5">MDL</div>
                      </td>
                    );
                  })}
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-xs text-amber-700">
          <strong>Notă:</strong> Prețurile se aplică imediat după salvare. Clienții vor vedea noile prețuri pe pagina de produs și la checkout.
          Dacă un client selectează un număr de pagini care nu e în tabel, prețul se calculează automat din cel mai apropriat pachet + 60 MDL per rotație suplimentară.
        </p>
      </div>
    </div>
  );
}
