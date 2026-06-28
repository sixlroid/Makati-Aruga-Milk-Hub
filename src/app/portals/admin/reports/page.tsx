'use client';

import { useState } from 'react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'collections' | 'processing' | 'dispensing'>('collections');
  const [reportFormat, setReportFormat] = useState<'csv' | 'pdf'>('csv');
  const [reportRange, setReportRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('month');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleReportExport = async () => {
    setReportBusy(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        type: reportType,
        format: reportFormat,
        range: reportRange
      });

      if (reportRange === 'custom') {
        if (reportFrom) params.set('from', reportFrom);
        if (reportTo) params.set('to', reportTo);
      }

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const blob = await res.blob();

      if (!res.ok) {
        const errorText = await blob.text();
        throw new Error(errorText || 'Unable to generate report');
      }

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${reportType}-${Date.now()}.${reportFormat}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setMessage(`Report exported successfully as ${reportFormat.toUpperCase()}.`);
    } catch (error) {
      console.error('Report export failed', error);
      setMessage('Unable to generate the selected report.');
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-6">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#E04A75]">Analytics</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Official Report Export</h1>
        </div>

        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">Generate collection, processing, or dispensing reports</h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose a report type, file format, and a date range below to compile system inventory records.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={reportType} onChange={(event) => setReportType(event.target.value as any)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none">
                <option value="collections">Collections</option>
                <option value="processing">Processing</option>
                <option value="dispensing">Dispensing</option>
              </select>
              <select value={reportFormat} onChange={(event) => setReportFormat(event.target.value as any)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none">
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
              <select value={reportRange} onChange={(event) => setReportRange(event.target.value as any)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none">
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>
              <button type="button" onClick={handleReportExport} disabled={reportBusy} className="rounded-xl bg-[#E04A75] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {reportBusy ? 'Preparing…' : 'Download Report'}
              </button>
            </div>
          </div>

          {reportRange === 'custom' && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                <span className="mb-1 block font-semibold">From</span>
                <input type="date" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" />
              </label>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block font-semibold">To</span>
                <input type="date" value={reportTo} onChange={(event) => setReportTo(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}