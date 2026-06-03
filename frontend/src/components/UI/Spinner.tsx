import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function Spinner({ size = 24, className = '', label }: SpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 className="animate-spin text-primary-500" size={size} />
      {label && <span className="text-sm text-gray-500">{label}</span>}
    </div>
  );
}

export default Spinner;
