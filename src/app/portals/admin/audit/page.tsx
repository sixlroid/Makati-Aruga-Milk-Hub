'use client';

import { useEffect, useMemo, useState } from 'react';

type AuditLogItem = {
  id: number;
  actionType: string;
  recordAffected: string;
  timestamp: string;
  staffId: number;
  staffName: string;
  staffTrackingNo: string;
};

export default function AuditLogPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilters, setAuditFilters] = useState({ action: '', record: '', staff: '', date: '' });
  const [auditPage, setAuditPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/overview', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok) {
          setAuditLogs(data.auditLogs ?? []);
        }
      } catch (error) {
        console.error('Failed to load audit logs', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, []);

  const filteredAuditLogs = useMemo(() => {
    const term = auditSearch.toLowerCase();
    return auditLogs.filter((entry) => {
      const matchesSearch = !term || [entry.actionType, entry.recordAffected, entry.staffName, entry.staffTrackingNo, entry.timestamp]
        .join(' ')
        .toLowerCase()
        .includes(term);
      const matchesAction = !auditFilters.action || entry.actionType.toLowerCase().includes(auditFilters.action.toLowerCase());
      const matchesRecord = !auditFilters.record || entry.recordAffected.toLowerCase().includes(auditFilters.record.toLowerCase());
      const matchesStaff = !auditFilters.staff || entry.staffName.toLowerCase().includes(auditFilters.staff.toLowerCase());
      const matchesDate = !auditFilters.date || entry.timestamp.toLowerCase().includes(auditFilters.date.toLowerCase());

      return matchesSearch && matchesAction && matchesRecord && matchesStaff && matchesDate;
    });
  }, [auditFilters, auditLogs, auditSearch]);

  const pageSize = 15;
  const auditTotalPages = Math.max(1, Math.ceil(filteredAuditLogs.length / pageSize));
  const safeAuditPage = Math.min(auditPage, auditTotalPages);
  const visibleAuditLogs = filteredAuditLogs.slice((safeAuditPage - 1) * pageSize, safeAuditPage * pageSize);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-6">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#E04A75]">Security & Tracking</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">System Audit Log</h1>
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <input
            value={auditSearch}
            onChange={(event) => setAuditSearch(event.target.value)}
            placeholder="Search audit log"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#E04A75] focus:ring-2 focus:ring-rose-100 md:max-w-xs"
          />
          <div className="text-xs font-medium text-slate-500">
            Immutable background activity log.
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <th className="py-2.5 pr-3">
                  <div className="mb-1.5">Action</div>
                  <input
                    value={auditFilters.action}
                    onChange={(event) => setAuditFilters((current) => ({ ...current, action: event.target.value }))}
                    placeholder="Filter"
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                  />
                </th>
                <th className="py-2.5 pr-3">
                  <div className="mb-1.5">Record</div>
                  <input
                    value={auditFilters.record}
                    onChange={(event) => setAuditFilters((current) => ({ ...current, record: event.target.value }))}
                    placeholder="Filter"
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                  />
                </th>
                <th className="py-2.5 pr-3">
                  <div className="mb-1.5">Staff</div>
                  <input
                    value={auditFilters.staff}
                    onChange={(event) => setAuditFilters((current) => ({ ...current, staff: event.target.value }))}
                    placeholder="Filter"
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                  />
                </th>
                <th className="py-2.5">
                  <div className="mb-1.5">Timestamp</div>
                  <input
                    value={auditFilters.date}
                    onChange={(event) => setAuditFilters((current) => ({ ...current, date: event.target.value }))}
                    placeholder="Filter"
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-slate-400">
                    Loading action logs...
                  </td>
                </tr>
              ) : filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-slate-400">
                    No audit entries match the current filters.
                  </td>
                </tr>
              ) : (
                visibleAuditLogs.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-2.5 pr-3">
                      <div className="font-semibold text-slate-800">{entry.actionType}</div>
                      <div className="text-xs text-slate-500">Staff ID {entry.staffId}</div>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-700">{entry.recordAffected}</td>
                    <td className="py-2.5 pr-3 text-slate-700">
                      <div className="font-semibold">{entry.staffName}</div>
                      <div className="text-xs text-slate-500">{entry.staffTrackingNo}</div>
                    </td>
                    <td className="py-2.5 text-slate-700">{entry.timestamp}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <div>
            Page {safeAuditPage} of {auditTotalPages}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAuditPage((current) => Math.max(1, current - 1))}
              disabled={safeAuditPage === 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setAuditPage((current) => Math.min(auditTotalPages, current + 1))}
              disabled={safeAuditPage === auditTotalPages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}