import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Formata número em centavos OU reais como moeda BRL.
 * O backend usa Decimal (reais com 2 casas), então tratamos como reais. */
export function formatCurrency(value: number | string | undefined | null): string {
  const num = typeof value === 'string' ? Number(value) : value ?? 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return '-';
  try {
    const date = typeof value === 'string' ? parseISO(value) : value;
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
}

/** Formata uma data "sem hora" (retirada/devolução).
 * Essas datas são gravadas como meia-noite UTC; formatamos pelos componentes
 * UTC para que o dia exibido seja exatamente o dia escolhido, sem deslocamento
 * causado pelo fuso horário local. */
export function formatDateOnly(value?: string | Date | null): string {
  if (!value) return '-';
  try {
    const date = typeof value === 'string' ? parseISO(value) : value;
    if (Number.isNaN(date.getTime())) return '-';
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '-';
  try {
    const date = typeof value === 'string' ? parseISO(value) : value;
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '-';
  }
}

/** Aplica máscara de CPF: 000.000.000-00 */
export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Aplica máscara de telefone: (00) 00000-0000 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

/** Valida CPF brasileiro (dígitos verificadores). */
export function isValidCPF(value: string): boolean {
  const cpf = value.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calc = (slice: number): number => {
    let sum = 0;
    for (let i = 0; i < slice; i++) {
      sum += Number(cpf[i]) * (slice + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}
