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
  last_screening_at?: string | null;
  screening_valid_until?: string | null;
  screening_valid?: boolean;
  screening_expired?: boolean;
  eligible_to_donate?: boolean;
  has_previous_donations?: boolean;
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
  const [donationMessage, setDonationMessage] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [donationSubmitting, setDonationSubmitting] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [donationVolume, setDonationVolume] = useState('');
  const [donationSource, setDonationSource] = useState('Scheduled donation');
  const [confirmNoNewRisks, setConfirmNoNewRisks] = useState(false);
  const [requestVolume, setRequestVolume] = useState('');
  const [requestHospital, setRequestHospital] = useState('');
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

  const handleScheduleDonation = async (event: FormEvent) => {
    event.preventDefault();
    setDonationSubmitting(true);
    setDonationMessage(null);

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mtn: activeMtn,
          volume: donationVolume,
          source: donationSource,
          confirm_no_new_risks: confirmNoNewRisks
        })
      });
      const data = await res.json();

      if (res.ok) {
        await fetchMemberData(activeMtn);
        setDonationMessage(data.message ?? 'Donation appointment scheduled.');
        setDonationVolume('');
      } else {
        setDonationMessage(data.error ?? 'Unable to schedule donation.');
      }
    } catch (error) {
      console.error('Donation scheduling failed', error);
      setDonationMessage('Unable to schedule donation.');
    } finally {
      setDonationSubmitting(false);
    }
  };

  const handleRequestMilk = async (event: FormEvent) => {
    event.preventDefault();
    setRequestSubmitting(true);
    setRequestMessage(null);

    try {
      const res = await fetch('/api/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mtn: activeMtn,
          volume: requestVolume,
          hospital: requestHospital,
          cost: 0
        })
      });
      const data = await res.json();

      if (res.ok) {
        await fetchMemberData(activeMtn);
        setRequestMessage(data.message ?? 'Milk request submitted.');
        setRequestVolume('');
        setRequestHospital('');
      } else {
        setRequestMessage(data.error ?? 'Unable to submit milk request.');
      }
    } catch (error) {
      console.error('Milk request failed', error);
      setRequestMessage('Unable to submit milk request.');
    } finally {
      setRequestSubmitting(false);
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

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Health Screening Status</h2>
                    <p className="text-xs text-slate-500 mt-1">Approved screenings remain valid for 3 months before donation.</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase ${profile.screening_valid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                    {profile.screening_valid ? 'Valid' : 'Needs renewal'}
                  </span>
                </div>
                <div className="space-y-3 text-sm text-slate-700">
                  <div><span className="font-semibold">Last screening:</span> {profile.last_screening_at ?? 'Not available'}</div>
                  <div><span className="font-semibold">Valid until:</span> {profile.screening_valid_until ?? 'N/A'}</div>
                  <div><span className="font-semibold">Donation eligible:</span> {profile.eligible_to_donate ? 'Yes' : 'No'}</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Request Milk</h2>
                  <p className="text-xs text-slate-500 mt-1">Submit a receiver request through the network.</p>
                </div>
                {requestMessage ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 mb-4">{requestMessage}</div>
                ) : null}
                <form onSubmit={handleRequestMilk} className="space-y-4">
                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Requested volume (mL)</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={requestVolume}
                      onChange={(event) => setRequestVolume(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="e.g. 150"
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Hospital or destination</span>
                    <input
                      type="text"
                      value={requestHospital}
                      onChange={(event) => setRequestHospital(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="e.g. Makati Medical Center"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={requestSubmitting}
                    className="w-full rounded-xl bg-[#E04A75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c83b62] disabled:opacity-60"
                  >
                    {requestSubmitting ? 'Submitting…' : 'Request Milk'}
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="mb-4">
                <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Donate Milk by Appointment</h2>
                <p className="text-xs text-slate-500 mt-1">Schedule donation appointments only after nurse approval and valid screening.</p>
              </div>
              {donationMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 mb-4">{donationMessage}</div>
              ) : null}
              <form onSubmit={handleScheduleDonation} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Donation volume (mL)</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={donationVolume}
                      onChange={(event) => setDonationVolume(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="e.g. 200"
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Donation source</span>
                    <input
                      type="text"
                      value={donationSource}
                      onChange={(event) => setDonationSource(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="Scheduled donation"
                    />
                  </label>
                </div>
                {profile.has_previous_donations ? (
                  <label className="flex items-start gap-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={confirmNoNewRisks}
                      onChange={(event) => setConfirmNoNewRisks(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#E04A75]"
                    />
                    <span>I confirm that no new health risks have arisen since my last approved screening.</span>
                  </label>
                ) : null}
                <button
                  type="submit"
                  disabled={donationSubmitting || !profile.eligible_to_donate}
                  className="w-full rounded-xl bg-[#1A1A1A] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {donationSubmitting ? 'Scheduling…' : 'Schedule Donation'}
                </button>
                {!profile.eligible_to_donate ? (
                  <p className="text-xs text-amber-600">Donations are only available after nurse approval and with a screening valid within the last 3 months.</p>
                ) : null}
              </form>
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