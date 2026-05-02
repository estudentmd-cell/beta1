import { useNavigate } from 'react-router-dom';
import useProjectStore from '../../stores/useProjectStore';
import useEditorStore from '../../stores/useEditorStore';
import { getActiveOffers, getActiveOffersAsync } from '../../utils/offers';
import { getAllCoverTemplatesAsync } from '../../utils/coverData';
import OfferCard from './OfferCard';
import { useState, useEffect } from 'react';

export default function CabinetOffers({ onNavigate }) {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [templates, setTemplates] = useState([]);
  useEffect(() => {
    getActiveOffersAsync().then(setOffers);
    getAllCoverTemplatesAsync().then(setTemplates);
  }, []);

  const handleOfferClick = (offer) => {
    const productName = offer.product === 'pagini-groase' ? 'Album Pagini Groase' : 'Album Pagini Subțiri';

    useEditorStore.setState({
      photos: [],
      spreads: [{ id: 's0', mode: 'spread', full: null, left: null, right: null, photos: [] }],
      currentSpread: 0,
      undoStack: [],
      redoStack: [],
      selectedFrame: null,
      swapSource: null,
    });

    useProjectStore.getState().setProject(null, null);
    useProjectStore.setState({
      coverTemplate: null,
      productConfig: {
        name: productName,
        slug: offer.product,
        format: offer.format,
        initialPages: offer.pages,
        basePrice: offer.newPrice,
        extraPagePrice: 3.5,
        designPrice: 49,
        isOffer: true,
        offerId: offer.id,
        offerOldPrice: offer.oldPrice,
      },
    });

    navigate('/app/covers');
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease]">
      {/* Header — desktop only */}
      <div className="hidden md:flex items-center gap-3">
        <button onClick={() => onNavigate('account')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F0F0F0] transition-colors">
          <svg className="w-5 h-5 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-serif text-[24px] text-[#1A1A1A]">Oferte active</h1>
        <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-2 text-[12px] font-bold rounded-full bg-[#C0392B]/10 text-[#C0392B]">
          {offers.length}
        </span>
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl block mb-3">🎁</span>
          <p className="text-[15px] font-semibold text-[#1A1A1A]">Nicio ofertă activă momentan</p>
          <p className="text-[13px] text-[#888] mt-1">Revino curând — pregătim oferte speciale!</p>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-[#888]">Prețuri reduse pentru o perioadă limitată. Alege oferta și începe albumul!</p>
          <div className="grid grid-cols-2 gap-4">
            {offers.map((offer, i) => {
              const tpl = templates[i % (templates.length || 1)];
              const coverImage = tpl?.coverStyle?.mockupImage || tpl?.coverStyle?.designSquare || tpl?.coverStyle?.bgImage || null;
              return <OfferCard key={offer.id} offer={offer} onClick={handleOfferClick} coverImage={coverImage} />;
            })}
          </div>
        </>
      )}
    </div>
  );
}
