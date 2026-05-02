import { useMemo } from 'react';
import useProjectStore from '../stores/useProjectStore';
import { getPagePrice } from '../utils/pricing';

export default function usePricing() {
  const { productConfig, currentSpreadCount, chosenPath } = useProjectStore();

  return useMemo(() => {
    const pages = currentSpreadCount * 2 || productConfig.initialPages;
    const albumPrice = productConfig.isOffer ? productConfig.basePrice : getPagePrice(productConfig.format, pages, productConfig.slug);
    const designPrice = chosenPath === 'designer' ? productConfig.designPrice : 0;
    const total = albumPrice + designPrice;

    return { pages, albumPrice, designPrice, total };
  }, [productConfig, currentSpreadCount, chosenPath]);
}
