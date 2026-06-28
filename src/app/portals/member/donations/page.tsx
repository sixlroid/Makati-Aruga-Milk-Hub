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
  const [profile, setProfile] = useState<any>({}); 
  const [loading, setLoading] = useState(true);
  
  const [appointmentDate, setAppointmentDate] = useState('');
  const [collectionMethod, setCollectionMethod] = useState('Breast Pumped');
  const [confirmNoNewRisks, setConfirmNoNewRisks] = useState(false);
  const [donationMessage, setDonationMessage] = useState<string | null>(null);
  const [donationSubmitting, setDonationSubmitting] = useState(false);

  const fetchLedger = async (mtnStr: string) => {
    try {
      const res = await fetch(`/api/member/profile?mtn=${mtnStr}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setHistory(data.history ?? []);
        setProfile(data.member ?? {});
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

  const handleScheduleDonation = async (event: FormEvent) => {
    event.preventDefault();
    setDonationSubmitting(true);
    setDonationMessage(null);
    try {
      const res = await fetch('/api/member/donate/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mtn: activeMtn,
          appointment_date: appointmentDate,
          collection_method: collectionMethod,
          confirm_no_new_risks: confirmNoNewRisks
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDonationMessage(data.message ?? 'Donation appointment scheduled.');
        setAppointmentDate('');
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

  // Helper boolean to check if DTN is active (Pending or Approved)
  const isDtnActive = profile.dtn && profile.dtn_status && (profile.dtn_status.toLowerCase() === 'pending' || profile.dtn_status.toLowerCase() === 'approved');

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">Loading ledger data...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-12">
      {/* The space-y-6 class here automatically creates a perfect gap between all cards inside it */}
      <div className="max-w-5xl mx-auto mt-8 px-4 space-y-6">

        {/* HEALTH SCREENING STATUS CARD */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 mb-4 pl-3">
            <div>
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Health Screening Status</h2>
              <p className="text-xs text-slate-500 mt-1">Approved screenings remain valid for 3 months before donation.</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase ${profile.screening_valid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
              {profile.screening_valid ? 'Valid' : 'Needs renewal'}
            </span>
          </div>
          
          <div className="space-y-3 text-sm text-slate-700 pl-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="font-semibold w-1/3">Clinical File:</span> 
              <span className={`font-bold ${profile.status === 'Approved' ? 'text-emerald-600' : profile.status === 'Deferred' ? 'text-red-600' : 'text-amber-600'}`}>
                {profile.status === 'Approved' && 'Approved'}
                {profile.status === 'Deferred' && 'Deferred'}
                {profile.status === 'Single' && 'Pending Review'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold w-1/3">Last check:</span> 
              {profile.last_screening_at ? new Date(profile.last_screening_at).toLocaleDateString('en-GB') : 'Not available'}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold w-1/3">Valid until:</span> 
              {profile.screening_valid_until ? new Date(profile.screening_valid_until).toLocaleDateString('en-GB') : 'N/A'}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <span className="font-semibold w-1/3">Donation eligible:</span> 
              {profile.eligible_to_donate ? 
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">Yes</span> : 
                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">No</span>
              }
            </div>
          </div>
        </div>
        
        {/* DYNAMIC PROGRESSIVE DONATION CARD (DTN) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col min-h-[350px]">
          
          {/* STATE 1: CAN SCHEDULE (No active DTN) */}
          {(!isDtnActive) && (
            <>
              <div className="mb-4">
                <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Schedule On-Site Donation</h2>
                {profile.dtn_status?.toLowerCase() === 'rejected' && (
                  <div className="mt-2 p-2 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-100">
                    Your previous appointment request was declined. You may schedule a new one.
                  </div>
                )}
                {!profile.eligible_to_donate && profile.dtn_status?.toLowerCase() !== 'rejected' && (
                  <div className="mt-2 p-2 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-200">
                    Note: Your clinical clearance is pending. This appointment will include your mandatory health screening prior to milk collection.
                  </div>
                )}
              </div>
              
              {donationMessage && (
                <div className={`rounded-xl border px-3 py-2 text-sm mb-4 ${donationMessage.includes('failed') || donationMessage.includes('Unable') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  {donationMessage}
                </div>
              )}
              
              <form onSubmit={handleScheduleDonation} className="space-y-4 flex-1 flex flex-col">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Preferred Date & Time</span>
                    <input 
                      type="datetime-local" 
                      required 
                      value={appointmentDate} 
                      onChange={(e) => setAppointmentDate(e.target.value)} 
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#E04A75]" 
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Collection Method</span>
                    <select 
                      value={collectionMethod} 
                      onChange={(e) => setCollectionMethod(e.target.value)} 
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#E04A75]"
                    >
                      <option value="Breast Pumped">Breast Pumped</option>
                      <option value="Hand Expressed">Hand Expressed</option>
                    </select>
                  </label>
                </div>

                {profile.has_previous_donations && (
                  <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer pt-2">
                    <input 
                      type="checkbox" 
                      required
                      checked={confirmNoNewRisks} 
                      onChange={(e) => setConfirmNoNewRisks(e.target.checked)} 
                      className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#E04A75]" 
                    />
                    <span className="text-xs text-slate-600 leading-tight">I confirm that no new health risks, infectious symptoms, or restricted medications have occurred since my last clinical clearance.</span>
                  </label>
                )}

                <button 
                  type="submit" 
                  disabled={donationSubmitting} 
                  className="w-full rounded-xl bg-[#E04A75] px-4 py-3 text-sm font-bold text-white hover:bg-[#c83b62] disabled:opacity-60 mt-auto">
                  {donationSubmitting ? 'Scheduling...' : 'Schedule Clinic Appointment'}
                </button>
              </form>
            </>
          )}

          {/* STATE 2: PENDING (Scheduled, awaiting nurse confirmation) */}
          {(isDtnActive && profile.dtn_status?.toLowerCase() === 'pending') && (
            <div className="flex flex-col items-center justify-center text-center h-full space-y-4 py-6">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-2xl mb-1 border border-amber-100 shadow-sm">⏳</div>
              <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md -mt-2">Awaiting Confirmation</span>
              <h2 className="text-lg font-black text-slate-800 font-heading tracking-tight">Appointment Request Sent</h2>
              <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                Your requested donation date is currently being reviewed by the clinic staff. Please wait for them to confirm the schedule.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-2 w-full max-w-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Temporary Ticket</span>
                <span className="text-lg font-mono font-black text-slate-400">{profile.dtn}</span>
              </div>
            </div>
          )}

          {/* STATE 3: APPROVED (Confirmed, ready to go to clinic) */}
          {(isDtnActive && profile.dtn_status?.toLowerCase() === 'approved') && (
            <div className="flex flex-col items-center justify-center text-center h-full space-y-4 py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-2xl mb-1 border border-emerald-200 shadow-sm">🏥</div>
              <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md -mt-2">Appointment Confirmed</span>
              <h2 className="text-lg font-black text-emerald-700 font-heading tracking-tight">See you at the Clinic!</h2>
              <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                Your donation schedule has been approved by the nurse. Please proceed to the facility at your scheduled time and present this ticket:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-2 w-full max-w-xs border-dashed">
                <span className="text-xl font-mono font-black text-[#E04A75]">{profile.dtn}</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}