import { ReactNode } from 'react';

type BadgeVariant = 'green' | 'yellow' | 'red' | 'gray' | 'pink' | 'blue';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  dot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-700',
  pink: 'bg-primary-100 text-primary-700',
  blue: 'bg-blue-100 text-blue-800',
};

const dotColors: Record<BadgeVariant, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
  pink: 'bg-primary-500',
  blue: 'bg-blue-500',
};

export function Badge({ variant = 'gray', children, dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}

export default Badge;
