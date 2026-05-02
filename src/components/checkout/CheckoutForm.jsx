import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';
import useProjectStore from '../../stores/useProjectStore';

export default function CheckoutForm({ formData, setFormData }) {
  const navigate = useNavigate();
  const { clientName, clientPhone } = useAuthStore();
  const { chosenPath } = useProjectStore();

  const handleBack = () => {
    if (chosenPath === 'self') {
      navigate('/app/editor');
    } else {
      navigate('/app/cabinet');
    }
  };

  const update = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      {/* Back */}
      <button onClick={handleBack} className="flex items-center gap-1 text-sm text-tx-2 hover:text-tx-1 transition-colors mb-4 min-h-[44px]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        Înapoi
      </button>

      {/* Contact */}
      <section className="mb-6">
        <h3 className="font-semibold text-sm mb-3">Date de contact</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-tx-3 mb-1">Nume</label>
            <input
              type="text"
              value={formData.name || clientName}
              onChange={(e) => update('name', e.target.value)}
              className="w-full bg-card border border-bdr rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ac/30"
            />
          </div>
          <div>
            <label className="block text-xs text-tx-3 mb-1">Telefon *</label>
            <div className="flex gap-2">
              <input value="+373" readOnly className="w-[70px] px-3 py-3 rounded border border-bdr bg-bg/50 text-sm text-center text-tx-3" />
              <input
                type="tel"
                inputMode="numeric"
                value={formData.phone || clientPhone?.replace('+373 ', '').replace('+373', '') || ''}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="69 123 456"
                className="flex-1 bg-card border border-bdr rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ac/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-tx-3 mb-1">Email * <span className="text-tx-4 font-normal">(pentru urmărirea comenzii)</span></label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => update('email', e.target.value)}
              placeholder="maria@gmail.com"
              className="w-full bg-card border border-bdr rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ac/30"
            />
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="mb-6">
        <h3 className="font-semibold text-sm mb-3">Adresa de livrare</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-tx-3 mb-1">Strada</label>
            <input
              type="text"
              value={formData.street || ''}
              onChange={(e) => update('street', e.target.value)}
              placeholder="Strada, nr., bloc, apartament"
              className="w-full bg-card border border-bdr rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ac/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-tx-3 mb-1">Oraș</label>
              <input
                type="text"
                value={formData.city || 'Chișinău'}
                onChange={(e) => update('city', e.target.value)}
                className="w-full bg-card border border-bdr rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ac/30"
              />
            </div>
            <div>
              <label className="block text-xs text-tx-3 mb-1">Cod poștal</label>
              <input
                type="text"
                value={formData.zip || ''}
                onChange={(e) => update('zip', e.target.value)}
                placeholder="MD-2001"
                className="w-full bg-card border border-bdr rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ac/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-tx-3 mb-1">Țara</label>
            <select
              value={formData.country || 'MD'}
              onChange={(e) => update('country', e.target.value)}
              className="w-full bg-card border border-bdr rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ac/30"
            >
              <option value="MD">Moldova</option>
              <option value="RO">România</option>
            </select>
          </div>
        </div>
      </section>

      {/* Payment */}
      <section className="mb-6">
        <h3 className="font-semibold text-sm mb-3">Metoda de plată</h3>
        <div className="space-y-2">
          {[
            { value: 'card', label: '💳 Card bancar' },
            { value: 'transfer', label: '🏦 Transfer bancar' },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-3 p-3 border border-bdr rounded cursor-pointer hover:bg-bg transition-colors">
              <input
                type="radio"
                name="payment"
                value={opt.value}
                checked={(formData.payment || 'card') === opt.value}
                onChange={(e) => update('payment', e.target.value)}
                className="accent-ac"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
