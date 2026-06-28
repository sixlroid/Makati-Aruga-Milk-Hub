'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';

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
  const { data: session, status } = useSession();
  const activeMtn = session?.user?.name as string | undefined;

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
    if (status === "loading") return;
    if (status === "authenticated" && activeMtn) {
      fetchMemberData(activeMtn);
    }
  }, [status, activeMtn]);

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
        await fetchMemberData(activeMtn || '');
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
        await fetchMemberData(activeMtn || '');
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
        await fetchMemberData(activeMtn || '');
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
          <div id="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                <div className="text-[10px] uppercase tracking-wider font-black text-slate-400">Member Core IDs</div>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  <div><span className="font-semibold">Member ID:</span> {profile.tracking_no}</div>
                  <div><span className="font-semibold">Donor Tracking No. (DTN):</span> {profile.dtn ?? 'N/A'}</div>
                  <div><span className="font-semibold">Receiver Tracking No. (RTN):</span> {profile.rtn ?? 'N/A'}</div>
              </div>
              </div>
            </div>

            
            <div id="donation-ledger" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Personal Storage History</h2>
              </div>

              {history.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-medium">
                  No physical milk storage deposits yet.
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