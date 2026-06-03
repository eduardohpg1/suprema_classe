import { useNavigate } from 'react-router-dom';
import { ImageOff, Tag } from 'lucide-react';
import { Product } from '../types';
import { Badge } from './UI/Badge';
import { productStatusConfig } from '../lib/statusConfig';
import { formatCurrency } from '../lib/format';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const primary =
    product.photos?.find((p) => p.isPrimary) || product.photos?.[0];
  const status = productStatusConfig[product.status];

  return (
    <button
      onClick={() => navigate(`/produtos/${product.id}`)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-gray-100">
        {primary ? (
          <img
            src={primary.url}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <ImageOff className="h-10 w-10" />
          </div>
        )}
        <div className="absolute right-3 top-3">
          <Badge variant={status.variant} dot>
            {status.label}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Tag className="h-3 w-3" />
          <span>{product.code}</span>
          <span>·</span>
          <span>{product.category?.name}</span>
        </div>
        <h3 className="line-clamp-1 text-sm font-semibold text-gray-900">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Tam. {product.size}</span>
          <span>·</span>
          <span className="capitalize">{product.color}</span>
        </div>
        <p className="mt-1 text-base font-bold text-primary-600">
          {formatCurrency(product.rentalPrice)}
          <span className="text-xs font-normal text-gray-400"> /locação</span>
        </p>
      </div>
    </button>
  );
}

export default ProductCard;
