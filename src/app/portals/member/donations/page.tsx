'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';

type HistoryItem = {
  collection_id: number;
  date_collected: string;
  raw_volume_ml: number;
  program_source: string;
  batch_id: number | null;
};

export default function DonationLedgerPage() {
  const { data: session, status } = useSession();
  const activeMtn = session?.user?.name as string | undefined;

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [eligible, setEligible] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [donationVolume, setDonationVolume] = useState('');
  const [donationSource, setDonationSource] = useState('Scheduled donation');
  const [confirmNoNewRisks, setConfirmNoNewRisks] = useState(false);
  const [donationMessage, setDonationMessage] = useState<string | null>(null);
  const [donationSubmitting, setDonationSubmitting] = useState(false);

  const fetchLedger = async (mtnStr: string) => {
    try {
      const res = await fetch(`/api/member/profile?mtn=${mtnStr}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setHistory(data.history ?? []);
        setEligible(data.member.eligible_to_donate ?? false);
        setHasPrev(data.member.has_previous_donations ?? false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && activeMtn) fetchLedger(activeMtn);
  }, [status, activeMtn]);

  const totalVolumeDonated = history.reduce((sum, item) => sum + item.raw_volume_ml, 0);

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
        setDonationMessage(data.message ?? 'Donation appointment scheduled.');
        setDonationVolume('');
        if (activeMtn) await fetchLedger(activeMtn);
      } else {
        setDonationMessage(data.error ?? 'Unable to schedule appointment.');
      }
    } catch (error) {
      setDonationMessage('Submission failed.');
    } finally {
      setDonationSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifetime Contributions</span>
            <div className="text-3xl font-black text-[#E04A75] mt-1">{totalVolumeDonated} mL</div>
            <span className="text-xs text-slate-500 mt-1">Across {history.length} Bottled Lodgements</span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">Schedule Donation Appointment</h2>
            {donationMessage && <div className="mt-2 text-sm text-emerald-700 bg-emerald-50 p-2 rounded-lg">{donationMessage}</div>}
            <form onSubmit={handleScheduleDonation} className="mt-3 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <input type="number" required placeholder="Volume (mL)" value={donationVolume} onChange={e => setDonationVolume(e.target.value)} className="border rounded-xl p-2 text-sm bg-white text-slate-800" />
                <input type="text" placeholder="Campaign Target Source" value={donationSource} onChange={e => setDonationSource(e.target.value)} className="border rounded-xl p-2 text-sm bg-white text-slate-800" />
              </div>
              {hasPrev && (
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={confirmNoNewRisks} onChange={e => setConfirmNoNewRisks(e.target.checked)} className="rounded text-[#E04A75]" />
                  No new biological safety risks are present since my last validation check.
                </label>
              )}
              <button type="submit" disabled={donationSubmitting || !eligible} className="w-full bg-[#1A1A1A] text-white p-2 text-sm rounded-xl font-semibold disabled:opacity-50">
                {donationSubmitting ? 'Processing...' : 'Book Deposit Slot'}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b p-4"><h3 className="text-xs font-black text-slate-700 uppercase">Storage Pipeline Records</h3></div>
          {history.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No entries documented.</div>
          ) : (
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b text-[10px] uppercase text-slate-400">
                  <th className="p-4">Bottle ID</th>
                  <th className="p-4">Date Lodged</th>
                  <th className="p-4">Volume</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map(item => (
                  <tr key={item.collection_id}>
                    <td className="p-4 font-mono font-bold">#BOT-{item.collection_id}</td>
                    <td className="p-4">{new Date(item.date_collected).toLocaleDateString('en-GB')}</td>
                    <td className="p-4 font-black">{item.raw_volume_ml} mL</td>
                    <td className="p-4">
                      {item.batch_id ? <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-1.5 py-0.5 text-[9px] font-bold">BATCHED #{item.batch_id}</span> : <span className="bg-amber-50 text-amber-700 border border-amber-100 rounded px-1.5 py-0.5 text-[9px] font-bold">COLD CORES / PENDING</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}