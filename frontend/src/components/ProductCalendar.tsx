import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getProductAvailability } from '../api/availability';
import { AvailabilityDay, DayAvailability } from '../types';

interface ProductCalendarProps {
  productId: string;
  year?: number;
  month?: number;
  onDateClick?: (date: string, day?: AvailabilityDay) => void;
  /** Periodo selecionado (YYYY-MM-DD) para destacar no calendario. */
  selectedStart?: string;
  selectedEnd?: string;
}

const statusColors: Record<DayAvailability, string> = {
  available: 'bg-green-500 text-white',
  reserved: 'bg-yellow-400 text-white',
  rented:   'bg-red-500 text-white',
};

const statusLabels: Record<DayAvailability, string> = {
  available: 'Disponível',
  reserved:  'Reservado',
  rented:    'Alugado',
};

const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function ProductCalendar({
  productId,
  year,
  month,
  onDateClick,
  selectedStart,
  selectedEnd,
}: ProductCalendarProps) {
  const now = new Date();
  const [current, setCurrent] = useState(
    new Date(year ?? now.getFullYear(), (month ?? now.getMonth() + 1) - 1, 1)
  );
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const viewYear  = current.getFullYear();
  const viewMonth = current.getMonth() + 1;

  const { data: availability = [], isLoading } = useQuery(
    ['availability', productId, viewYear, viewMonth],
    () => getProductAvailability(productId, viewYear, viewMonth),
    { keepPreviousData: true }
  );

  const availabilityMap = useMemo(() => {
    const map = new Map<string, AvailabilityDay>();
    availability.forEach((d) => map.set(d.date.slice(0, 10), d));
    return map;
  }, [availability]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) });
  }, [current]);

  const leadingBlanks = getDay(startOfMonth(current));

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold capitalize text-gray-700">
          {format(current, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCurrent(new Date(viewYear, viewMonth - 2, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrent(new Date(viewYear, viewMonth, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {weekDays.map((d, i) => (
          <div key={i} className="text-[11px] font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="mx-auto h-8 w-8 animate-pulse rounded-full bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`b-${i}`} />
          ))}
          {days.map((day) => {
            const key    = format(day, 'yyyy-MM-dd');
            const info   = availabilityMap.get(key);
            const status: DayAvailability = info?.status ?? 'available';
            const today  = isToday(day);

            // Destaque do periodo selecionado (retirada -> devolucao).
            const inRange = selectedStart
              ? selectedEnd
                ? key >= selectedStart && key <= selectedEnd
                : key === selectedStart
              : false;

            return (
              <div key={key} className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onDateClick?.(key, info)}
                  onMouseEnter={(e) => {
                    const label = info?.rental
                      ? `${statusLabels[status]}: ${info.rental.customer}`
                      : statusLabels[status];
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setTooltip({ text: label, x: rect.left + rect.width / 2, y: rect.top - 8 });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  className={`
                    relative flex h-8 w-8 items-center justify-center rounded-full
                    text-xs font-medium transition-transform hover:scale-110
                    ${statusColors[status]}
                    ${inRange ? 'ring-2 ring-offset-1 ring-primary-600' : today ? 'ring-2 ring-offset-1 ring-primary-500' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tooltip portal */}
      {tooltip && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
        {(['available', 'reserved', 'rented'] as DayAvailability[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${
              s === 'available' ? 'bg-green-500' : s === 'reserved' ? 'bg-yellow-400' : 'bg-red-500'
            }`} />
            <span className="text-xs text-gray-500">{statusLabels[s]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-primary-500" />
          <span className="text-xs text-gray-500">Hoje</span>
        </div>
      </div>
    </div>
  );
}

export default ProductCalendar;
