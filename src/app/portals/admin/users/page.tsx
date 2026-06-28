'use client';

import { useEffect, useMemo, useState } from 'react';

type AccountItem = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  type: 'member' | 'staff';
  trackingNo: string | null;
};

export default function UserDirectoryPage() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    account: '',
    role: 'all',
    status: 'all',
    tracking: '',
    action: 'all'
  });
  const [accountPage, setAccountPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts ?? []);
      }
    } catch (error) {
      console.error('Failed to load accounts', error);
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

  const pageSize = 15;
  const accountTotalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const safeAccountPage = Math.min(accountPage, accountTotalPages);
  const visibleAccounts = filteredAccounts.slice((safeAccountPage - 1) * pageSize, safeAccountPage * pageSize);

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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-6">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#E04A75]">Management</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">User Directory</h1>
        </div>

        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </div>
        )}

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
      </div>
    </div>
  );
}