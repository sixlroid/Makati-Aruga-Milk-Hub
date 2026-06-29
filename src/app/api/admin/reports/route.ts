import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { prisma } from "@/lib/prisma"; 

type ReportType = 'collections' | 'processing' | 'dispensing';
type ReportFormat = 'csv' | 'pdf';

type DateRangePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

function getDateRange(preset: DateRangePreset, from?: string | null, to?: string | null) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (preset === 'today') {
    return { start, end };
  }

  if (preset === 'week') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    return { start: weekStart, end };
  }

  if (preset === 'month') {
    const monthStart = new Date(now);
    monthStart.setDate(now.getDate() - 29);
    monthStart.setHours(0, 0, 0, 0);
    return { start: monthStart, end };
  }

  if (preset === 'custom') {
    const customStart = from ? new Date(from) : null;
    const customEnd = to ? new Date(to) : null;

    if (customStart && customEnd) {
      const normalizedEnd = new Date(customEnd);
      normalizedEnd.setHours(23, 59, 59, 999);
      const normalizedStart = new Date(customStart);
      normalizedStart.setHours(0, 0, 0, 0);
      return { start: normalizedStart, end: normalizedEnd };
    }
  }

  return { start: null, end: null };
}

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = `${value ?? ''}`.replace(/"/g, '""');
  return /[",\n]/.test(stringValue) ? `"${stringValue}"` : stringValue;
}

function buildCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(row.map((value) => escapeCsv(value)).join(','));
  });
  return lines.join('\n');
}

function createPdfBuffer(title: string, headers: string[], rows: Array<Array<string | number | null | undefined>>, rangeLabel: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const usableWidth = pageWidth - margin * 2;
  const lineHeight = 20;
  const headerHeight = 26;
  const rowPadding = 6;
  const maxRowsPerPage = Math.max(1, Math.floor((pageHeight - 150) / lineHeight));
  let y = 52;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, margin, y);
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Range: ${rangeLabel}`, margin, y);
  y += 18;

  const columnWidth = usableWidth / headers.length;

  const drawRow = (values: Array<string | number | null | undefined>, startY: number) => {
    const rowLines = values.map((value) => `${value ?? ''}`);
    const wrappedValues = rowLines.map((value) => doc.splitTextToSize(value, columnWidth - 10));
    const rowHeight = Math.max(1, ...wrappedValues.map((value) => value.length)) * 10 + rowPadding;

    rowLines.forEach((_, index) => {
      const x = margin + index * columnWidth;
      const text = wrappedValues[index];
      doc.text(text, x + 4, startY + 4, { maxWidth: columnWidth - 10 });
    });

    return rowHeight;
  };

  const drawHeader = (startY: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    headers.forEach((header, index) => {
      const x = margin + index * columnWidth;
      doc.text(header, x + 4, startY, { maxWidth: columnWidth - 10 });
    });
    doc.setDrawColor(200);
    doc.line(margin, startY + 8, pageWidth - margin, startY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
  };

  let pageIndex = 1;
  drawHeader(y);
  y += headerHeight;

  rows.forEach((row, rowIndex) => {
    if (rowIndex > 0 && rowIndex % maxRowsPerPage === 0) {
      doc.addPage();
      pageIndex += 1;
      y = 52;
      drawHeader(y);
      y += headerHeight;
    }

    const rowHeight = drawRow(row, y);
    y += rowHeight + 6;
  });

  return Buffer.from(doc.output('arraybuffer'));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = (searchParams.get('type') as ReportType) || 'collections';
    const format = (searchParams.get('format') as ReportFormat) || 'csv';
    const rangePreset = (searchParams.get('range') as DateRangePreset) || 'month';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const { start, end } = getDateRange(rangePreset, from, to);

    const rangeLabel = (() => {
      if (rangePreset === 'custom') {
        return `${from || '—'} to ${to || '—'}`;
      }
      if (rangePreset === 'today') return 'Today';
      if (rangePreset === 'week') return 'Last 7 days';
      if (rangePreset === 'month') return 'Last 30 days';
      return 'All time';
    })();

    const whereDate = start && end ? { gte: start, lte: end } : undefined;

    let headers: string[] = [];
    let rows: Array<Array<string | number | null | undefined>> = [];
    let title = 'MHMB Report';
    let filename = 'report';

    if (reportType === 'collections') {
      title = 'Collection Report';
      filename = 'collection-report';
      const collections = await prisma.raw_Collections.findMany({
        where: whereDate ? { date_collected: whereDate } : undefined,
        take: 250,
        orderBy: { date_collected: 'desc' },
        select: {
          collection_id: true,
          donor: { select: { first_name: true, last_name: true, tracking_no: true } },
          program_source: true,
          raw_volume_ml: true,
          date_collected: true,
          batch_id: true,
          batch: { select: { lab_status: true } }
        }
      });

      headers = ['Collection ID', 'Donor', 'Tracking Number', 'Volume (mL)', 'Source', 'Collected At', 'Batch ID', 'Batch Status'];
      rows = collections.map((item) => [
        item.collection_id,
        `${item.donor?.first_name ?? ''} ${item.donor?.last_name ?? ''}`.trim(),
        item.donor?.tracking_no ?? '—',
        item.raw_volume_ml,
        item.program_source,
        item.date_collected?.toISOString() ?? '—',
        item.batch_id ?? '—',
        item.batch?.lab_status ?? 'Unassigned'
      ]);
    } else if (reportType === 'processing') {
      title = 'Processing Report';
      filename = 'processing-report';
      const batches = await prisma.milk_Batches.findMany({
        where: whereDate ? { Raw_Collections: { some: { date_collected: whereDate } } } : undefined,
        take: 250,
        orderBy: { batch_id: 'desc' },
        select: {
          batch_id: true,
          pooled_volume: true,
          current_volume: true,
          lab_status: true,
          expiry_date: true,
          staff: { select: { first_name: true, last_name: true } },
          _count: { select: { Raw_Collections: true } },
          Raw_Collections: { select: { raw_volume_ml: true } }
        }
      });

      headers = ['Batch ID', 'Pooled Volume', 'Current Volume', 'Lab Status', 'Expiry', 'Collections', 'Collected Volume', 'Tested By'];
      rows = batches.map((item) => [
        item.batch_id,
        item.pooled_volume,
        item.current_volume,
        item.lab_status,
        item.expiry_date?.toISOString() ?? '—',
        item._count.Raw_Collections,
        item.Raw_Collections.reduce((sum, row) => sum + (row.raw_volume_ml || 0), 0),
        item.staff ? `${item.staff.first_name} ${item.staff.last_name}`.trim() : '—'
      ]);
    } else {
      title = 'Dispensing Report';
      filename = 'dispensing-report';
      const transactions = await prisma.transactions.findMany({
        where: whereDate ? { timestamp: whereDate } : undefined,
        take: 250,
        orderBy: { timestamp: 'desc' },
        select: {
          trans_id: true,
          receiver: { select: { first_name: true, last_name: true, tracking_no: true } },
          batch_id: true,
          dispensed_vol: true,
          total_fee: true,
          timestamp: true,
          staff: { select: { first_name: true, last_name: true } }
        }
      });

      headers = ['Transaction ID', 'Receiver', 'Tracking Number', 'Batch ID', 'Dispensed Volume', 'Total Fee', 'Processed At', 'Processed By'];
      rows = transactions.map((item) => [
        item.trans_id,
        `${item.receiver?.first_name ?? ''} ${item.receiver?.last_name ?? ''}`.trim(),
        item.receiver?.tracking_no ?? '—',
        item.batch_id,
        item.dispensed_vol,
        Number(item.total_fee),
        item.timestamp?.toISOString() ?? '—',
        item.staff ? `${item.staff.first_name} ${item.staff.last_name}`.trim() : '—'
      ]);
    }

    if (format === 'csv') {
      const csv = buildCsv(headers, rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}-${Date.now()}.csv"`
        }
      });
    }

    const pdfBuffer = createPdfBuffer(title, headers, rows, rangeLabel);
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}-${Date.now()}.pdf"`
      }
    });
  } catch (error) {
    console.error('REPORT EXPORT ERROR:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}