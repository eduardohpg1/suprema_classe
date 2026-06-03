import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Card({
  children,
  padded = true,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-100 bg-white shadow-sm ${
        padded ? 'p-5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
