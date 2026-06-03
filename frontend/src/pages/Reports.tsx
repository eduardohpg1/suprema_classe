import { useState } from 'react';
import { useQuery } from 'react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { FileDown, FileSpreadsheet, Trophy, CalendarRange } from 'lucide-react';
import {
  getRentalsByPeriod,
  getTopProducts,
  getMonthlyRevenue,
} from '../api/reports';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Table, Column } from '../components/UI/Table';
import { Spinner } from '../components/UI/Spinner';
import { Badge } from '../components/UI/Badge';
import {
  MonthlyRevenueRow,
  RentalByPeriodRow,
  TopProductRow,
} from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import { rentalStatusConfig } from '../lib/statusConfig';

/** Exporta um array de objetos para CSV (compatível com Excel). */
function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const content = [headers, ...rows]
    .map((r) => r.map(escape).join(';'))
    .join('\n');
  const blob = new Blob(['﻿' + content], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportPDF(
  title: string,
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Suprema Classe', 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text(title, 14, 25);
  doc.setTextColor(0);
  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: rows.map((r) => r.map(String)),
    headStyles: { fillColor: [219, 39, 119] },
    styles: { fontSize: 9 },
  });
  doc.save(filename);
}

export function Reports() {
  const today = new Date();
  const firstDay = format(
    new Date(today.getFullYear(), today.getMonth(), 1),
    'yyyy-MM-dd'
  );
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(format(today, 'yyyy-MM-dd'));

  const { data: periodRentals = [], isLoading: loadingPeriod } = useQuery(
    ['report-rentals', from, to],
    () => getRentalsByPeriod(from, to),
    { enabled: !!from && !!to }
  );

  const { data: topProducts = [], isLoading: loadingTop } = useQuery(
    'report-top-products',
    () => getTopProducts(10)
  );

  const { data: monthlyRevenue = [], isLoading: loadingMonthly } = useQuery(
    'report-monthly-revenue',
    () => getMonthlyRevenue()
  );

  const periodColumns: Column<RentalByPeriodRow>[] = [
    { key: 'product', header: 'Produto', render: (r) => r.product },
    { key: 'customer', header: 'Cliente', render: (r) => r.customer },
    {
      key: 'pickup',
      header: 'Retirada',
      render: (r) => formatDate(r.pickupDate),
    },
    {
      key: 'return',
      header: 'Devolução',
      render: (r) => formatDate(r.returnDate),
    },
    {
      key: 'value',
      header: 'Valor',
      align: 'right',
      render: (r) => formatCurrency(r.totalValue),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const s = rentalStatusConfig[r.status];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
  ];

  const topColumns: Column<TopProductRow>[] = [
    {
      key: 'rank',
      header: '#',
      render: (r) =>
        topProducts.findIndex((t) => t.productId === r.productId) + 1,
    },
    {
      key: 'name',
      header: 'Produto',
      render: (r) => (
        <span className="font-medium">
          {r.name} <span className="text-gray-400">({r.code})</span>
        </span>
      ),
    },
    {
      key: 'count',
      header: 'Locações',
      align: 'center',
      render: (r) => r.rentalsCount,
    },
    {
      key: 'revenue',
      header: 'Receita',
      align: 'right',
      render: (r) => formatCurrency(r.totalRevenue),
    },
  ];

  const monthlyColumns: Column<MonthlyRevenueRow>[] = [
    { key: 'month', header: 'Mês', render: (r) => r.label },
    {
      key: 'count',
      header: 'Locações',
      align: 'center',
      render: (r) => r.rentalsCount,
    },
    {
      key: 'revenue',
      header: 'Faturamento',
      align: 'right',
      render: (r) => formatCurrency(r.revenue),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Locações por período */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Locações por Período
            </h2>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              label="De"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input
              label="Até"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportPDF(
                  `Locações de ${formatDate(from)} a ${formatDate(to)}`,
                  'relatorio-locacoes.pdf',
                  ['Produto', 'Cliente', 'Retirada', 'Devolução', 'Valor', 'Status'],
                  periodRentals.map((r) => [
                    r.product,
                    r.customer,
                    formatDate(r.pickupDate),
                    formatDate(r.returnDate),
                    formatCurrency(r.totalValue),
                    rentalStatusConfig[r.status].label,
                  ])
                )
              }
            >
              <FileDown className="h-4 w-4" /> PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportCSV(
                  'relatorio-locacoes.csv',
                  ['Produto', 'Cliente', 'Retirada', 'Devolução', 'Valor', 'Status'],
                  periodRentals.map((r) => [
                    r.product,
                    r.customer,
                    formatDate(r.pickupDate),
                    formatDate(r.returnDate),
                    r.totalValue,
                    rentalStatusConfig[r.status].label,
                  ])
                )
              }
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          </div>
        </div>
        {loadingPeriod ? (
          <Spinner className="py-10" />
        ) : (
          <Table
            columns={periodColumns}
            data={periodRentals}
            rowKey={(r) => r.id}
            empty="Nenhuma locação no período."
          />
        )}
      </Card>

      {/* Produtos mais alugados */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Produtos mais alugados
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportPDF(
                  'Ranking de produtos',
                  'ranking-produtos.pdf',
                  ['#', 'Produto', 'Código', 'Locações', 'Receita'],
                  topProducts.map((r, i) => [
                    i + 1,
                    r.name,
                    r.code,
                    r.rentalsCount,
                    formatCurrency(r.totalRevenue),
                  ])
                )
              }
            >
              <FileDown className="h-4 w-4" /> PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportCSV(
                  'ranking-produtos.csv',
                  ['#', 'Produto', 'Código', 'Locações', 'Receita'],
                  topProducts.map((r, i) => [
                    i + 1,
                    r.name,
                    r.code,
                    r.rentalsCount,
                    r.totalRevenue,
                  ])
                )
              }
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          </div>
        </div>
        {loadingTop ? (
          <Spinner className="py-10" />
        ) : (
          <Table
            columns={topColumns}
            data={topProducts}
            rowKey={(r) => r.productId}
            empty="Sem dados de locação ainda."
          />
        )}
      </Card>

      {/* Faturamento mensal */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Faturamento Mensal
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportPDF(
                  'Faturamento mensal',
                  'faturamento-mensal.pdf',
                  ['Mês', 'Locações', 'Faturamento'],
                  monthlyRevenue.map((r) => [
                    r.label,
                    r.rentalsCount,
                    formatCurrency(r.revenue),
                  ])
                )
              }
            >
              <FileDown className="h-4 w-4" /> PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportCSV(
                  'faturamento-mensal.csv',
                  ['Mês', 'Locações', 'Faturamento'],
                  monthlyRevenue.map((r) => [
                    r.label,
                    r.rentalsCount,
                    r.revenue,
                  ])
                )
              }
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          </div>
        </div>
        {loadingMonthly ? (
          <Spinner className="py-10" />
        ) : (
          <Table
            columns={monthlyColumns}
            data={monthlyRevenue}
            rowKey={(r) => r.month}
            empty="Sem faturamento registrado."
          />
        )}
      </Card>
    </div>
  );
}

export default Reports;
