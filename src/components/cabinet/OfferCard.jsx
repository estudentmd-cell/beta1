import { daysLeft } from '../../utils/offers';
import { useState, useEffect } from 'react';
import { getAllCoverTemplatesAsync } from '../../utils/coverData';

export default function OfferCard({ offer, onClick, coverImage }) {
  const days = daysLeft(offer.deadline);

  return (
    <button
      onClick={() => onClick(offer)}
      className="text-left rounded-[12px] overflow-hidden bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98] group"
    >
      {/* Mockup area — real cover image from templates */}
      <div className="bg-[#E8E5E0] relative overflow-hidden" style={{ aspectRatio: '1' }}>
        {coverImage ? (
          <img src={coverImage} alt={`Album ${offer.format}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#E8E5E0] to-[#D8D3CB]" />
        )}
        {/* Badge */}
        <span className="absolute top-3 right-3 bg-[#C0392B] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          {offer.badge}
        </span>
        {/* Emoji */}
        <span className="absolute top-3 left-3 text-lg">{offer.emoji}</span>
      </div>

      {/* Info */}
      <div className="p-4">
        {/* Tagline */}
        <p className="text-[11px] text-[#888] italic mb-1">{offer.tagline}</p>

        {/* Product info */}
        <p className="text-[14px] font-bold text-[#1A1A1A]">{offer.format} · {offer.pages} pagini</p>
        <p className="text-[11px] text-[#888] mt-0.5">
          {offer.product === 'pagini-groase' ? 'Pagini groase layflat' : 'Pagini subțiri revistă'}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-[12px] text-[#BBB] line-through">{offer.oldPrice} lei</span>
          <span className="text-[20px] font-bold text-[#3D6B5E]">{offer.newPrice} lei</span>
        </div>

        {/* Deadline + CTA */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-[#999] flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            {days > 0 ? `${days === 1 ? 'Ultima zi' : `Mai sunt ${days} zile`}` : 'Expirat'}
          </span>
          <span className="text-[12px] font-bold text-[#3D6B5E] group-hover:underline">
            Comandă →
          </span>
        </div>
      </div>
    </button>
  );
}
