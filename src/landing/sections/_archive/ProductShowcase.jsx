import { Link } from 'react-router-dom';
import EditableText from '../../components/cms/EditableText';
import EditableImage from '../../components/cms/EditableImage';

const products = [
  {
    id: 'layflat',
    title: 'Album Pagini Groase',
    image: '/images/pagini-groase/1.jpg',
    subtitle: 'Layflat — deschidere plată 180°, pagini rigide premium',
    price: 'de la 850 MDL',
    badge: 'POPULAR',
  },
  {
    id: 'magazine',
    title: 'Album Pagini Subțiri',
    image: '/images/pagini-subtiri/1.webp',
    subtitle: 'Stil revistă — pagini flexibile, ușor și accesibil',
    price: 'de la 450 MDL',
    badge: null,
  },
];

export default function ProductShowcase() {
  return (
    <section className="py-16 px-4 bg-[#FAF8F5]">
      <EditableText
        id="showcase-title"
        defaultValue="Alege albumul potrivit"
        tag="h2"
        className="font-serif text-3xl text-center text-tx-1 mb-10"
      />

      <div className="max-w-3xl mx-auto grid grid-cols-2 gap-3 sm:gap-6 px-1 sm:px-0">
        {products.map((product) => (
          <Link
            key={product.id}
            to="/app/editor"
            className="group bg-white rounded-lg sm:rounded-sm overflow-hidden transition-shadow duration-300 hover:shadow-lg no-underline"
          >
            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden">
              <EditableImage
                id={`showcase-img-${product.id}`}
                defaultSrc={product.image}
                alt={product.title}
                className="w-full h-full"
                imgClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {product.badge && (
                <span className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-ac text-white uppercase text-[9px] sm:text-[10px] tracking-wider font-semibold px-2 py-0.5 sm:px-3 sm:py-1 rounded-sm">
                  {product.badge}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-2.5 sm:p-4">
              <EditableText
                id={`showcase-title-${product.id}`}
                defaultValue={product.title}
                tag="h3"
                className="font-serif text-[15px] sm:text-xl text-tx-1 mb-0.5 sm:mb-1"
              />
              <EditableText
                id={`showcase-sub-${product.id}`}
                defaultValue={product.subtitle}
                tag="p"
                className="text-[12px] sm:text-sm text-tx-3 mb-2 sm:mb-3 line-clamp-2"
              />
              <div className="mb-2 sm:mb-4" />
              <span className="text-ac font-medium text-[12px] sm:text-sm inline-flex items-center gap-1">
                ALEGE →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
