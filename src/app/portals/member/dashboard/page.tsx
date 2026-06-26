'use client';
import { useEffect, useState, type FormEvent } from 'react';

type MemberProfile = {
  member_id: number;
  tracking_no: string;
  dtn?: string | null;
  rtn?: string | null;
  first_name: string;
  last_name: string;
  middle_initial?: string | null;
  email?: string | null;
  phone_number?: string;
  status: string;
  medical_docs?: string | null;
};

type HistoryItem = {
  collection_id: number;
  date_collected: string;
  raw_volume_ml: number;
  program_source: string;
  batch_id: number | null;
};

export default function MemberDashboard() {
  const [inputMtn, setInputMtn] = useState('MID-644013');
  const [activeMtn, setActiveMtn] = useState('MID-644013');

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    first_name: '',
    last_name: '',
    middle_initial: '',
    email: '',
    phone_number: '',
    medical_docs: ''
  });

  const fetchMemberData = async (mtnStr: string) => {
    if (!mtnStr) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/member/profile?mtn=${mtnStr}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.member);
        setHistory(data.history ?? []);
        setFormState({
          first_name: data.member.first_name ?? '',
          last_name: data.member.last_name ?? '',
          middle_initial: data.member.middle_initial ?? '',
          email: data.member.email ?? '',
          phone_number: data.member.phone_number ?? '',
          medical_docs: data.member.medical_docs ?? ''
        });
      } else {
        setProfile(null);
        setHistory([]);
      }
    } catch (error) {
      console.error('Failed to load user portal', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberData(activeMtn);
  }, [activeMtn]);

  const totalVolumeDonated = history.reduce((sum, item) => sum + item.raw_volume_ml, 0);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/member/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_no: activeMtn,
          ...formState
        })
      });
      const data = await res.json();

      if (res.ok) {
        setProfile((current) => current ? { ...current, ...data.member } : data.member);
        setMessage('Identity settings updated successfully.');
      } else {
        setMessage(data.error ?? 'Unable to update identity settings.');
      }
    } catch (error) {
      console.error('Profile update failed', error);
      setMessage('Unable to reach the identity desk right now.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateIdentifiers = async () => {
    setWorkerLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/worker/identifiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_no: activeMtn })
      });
      const data = await res.json();

      if (res.ok) {
        await fetchMemberData(activeMtn);
        setMessage(data.message ?? 'Identifiers refreshed.');
      } else {
        setMessage(data.error ?? 'Unable to refresh identifiers.');
      }
    } catch (error) {
      console.error('Identifier refresh failed', error);
      setMessage('Identifier refresh failed.');
    } finally {
      setWorkerLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-12">
      <div className="max-w-5xl mx-auto mt-8 px-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm font-medium">Re-syncing biological logs from cloud framework context...</div>
        ) : !profile ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-md mx-auto mt-12">
            <span className="text-4xl">🔍</span>
            <h2 className="text-base font-bold text-slate-800 mt-4">Account Profile Index Deficit</h2>
            <p className="text-xs text-slate-400 mt-2">The context tag <span className="font-mono font-bold text-slate-600">"{activeMtn}"</span> does not currently match any tracked registration profile inside the infrastructure cluster setup.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight font-heading">
                  Mabuhay, {profile.first_name} {profile.last_name}!
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Thank you for helping save fragile lives across Makati City neonatal networks.</p>
              </div>
              <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 font-mono text-center shrink-0">
                <span className="block text-[9px] uppercase tracking-wider font-black text-slate-400">Your Tracking Code</span>
                <span className="text-sm font-black text-slate-700">{profile.tracking_no}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 flex items-center justify-between relative overflow-hidden">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Clearance Status</span>
                  <div className="text-xl font-black text-slate-800 mt-1 font-heading">
                    {profile.status === 'Approved' && '✅ Approved for Donation'}
                    {profile.status === 'Deferred' && '🚫 Quarantined / Deferred'}
                    {profile.status === 'Single' && '⏳ Profile Pending Review'}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">
                    {profile.status === 'Approved' && 'Your medical documentation has been cleared by clinical desk operations. You are certified to distribute raw expressions.'}
                    {profile.status === 'Deferred' && 'Clinical indicator alerts were raised during your questionnaire evaluation. Active donation status has been paused.'}
                    {profile.status === 'Single' && 'Your initial file has been successfully staged. Please report to the nurse desk to run an Appendix G-1 physical evaluation loop.'}
                  </p>
                </div>

                <div className={`absolute top-0 right-0 h-full w-3 shrink-0 ${
                  profile.status === 'Approved' ? 'bg-emerald-500' : profile.status === 'Deferred' ? 'bg-red-500' : 'bg-amber-400'
                }`} />
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifetime Contributions</span>
                <div className="text-3xl font-black text-[#E04A75] font-heading mt-1">{totalVolumeDonated} mL</div>
                <span className="text-[11px] text-slate-500 font-bold block mt-1">Across {history.length} Individual Bottles</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Interactive Profile & Identity Settings Desk</h2>
                  <p className="text-xs text-slate-500 mt-1">Update your display identity, channel contact target, and validation documentation reference safely.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateIdentifiers}
                    disabled={workerLoading}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {workerLoading ? 'Working…' : 'Refresh Identifiers'}
                  </button>
                </div>
              </div>

              {message ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[10px] uppercase tracking-wider font-black text-slate-400">Member Core IDs</div>
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    <div><span className="font-semibold">Tracking No:</span> {profile.tracking_no}</div>
                    <div><span className="font-semibold">Donor Tracking No:</span> {profile.dtn ?? 'Generating…'}</div>
                    <div><span className="font-semibold">Receiver Tracking No:</span> {profile.rtn ?? 'Generating…'}</div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">First name</span>
                      <input
                        value={formState.first_name}
                        onChange={(event) => setFormState((current) => ({ ...current, first_name: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Last name</span>
                      <input
                        value={formState.last_name}
                        onChange={(event) => setFormState((current) => ({ ...current, last_name: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Middle initial</span>
                    <input
                      value={formState.middle_initial}
                      onChange={(event) => setFormState((current) => ({ ...current, middle_initial: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Contact target</span>
                      <input
                        value={formState.email}
                        onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        placeholder="email or contact alias"
                      />
                    </label>
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Phone number</span>
                      <input
                        value={formState.phone_number}
                        onChange={(event) => setFormState((current) => ({ ...current, phone_number: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Validation documentation</span>
                    <textarea
                      value={formState.medical_docs}
                      onChange={(event) => setFormState((current) => ({ ...current, medical_docs: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      rows={3}
                      placeholder="Paste a document reference, upload note, or validation link"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#E04A75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c83b62] disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save Identity Desk'}
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Your Personal Storage History Ledger</h2>
              </div>

              {history.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-medium">
                  You haven't logged any physical milk storage deposits in the database pipeline yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                        <th className="py-3 px-6">Physical Bottle ID</th>
                        <th className="py-3 px-6">Date Lodged</th>
                        <th className="py-3 px-6">Volume Level</th>
                        <th className="py-3 px-6">Campaign Source</th>
                        <th className="py-3 px-6">Processing Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                      {history.map((bottle) => (
                        <tr key={bottle.collection_id} className="hover:bg-slate-50/30">
                          <td className="py-4 px-6 font-mono font-bold text-slate-400">#BOT-{bottle.collection_id}</td>
                          <td className="py-4 px-6 text-slate-500">{new Date(bottle.date_collected).toLocaleDateString('en-GB')}</td>
                          <td className="py-4 px-6 font-black text-slate-800">{bottle.raw_volume_ml} mL</td>
                          <td className="py-4 px-6 text-slate-400">{bottle.program_source}</td>
                          <td className="py-4 px-6">
                            {bottle.batch_id === null ? (
                              <span className="text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold uppercase text-[9px]">Cold Storage / Pending</span>
                            ) : (
                              <span className="text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-bold uppercase text-[9px]">Pasteurized (Batch #{bottle.batch_id})</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}