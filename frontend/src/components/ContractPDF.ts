import jsPDF from 'jspdf';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Rental } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
}

function num(v: number) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0);
}

function d(v?: string) {
  if (!v) return '';
  try {
    const date = parseISO(v);
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getUTCFullYear()}`;
  } catch { return ''; }
}

function parseAddr(raw?: string | null) {
  if (!raw) return { street: '', number: '', bairro: '', cidade: '' };
  const p = raw.split('|').map(s => s.trim());
  const sn = (p[0] || '').split(',');
  return { street: sn[0]?.trim() || '', number: sn[1]?.trim() || '', bairro: p[1] || '', cidade: p[2] || '' };
}

function ln(doc: jsPDF, x1: number, y: number, x2: number) {
  doc.line(x1, y, x2, y);
}

// ─── gerador principal ──────────────────────────────────────────────────────

export function generateContract(
  rental: Rental,
  action: 'save' | 'print' = 'save',
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const PW  = 210;
  const ML  = 14;
  const MR  = 196;
  const CX  = PW / 2;
  let y = 0;

  const addr = parseAddr(rental.customer?.address);
  const cpf  = rental.customer?.cpf   || '';
  const rg   = rental.customer?.rg    || '';
  const tel  = rental.customer?.phone || '';
  const nome = rental.customer?.name  || '';

  // ══════════════════════════════════════════════════════════════
  // CABEÇALHO
  // ══════════════════════════════════════════════════════════════
  y = 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('Suprema Classe Noivas', CX, y, { align: 'center' });

  y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Rua Coronel Manoel Esteves, N° 69 - Centro -  (12) 99645 - 3545 - Caçapava/SP', CX, y, { align: 'center' });

  y += 4;
  doc.text('@supremaclassenoivas', CX, y, { align: 'center' });

  y += 2.5;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  ln(doc, ML, y, MR);

  // ══════════════════════════════════════════════════════════════
  // TÍTULO
  // ══════════════════════════════════════════════════════════════
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('CONTRATO DE LOCAÇÃO', CX, y, { align: 'center' });

  // ══════════════════════════════════════════════════════════════
  // DADOS DO CLIENTE
  // ══════════════════════════════════════════════════════════════
  doc.setFontSize(9.5);
  doc.setLineWidth(0.2);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.text('Nome do Cliente:', ML, y);
  const nomeX = ML + doc.getTextWidth('Nome do Cliente:') + 1;
  doc.text(nome, nomeX, y);
  ln(doc, nomeX, y + 1, MR);

  y += 6.5;
  const endLabel = 'Endereço:';
  doc.text(endLabel, ML, y);
  const endX = ML + doc.getTextWidth(endLabel) + 1;
  doc.text(addr.street, endX, y);
  ln(doc, endX, y + 1, MR - 22);
  doc.text('N°', MR - 20, y);
  const nrX = MR - 20 + doc.getTextWidth('N°') + 1;
  doc.text(addr.number, nrX, y);
  ln(doc, nrX, y + 1, MR);

  y += 6.5;
  doc.text('Bairro:', ML, y);
  const bairroX = ML + doc.getTextWidth('Bairro:') + 1;
  doc.text(addr.bairro, bairroX, y);
  ln(doc, bairroX, y + 1, ML + 47);
  doc.text('Cidade:', ML + 49, y);
  const cidX = ML + 49 + doc.getTextWidth('Cidade:') + 1;
  doc.text(addr.cidade, cidX, y);
  ln(doc, cidX, y + 1, ML + 112);
  doc.text('Tel:', ML + 114, y);
  const telX = ML + 114 + doc.getTextWidth('Tel:') + 1;
  doc.text(tel, telX, y);
  ln(doc, telX, y + 1, MR);

  y += 6.5;
  doc.text('RG:', ML, y);
  const rgX = ML + doc.getTextWidth('RG:') + 1;
  doc.text(rg, rgX, y);
  ln(doc, rgX, y + 1, ML + 82);
  doc.text('CPF:', ML + 84, y);
  const cpfX = ML + 84 + doc.getTextWidth('CPF:') + 1;
  doc.text(cpf, cpfX, y);
  ln(doc, cpfX, y + 1, MR);

  // ══════════════════════════════════════════════════════════════
  // ITENS DA LOCAÇÃO
  // ══════════════════════════════════════════════════════════════
  const items = rental.items ?? [];
  const hasMultiple = items.length > 1;

  y += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.text('Mercadoria:', ML, y);
  doc.setFont('helvetica', 'normal');

  if (!hasMultiple) {
    // Apenas 1 item — exibe na mesma linha como antes
    const item = items[0];
    const product = item?.product;
    const merc = product
      ? `${product.name} — Tam. ${product.size} — Cor: ${product.color} — Cód: ${product.code}`
      : '';
    const mercX = ML + doc.getTextWidth('Mercadoria:') + 1;
    doc.text(merc, mercX, y);
    ln(doc, mercX, y + 1, MR);
    y += 6;
    ln(doc, ML, y + 1, MR);
    y += 6;
    ln(doc, ML, y + 1, ML + 68);
  } else {
    // Múltiplos itens — lista cada um com seu preço
    ln(doc, ML + doc.getTextWidth('Mercadoria:') + 0.5, y + 1, MR);
    y += 6;
    doc.setFontSize(8.5);
    items.forEach((item) => {
      const product = item.product;
      const lineTotal = Number(item.unitPrice) * item.quantity;
      const qtyLabel = item.quantity > 1 ? ` (${item.quantity}×)` : '';
      const desc = `${product.name}${qtyLabel} — Tam. ${product.size} — Cor: ${product.color} — Cód: ${product.code}`;
      doc.text(`• ${desc}`, ML + 2, y);
      const priceStr = brl(lineTotal);
      doc.text(priceStr, MR - doc.getTextWidth(priceStr), y);
      ln(doc, ML, y + 1, MR);
      y += 5.5;
    });
    doc.setFontSize(9.5);
    ln(doc, ML, y + 1, ML + 68);
  }

  // ══════════════════════════════════════════════════════════════
  // VALORES
  // ══════════════════════════════════════════════════════════════
  y += 7;
  doc.text('Total R$', ML, y);
  const totX = ML + doc.getTextWidth('Total R$') + 1;
  doc.text(num(rental.totalValue), totX, y);
  ln(doc, totX, y + 1, ML + 68);

  y += 5.5;
  doc.text('Sinal R$', ML, y);
  const sinX = ML + doc.getTextWidth('Sinal R$') + 1;
  doc.text(num(rental.depositValue), sinX, y);
  ln(doc, sinX, y + 1, ML + 68);

  y += 5.5;
  doc.text('Restante R$', ML, y);
  const restX = ML + doc.getTextWidth('Restante R$') + 1;
  doc.text(num(rental.remainingValue), restX, y);
  ln(doc, restX, y + 1, ML + 68);

  // Retirada / APOS AS 14 HORAS / Entrega
  y += 6.5;
  doc.text('Retirada', ML, y);
  const retX = ML + doc.getTextWidth('Retirada') + 1;
  doc.text(d(rental.pickupDate), retX, y);
  ln(doc, retX, y + 1, ML + 44);

  doc.setFont('helvetica', 'bold');
  doc.text('APOS AS 14 HORAS', ML + 46, y);
  doc.setFont('helvetica', 'normal');
  ln(doc, ML + 46 + doc.getTextWidth('APOS AS 14 HORAS') + 1, y + 1, ML + 112);

  doc.text('Entrega', ML + 114, y);
  const entX = ML + 114 + doc.getTextWidth('Entrega') + 1;
  doc.text(d(rental.returnDate), entX, y);
  ln(doc, entX, y + 1, MR);

  // ══════════════════════════════════════════════════════════════
  // CAIXA ATENÇÃO + TÍTULO CONTRATO
  // ══════════════════════════════════════════════════════════════
  y += 8;
  doc.setLineWidth(0.5);

  const atW = 24;
  doc.rect(ML, y - 5, atW, 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ATENÇÃO', ML + atW / 2, y - 0.5, { align: 'center' });

  doc.rect(ML + atW + 0.5, y - 5, MR - ML - atW - 0.5, 6.5);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8.5);
  doc.text(
    'TERMOS DO CONTRATO DE RESPONSABILIDADE E LOCAÇÃO',
    ML + atW + 1 + (MR - ML - atW - 1) / 2,
    y - 0.5,
    { align: 'center' }
  );

  doc.setLineWidth(0.2);

  // ══════════════════════════════════════════════════════════════
  // CLÁUSULAS
  // ══════════════════════════════════════════════════════════════
  y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const usable = MR - ML;

  const clausulas = [
    'Comprometo-me a devolver a mercadoria locada em perfeito estado como recebi.',
    'A Locadora não se responsabilizará pela mercadoria que não for retirada dentro do horário de funcionamento, que\nserá de segunda à sexta das 09:00 às 18:00 horas e aos sábados das 09:00 às 13:00 horas.',
    'Caso a mercadoria locada apresente danos na entrega, o cliente deverá ressarcir o valor de\n100% (cem por cento) que será descrito na nota promissória.',
    'Em caso de não cumprimento do prazo de pagamento, o valor poderá sofrer\nreajuste de até 25%.',
    'Em caso de desistência, não devolvemos o valor pago em nenhuma hipótese.',
    'Caso a mercadoria seja devolvida com excesso de sujeira será cobrada uma taxa de 10% a 30%.',
    'Para cada dia de atraso na devolução das mercadorias, será cobrada a taxa de R$ 30,00 ao dia e\ncaso o cliente não entregue a mercadoria dentro de 10 dias será considerado extravio ou roubo.',
    'Não será permitida a troca da mercadoria locada após o prazo de 7 dias da data de locação.',
    'O não cumprimento das condições descritas acima, sujeitara desta forma a cobrança judicial\nque se fizerem necessárias. Para qualquer controvérsia oriunda do presente TERMO DE\nRESPONSABILIDADE; AS PARTES ELEGEM O FORO DA COMARCA DE CAÇAPAVA - S.P.',
  ];

  const lineH = 4.2;
  clausulas.forEach((c) => {
    const lines = doc.splitTextToSize(c, usable) as string[];
    const blockH = lines.length * lineH;
    if (y + blockH > 262) { doc.addPage(); y = 15; }
    doc.text(lines, CX, y, { align: 'center' });
    y += blockH + 1;
  });

  // ══════════════════════════════════════════════════════════════
  // RODAPÉ CONTRATO
  // ══════════════════════════════════════════════════════════════
  y += 3;
  if (y > 258) { doc.addPage(); y = 15; }

  doc.setFontSize(9);
  const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  doc.text(`CAÇAPAVA,`, ML, y);
  const [dia, , mes, , ano] = hoje.split(' ');
  doc.text(dia,  ML + doc.getTextWidth('CAÇAPAVA,') + 3, y);
  ln(doc, ML + doc.getTextWidth('CAÇAPAVA,') + 2, y + 1, ML + doc.getTextWidth('CAÇAPAVA,') + 14);
  doc.text('DE', ML + doc.getTextWidth('CAÇAPAVA,') + 16, y);
  doc.text(mes, ML + doc.getTextWidth('CAÇAPAVA,') + 22, y);
  ln(doc, ML + doc.getTextWidth('CAÇAPAVA,') + 21, y + 1, ML + doc.getTextWidth('CAÇAPAVA,') + 55);
  doc.text('DE', ML + doc.getTextWidth('CAÇAPAVA,') + 57, y);
  doc.text(ano, ML + doc.getTextWidth('CAÇAPAVA,') + 63, y);
  ln(doc, ML + doc.getTextWidth('CAÇAPAVA,') + 62, y + 1, ML + doc.getTextWidth('CAÇAPAVA,') + 76);
  doc.text('.', ML + doc.getTextWidth('CAÇAPAVA,') + 77, y);

  const assX = MR - 70;
  doc.text('ASS RETIRADA:', assX, y);
  ln(doc, assX + doc.getTextWidth('ASS RETIRADA:') + 1, y + 1, MR);

  y += 7;
  doc.text('Avalista(s)', ML, y);
  ln(doc, ML + doc.getTextWidth('Avalista(s)') + 1, y + 1, ML + 78);

  y += 6;
  doc.text('CPF/CNPJ', ML, y);
  ln(doc, ML + doc.getTextWidth('CPF/CNPJ') + 1, y + 1, ML + 78);
  doc.text('CPF/CNPJ', ML + 80, y);
  ln(doc, ML + 80 + doc.getTextWidth('CPF/CNPJ') + 1, y + 1, MR);

  // ══════════════════════════════════════════════════════════════
  // LINHA TRACEJADA
  // ══════════════════════════════════════════════════════════════
  y += 9;
  if (y > 270) { doc.addPage(); y = 15; }
  doc.setLineDash([1.5, 1.5], 0);
  ln(doc, ML, y, MR);
  doc.setLineDash([], 0);

  // ══════════════════════════════════════════════════════════════
  // NOTA PROMISSÓRIA
  // ══════════════════════════════════════════════════════════════
  y += 5;
  doc.setLineWidth(0.3);

  const colX  = ML;
  const colH  = 48;
  const col1W = 10;
  const col2W = 8;

  doc.rect(colX,           y,      col1W, colH);
  doc.rect(colX + col1W,   y,      col2W, colH);
  doc.rect(colX + col1W + col2W, y, col2W, colH);

  doc.setFontSize(7);
  doc.text('Avalista(s)', colX + col1W / 2, y + colH - 1, { align: 'center', angle: 90 });
  doc.text('CPF/CNPJ',   colX + col1W + col2W / 2, y + colH - 1, { align: 'center', angle: 90 });
  doc.text('CPF/CNPJ',   colX + col1W + col2W + col2W / 2, y + colH - 1, { align: 'center', angle: 90 });

  const npX = colX + col1W + col2W + col2W + 2;
  const npW = MR - npX;
  const npY = y;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA PROMISSÓRIA', npX, npY + 5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const vcX = npX + npW - 70;
  doc.text('VENCIMENTO', vcX, npY + 5);
  ln(doc, vcX + doc.getTextWidth('VENCIMENTO') + 1, npY + 6, vcX + doc.getTextWidth('VENCIMENTO') + 18);
  doc.text('DE', vcX + doc.getTextWidth('VENCIMENTO') + 20, npY + 5);
  ln(doc, vcX + doc.getTextWidth('VENCIMENTO') + 24, npY + 6, MR);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('N°', npX, npY + 13);
  doc.setLineWidth(0.3);
  doc.rect(npX + 5, npY + 8.5, 32, 6);

  doc.text('R$', npX + 55, npY + 13);
  doc.rect(npX + 61, npY + 8.5, npW - 61, 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(brl(rental.remainingValue), npX + 63, npY + 13);

  doc.setFontSize(8.5);
  const ao = `Ao(s)   ${nome}`;
  doc.text(ao, npX, npY + 21);
  ln(doc, npX + doc.getTextWidth(ao) + 1, npY + 22, npX + npW);

  const l2y = npY + 28;
  ln(doc, npX, l2y + 1, npX + 16);
  doc.text('pagar', npX + 18, l2y);
  ln(doc, npX + 18 + doc.getTextWidth('pagar') + 1, l2y + 1, npX + 45);
  doc.setFont('helvetica', 'bold');
  doc.text('por esta única via de NOTA PROMISSÓRIA', npX + 47, l2y);
  doc.setFont('helvetica', 'normal');

  const l3y = npY + 34;
  doc.text('a', npX, l3y);
  ln(doc, npX + 3, l3y + 1, npX + 68);
  doc.text('CPF/CNPJ', npX + 70, l3y);
  ln(doc, npX + 70 + doc.getTextWidth('CPF/CNPJ') + 1, l3y + 1, npX + npW);

  const l4y = npY + 39;
  doc.text('Ou a sua ordem,', npX, l4y);
  doc.text('Em moeda corrente', npX + npW - doc.getTextWidth('Em moeda corrente desse país'), l4y);
  const l5y = npY + 43;
  doc.text('a quantia', npX, l5y);
  doc.text('desse país', npX + npW - doc.getTextWidth('desse país'), l5y);

  const l6y = npY + colH + 2;
  if (l6y > 280) { doc.addPage(); y = 15; }

  doc.text('Pagável na praça de', npX, l6y);
  ln(doc, npX + doc.getTextWidth('Pagável na praça de') + 1, l6y + 1, npX + 68);

  const rightCol = npX + 70;
  doc.text('EMITENTE', npX, l6y + 6);
  ln(doc, npX + doc.getTextWidth('EMITENTE') + 1, l6y + 7, npX + 68);
  doc.text(`CAÇAPAVA, ${d(rental.returnDate)}`, rightCol, l6y + 6);

  doc.text('CPF/CNPJ', npX, l6y + 12);
  doc.text(cpf, npX + doc.getTextWidth('CPF/CNPJ') + 1, l6y + 12);
  ln(doc, npX + doc.getTextWidth('CPF/CNPJ') + 1, l6y + 13, npX + 68);

  doc.text('ENDEREÇO', npX, l6y + 18);
  ln(doc, npX + doc.getTextWidth('ENDEREÇO') + 1, l6y + 19, npX + 68);
  ln(doc, rightCol, l6y + 19, npX + npW);
  doc.text('Assinatura', rightCol + (npX + npW - rightCol) / 2 - doc.getTextWidth('Assinatura') / 2, l6y + 23);

  // ── saída ───────────────────────────────────────────────────
  const slug = (nome || 'cliente')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  if (action === 'print') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const win = window.open(blobUrl, '_blank');
    if (!win) doc.save(`contrato-${slug}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    return;
  }

  doc.save(`contrato-${slug}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export default { generateContract };
