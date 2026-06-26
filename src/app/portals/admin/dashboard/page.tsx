'use client';

import { useEffect, useMemo, useState } from 'react';

type Overview = {
  pending_raw_ml: number;
  pasteurized_ml: number;
  discarded_ml: number;
  active_batch_count: number;
  total_users: number;
  active_accounts: number;
  inactive_accounts: number;
};

type AccountItem = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  type: 'member' | 'staff';
  trackingNo: string | null;
};

type DonationHistoryItem = {
  id: number;
  donorName: string;
  donorTrackingNo: string;
  volumeMl: number;
  collectedAt: string;
  programSource: string;
  batchId: number | null;
  batchStatus: string;
};

type ReleaseHistoryItem = {
  id: number;
  receiverName: string;
  receiverTrackingNo: string;
  volumeMl: number;
  totalFee: number;
  processedAt: string;
  batchId: number | null;
  batchStatus: string;
  processedBy: string;
};

type AuditLogItem = {
  id: number;
  actionType: string;
  recordAffected: string;
  timestamp: string;
  staffId: number;
  staffName: string;
  staffTrackingNo: string;
};

export default function AdminDashboard() {
  const [overview, setOverview] = useState<Overview>({
    pending_raw_ml: 0,
    pasteurized_ml: 0,
    discarded_ml: 0,
    active_batch_count: 0,
    total_users: 0,
    active_accounts: 0,
    inactive_accounts: 0
  });
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [donationHistory, setDonationHistory] = useState<DonationHistoryItem[]>([]);
  const [releaseHistory, setReleaseHistory] = useState<ReleaseHistoryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<'accounts' | 'donations' | 'releases' | 'audit'>('accounts');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    account: '',
    role: 'all',
    status: 'all',
    tracking: '',
    action: 'all'
  });
  const [donationSearch, setDonationSearch] = useState('');
  const [donationFilters, setDonationFilters] = useState({ donor: '', source: '', batch: '', date: '' });
  const [releaseSearch, setReleaseSearch] = useState('');
  const [releaseFilters, setReleaseFilters] = useState({ receiver: '', batch: '', staff: '', amount: '' });
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilters, setAuditFilters] = useState({ action: '', record: '', staff: '', date: '' });
  const [reportType, setReportType] = useState<'collections' | 'processing' | 'dispensing'>('collections');
  const [reportFormat, setReportFormat] = useState<'csv' | 'pdf'>('csv');
  const [reportRange, setReportRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('month');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [accountPage, setAccountPage] = useState(1);
  const [donationPage, setDonationPage] = useState(1);
  const [releasePage, setReleasePage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      const data = await res.json();

      if (res.ok) {
        setOverview(data.overview);
        setAccounts(data.accounts);
        setDonationHistory(data.donationHistory ?? []);
        setReleaseHistory(data.releaseHistory ?? []);
        setAuditLogs(data.auditLogs ?? []);
      }
    } catch (error) {
      console.error('Failed to load admin dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAccounts = useMemo(() => {
    const term = search.toLowerCase();

    return accounts.filter((account) => {
      const matchesSearch = !term || [account.name, account.email, account.role, account.trackingNo ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term);

      const matchesAccount = !filters.account || account.name.toLowerCase().includes(filters.account.toLowerCase());
      const matchesRole = filters.role === 'all' || account.role.toLowerCase() === filters.role.toLowerCase();
      const matchesStatus = filters.status === 'all' || account.status.toLowerCase() === filters.status.toLowerCase();
      const matchesTracking = !filters.tracking || (account.trackingNo ?? '').toLowerCase().includes(filters.tracking.toLowerCase());
      const matchesAction = filters.action === 'all' || (filters.action === 'available' ? account.status === 'Active' : true);

      return matchesSearch && matchesAccount && matchesRole && matchesStatus && matchesTracking && matchesAction;
    });
  }, [accounts, filters, search]);

  const filteredDonations = useMemo(() => {
    const term = donationSearch.toLowerCase();

    return donationHistory.filter((entry) => {
      const matchesSearch = !term || [entry.donorName, entry.donorTrackingNo, entry.programSource, entry.batchStatus, entry.collectedAt]
        .join(' ')
        .toLowerCase()
        .includes(term);
      const matchesDonor = !donationFilters.donor || entry.donorName.toLowerCase().includes(donationFilters.donor.toLowerCase());
      const matchesSource = !donationFilters.source || entry.programSource.toLowerCase().includes(donationFilters.source.toLowerCase());
      const matchesBatch = !donationFilters.batch || entry.batchId?.toString().includes(donationFilters.batch);
      const matchesDate = !donationFilters.date || entry.collectedAt.toLowerCase().includes(donationFilters.date.toLowerCase());

      return matchesSearch && matchesDonor && matchesSource && matchesBatch && matchesDate;
    });
  }, [donationFilters, donationHistory, donationSearch]);

  const filteredReleases = useMemo(() => {
    const term = releaseSearch.toLowerCase();

    return releaseHistory.filter((entry) => {
      const matchesSearch = !term || [entry.receiverName, entry.receiverTrackingNo, entry.processedBy, entry.batchStatus, entry.processedAt]
        .join(' ')
        .toLowerCase()
        .includes(term);
      const matchesReceiver = !releaseFilters.receiver || entry.receiverName.toLowerCase().includes(releaseFilters.receiver.toLowerCase());
      const matchesBatch = !releaseFilters.batch || entry.batchId?.toString().includes(releaseFilters.batch);
      const matchesStaff = !releaseFilters.staff || entry.processedBy.toLowerCase().includes(releaseFilters.staff.toLowerCase());
      const matchesAmount = !releaseFilters.amount || entry.volumeMl.toString().includes(releaseFilters.amount);

      return matchesSearch && matchesReceiver && matchesBatch && matchesStaff && matchesAmount;
    });
  }, [releaseFilters, releaseHistory, releaseSearch]);

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
  const accountTotalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const donationTotalPages = Math.max(1, Math.ceil(filteredDonations.length / pageSize));
  const releaseTotalPages = Math.max(1, Math.ceil(filteredReleases.length / pageSize));
  const auditTotalPages = Math.max(1, Math.ceil(filteredAuditLogs.length / pageSize));
  const safeAccountPage = Math.min(accountPage, accountTotalPages);
  const safeDonationPage = Math.min(donationPage, donationTotalPages);
  const safeReleasePage = Math.min(releasePage, releaseTotalPages);
  const safeAuditPage = Math.min(auditPage, auditTotalPages);
  const visibleAccounts = filteredAccounts.slice((safeAccountPage - 1) * pageSize, safeAccountPage * pageSize);
  const visibleDonations = filteredDonations.slice((safeDonationPage - 1) * pageSize, safeDonationPage * pageSize);
  const visibleReleases = filteredReleases.slice((safeReleasePage - 1) * pageSize, safeReleasePage * pageSize);
  const visibleAuditLogs = filteredAuditLogs.slice((safeAuditPage - 1) * pageSize, safeAuditPage * pageSize);

  const handleAccountAction = async (userId: number, action: 'deactivate' | 'delete') => {
    setBusyId(userId);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message ?? 'Account action completed.');
        await fetchData();
      } else {
        setMessage(data.error ?? 'Unable to complete account action.');
      }
    } catch (error) {
      console.error('Account action failed', error);
      setMessage('Unable to complete account action.');
    } finally {
      setBusyId(null);
    }
  };

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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#E04A75]">Admin Operations Center</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Facility Command Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Monitor inventory readiness, track user access, and manage account status from one place.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <span className="font-semibold">{overview.active_accounts}</span> active accounts • <span className="font-semibold">{overview.inactive_accounts}</span> inactive
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Raw Milk Pending</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{overview.pending_raw_ml.toLocaleString()} mL</p>
            <p className="mt-1 text-sm text-slate-500">Volume waiting to be pooled and processed.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Pasteurized Milk Available</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{overview.pasteurized_ml.toLocaleString()} mL</p>
            <p className="mt-1 text-sm text-slate-500">Ready for qualified dispensing and release.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Discarded / Contaminated</p>
            <p className="mt-3 text-3xl font-black text-rose-600">{overview.discarded_ml.toLocaleString()} mL</p>
            <p className="mt-1 text-sm text-slate-500">Volume flagged for discard or contamination review.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Active Batches</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{overview.active_batch_count}</p>
            <p className="mt-1 text-sm text-slate-500">Verified batches currently available in the system.</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-1">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#E04A75]">Centralized Operations View</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Browse accounts, donations, and releases</h2>
              </div>
              <div className="flex flex-wrap gap-2 rounded-full border border-slate-200 bg-slate-50 p-1.5">
                {[
                  { key: 'accounts', label: 'User Directory' },
                  { key: 'donations', label: 'Donations' },
                  { key: 'releases', label: 'Released Milk' },
                  { key: 'audit', label: 'Audit Log' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as 'accounts' | 'donations' | 'releases')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab.key ? 'bg-[#E04A75] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {message ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#E04A75]">Official Report Export</p>
                  <h3 className="mt-1 text-lg font-black text-slate-900">Generate collection, processing, or dispensing reports</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select value={reportType} onChange={(event) => setReportType(event.target.value as 'collections' | 'processing' | 'dispensing')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <option value="collections">Collections</option>
                    <option value="processing">Processing</option>
                    <option value="dispensing">Dispensing</option>
                  </select>
                  <select value={reportFormat} onChange={(event) => setReportFormat(event.target.value as 'csv' | 'pdf')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                  </select>
                  <select value={reportRange} onChange={(event) => setReportRange(event.target.value as 'all' | 'today' | 'week' | 'month' | 'custom')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
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

              {reportRange === 'custom' ? (
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
              ) : null}

              <p className="mt-3 text-sm text-slate-500">
                Choose a report type, file format, and a date range such as today, the last 7 days, the last 30 days, or a custom start/end date.
              </p>
            </div>

            {activeTab === 'accounts' ? (
              <>
                <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search accounts"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#E04A75] focus:ring-2 focus:ring-rose-100 md:max-w-xs"
                  />
                  <div className="text-xs font-medium text-slate-500">
                    Showing {pageSize} records per page.
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <th className="py-2.5 pr-3">
                          <div className="mb-1.5">Account</div>
                          <input
                            value={filters.account}
                            onChange={(event) => setFilters((current) => ({ ...current, account: event.target.value }))}
                            placeholder="Filter"
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                          />
                        </th>
                        <th className="py-2.5 pr-3">
                          <div className="mb-1.5">Role</div>
                          <select
                            value={filters.role}
                            onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                          >
                            <option value="all">All</option>
                            <option value="Administrator">Administrator</option>
                            <option value="Nurse">Nurse</option>
                            <option value="Lab Staff">Lab Staff</option>
                            <option value="Member">Member</option>
                          </select>
                        </th>
                        <th className="py-2.5 pr-3">
                          <div className="mb-1.5">Status</div>
                          <select
                            value={filters.status}
                            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                          >
                            <option value="all">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </th>
                        <th className="py-2.5 pr-3">
                          <div className="mb-1.5">Tracking</div>
                          <input
                            value={filters.tracking}
                            onChange={(event) => setFilters((current) => ({ ...current, tracking: event.target.value }))}
                            placeholder="Filter"
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                          />
                        </th>
                        <th className="py-2.5">
                          <div className="mb-1.5">Actions</div>
                          <select
                            value={filters.action}
                            onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                          >
                            <option value="all">All</option>
                            <option value="available">Available</option>
                          </select>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-sm text-slate-400">
                            Loading account directory...
                          </td>
                        </tr>
                      ) : filteredAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-sm text-slate-400">
                            No accounts match the current search.
                          </td>
                        </tr>
                      ) : (
                        visibleAccounts.map((account) => (
                          <tr key={account.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-2.5 pr-3">
                              <div className="font-semibold text-slate-800">{account.name}</div>
                              <div className="text-xs text-slate-500">{account.email || 'N/A'}</div>
                            </td>
                            <td className="py-2.5 pr-3 text-slate-600">{account.role}</td>
                            <td className="py-2.5 pr-3">
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${account.status === 'Inactive' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {account.status}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 text-slate-600">{account.trackingNo ?? '—'}</td>
                            <td className="py-2.5">
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleAccountAction(account.id, 'deactivate')}
                                  disabled={busyId === account.id}
                                  className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                                >
                                  {busyId === account.id ? 'Working…' : 'Deactivate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAccountAction(account.id, 'delete')}
                                  disabled={busyId === account.id}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                >
                                  {busyId === account.id ? 'Working…' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                  <div>
                    Page {safeAccountPage} of {accountTotalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAccountPage((current) => Math.max(1, current - 1))}
                      disabled={safeAccountPage === 1}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountPage((current) => Math.min(accountTotalPages, current + 1))}
                      disabled={safeAccountPage === accountTotalPages}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === 'donations' ? (
              <>
                <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <input
                    value={donationSearch}
                    onChange={(event) => setDonationSearch(event.target.value)}
                    placeholder="Search donor history"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#E04A75] focus:ring-2 focus:ring-rose-100 md:max-w-xs"
                  />
                  <div className="text-xs font-medium text-slate-500">
                    Showing {pageSize} records per page.
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <th className="py-2.5 pr-3">
                          <div className="mb-1.5">Donor</div>
                          <input
                            value={donationFilters.donor}
                            onChange={(event) => setDonationFilters((current) => ({ ...current, donor: event.target.value }))}
                            placeholder="Filter"
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                          />
                        </th>
                        <th className="py-2.5 pr-3">
                          <div className="mb-1.5">Volume</div>
                          <div className="text-[10px] font-normal normal-case tracking-normal text-slate-400">mL</div>
                        </th>
                        <th className="py-2.5 pr-3">
                          <div className="mb-1.5">Source</div>
                          <input
                            value={donationFilters.source}
                            onChange={(event) => setDonationFilters((current) => ({ ...current, source: event.target.value }))}
                            placeholder="Filter"
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                          />
                        </th>
                        <th className="py-2.5 pr-3">
                          <div className="mb-1.5">Batch</div>
                          <input
                            value={donationFilters.batch}
                            onChange={(event) => setDonationFilters((current) => ({ ...current, batch: event.target.value }))}
                            placeholder="Filter"
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                          />
                        </th>
                        <th className="py-2.5">
                          <div className="mb-1.5">Collected</div>
                          <input
                            value={donationFilters.date}
                            onChange={(event) => setDonationFilters((current) => ({ ...current, date: event.target.value }))}
                            placeholder="Filter"
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDonations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-sm text-slate-400">
                            No donation history matches the current filters.
                          </td>
                        </tr>
                      ) : (
                        visibleDonations.map((entry) => (
                          <tr key={entry.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-2.5 pr-3">
                              <div className="font-semibold text-slate-800">{entry.donorName}</div>
                              <div className="text-xs text-slate-500">{entry.donorTrackingNo}</div>
                            </td>
                            <td className="py-2.5 pr-3 text-slate-700">{entry.volumeMl.toLocaleString()}</td>
                            <td className="py-2.5 pr-3 text-slate-700">{entry.programSource}</td>
                            <td className="py-2.5 pr-3 text-slate-700">{entry.batchId ?? '—'}</td>
                            <td className="py-2.5 text-slate-700">{entry.collectedAt}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                  <div>
                    Page {safeDonationPage} of {donationTotalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDonationPage((current) => Math.max(1, current - 1))}
                      disabled={safeDonationPage === 1}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setDonationPage((current) => Math.min(donationTotalPages, current + 1))}
                      disabled={safeDonationPage === donationTotalPages}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === 'releases' ? (
              <>
                <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <input
                    value={releaseSearch}
                    onChange={(event) => setReleaseSearch(event.target.value)}
                    placeholder="Search release history"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#E04A75] focus:ring-2 focus:ring-rose-100 md:max-w-xs"
                  />
                  <div className="text-xs font-medium text-slate-500">
                    Showing {pageSize} records per page.
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <th className="py-2.5 pr-3">
                          <div className="mb-1.5">Receiver</div>
                          <input
                            value={releaseFilters.receiver}
                            onChange={(event) => setReleaseFilters((current) => ({ ...current, receiver: event.target.value }))}
                            placeholder="Filter"
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                          />
                        </th>
                        <th className="py-2.5 pr-3">
                          <div className="mb-1.5">Volume</div>
                          <input
                            value={releaseFilters.amount}
                            onChange={(event) => setReleaseFilters((current) => ({ ...current, amount: event.target.value }))}
                            placeholder="Filter"
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                          />
                        </th>
                        <th className="py-2.5 pr-3">
                          <div className="mb-1.5">Batch</div>
                          <input
                            value={releaseFilters.batch}
                            onChange={(event) => setReleaseFilters((current) => ({ ...current, batch: event.target.value }))}
                            placeholder="Filter"
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                          />
                        </th>
                        <th className="py-2.5 pr-3">
                          <div className="mb-1.5">Processed By</div>
                          <input
                            value={releaseFilters.staff}
                            onChange={(event) => setReleaseFilters((current) => ({ ...current, staff: event.target.value }))}
                            placeholder="Filter"
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-600 outline-none focus:border-[#E04A75]"
                          />
                        </th>
                        <th className="py-2.5">
                          <div className="mb-1.5">Processed</div>
                          <div className="text-[10px] font-normal normal-case tracking-normal text-slate-400">Date</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReleases.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-sm text-slate-400">
                            No release history matches the current filters.
                          </td>
                        </tr>
                      ) : (
                        visibleReleases.map((entry) => (
                          <tr key={entry.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-2.5 pr-3">
                              <div className="font-semibold text-slate-800">{entry.receiverName}</div>
                              <div className="text-xs text-slate-500">{entry.receiverTrackingNo}</div>
                            </td>
                            <td className="py-2.5 pr-3 text-slate-700">{entry.volumeMl.toLocaleString()}</td>
                            <td className="py-2.5 pr-3 text-slate-700">{entry.batchId ?? '—'}</td>
                            <td className="py-2.5 pr-3 text-slate-700">{entry.processedBy}</td>
                            <td className="py-2.5 text-slate-700">{entry.processedAt}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                  <div>
                    Page {safeReleasePage} of {releaseTotalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReleasePage((current) => Math.max(1, current - 1))}
                      disabled={safeReleasePage === 1}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setReleasePage((current) => Math.min(releaseTotalPages, current + 1))}
                      disabled={safeReleasePage === releaseTotalPages}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === 'audit' ? (
              <>
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
                      {filteredAuditLogs.length === 0 ? (
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
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}