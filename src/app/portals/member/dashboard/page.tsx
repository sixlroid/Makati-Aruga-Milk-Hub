'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import LogoutButton from '@/components/LogoutButton';

type MemberProfile = {
  member_id: number;
  tracking_no: string;
  dtn?: string | null;
  rtn?: string | null;
  
  rtn_status?: 'pending' | 'approved' | 'rejected' | 'arriving' | null; 
  rtn_volume?: number | null;
  rtn_fee?: number | null;
  rtn_remarks?: string | null;

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

type TransactionItem = {
  trans_id: number;
  rtn_reference: string | null; 
  timestamp: string;
  dispensed_vol: number;
  total_fee: number;
};

export default function MemberDashboard() {
  const { data: session, status } = useSession();
  const activeMtn = session?.user?.name as string | undefined;

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [receivedHistory, setReceivedHistory] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  const [donationMessage, setDonationMessage] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [donationSubmitting, setDonationSubmitting] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  
  const [appointmentDate, setAppointmentDate] = useState('');
  const [collectionMethod, setCollectionMethod] = useState('Breast Pumped');
  const [confirmNoNewRisks, setConfirmNoNewRisks] = useState(false);
  
  const [requestVolume, setRequestVolume] = useState('');
  const [requestHospital, setRequestHospital] = useState('');
  const [clinicalAbstract, setClinicalAbstract] = useState('');
  const [prescription, setPrescription] = useState('');
  
  const [infantGender, setInfantGender] = useState('M');
  const [bottleType, setBottleType] = useState('ameda');
  const [dispensingProgram, setDispensingProgram] = useState('In House');

  const [pickupPerson, setPickupPerson] = useState<'self' | 'rep'>('self');
  const [bringCooler, setBringCooler] = useState(false);
  const [consentSettle, setConsentSettle] = useState(false);

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
      const cleanMtn = mtnStr.replace(/['"]/g, '').trim().toUpperCase();
      
      const res = await fetch(`/api/member/profile?mtn=${cleanMtn}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.member);
        setHistory(data.history ?? []);
        setReceivedHistory(data.receivedMilkHistory ?? []);
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
        setReceivedHistory([]);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Please upload an image or PDF under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
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

  const handleScheduleDonation = async (event: FormEvent) => {
    event.preventDefault();
    setDonationSubmitting(true);
    setDonationMessage(null);

    try {
      const res = await fetch('/api/appointments/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mtn: activeMtn,
          appointment_date: appointmentDate,
          collection_method: collectionMethod
        })
      });
      const data = await res.json();

      if (res.ok) {
        await fetchMemberData(activeMtn || '');
        setDonationMessage(data.message ?? 'Donation appointment scheduled.');
      } else {
        setDonationMessage(data.error ?? 'Unable to schedule donation.');
      }
    } catch (error) {
      console.error('Donation scheduling failed', error);
      setDonationMessage('Network error. Unable to schedule donation.');
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
          clinical_abstract: clinicalAbstract,
          prescription: prescription, 
          infant_gender: infantGender,
          bottle_type: bottleType,
          dispensing_program: dispensingProgram,
          cost: 0 
        })
      });
      const data = await res.json();

      if (res.ok) {
        await fetchMemberData(activeMtn || '');
        setRequestMessage(data.message ?? 'Milk request submitted successfully.');
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

  const handleConfirmPickup = async () => {
    try {
      const res = await fetch('/api/member/requests/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mtn: activeMtn })
      });
      if (res.ok) {
        setProfile((prev) => prev ? { ...prev, rtn_status: 'arriving' } : prev);
      }
    } catch (error) {
      console.error("Failed to acknowledge pickup", error);
    }
  };

  const BOTTLE_PRICES: Record<string, number> = { ameda: 85, korea: 65, red_cap: 40 };
  const estimatedFee = requestVolume ? (Number(requestVolume) * 2.0) + BOTTLE_PRICES[bottleType] : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-12 relative">
      
      {!loading && !profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-red-100">⚠️</div>
            <h2 className="text-xl font-black text-slate-800 font-heading tracking-tight">Profile Not Linked</h2>
            <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
              We successfully authenticated your account, but could not retrieve the medical data for tracking number <strong className="text-slate-800">{activeMtn}</strong>. Please contact the facility admin.
            </p>
            <LogoutButton />
          </div>
        </div>
      )}

      {(!profile) && (
        <div className="max-w-5xl mx-auto mt-8 px-4 opacity-40 pointer-events-none filter blur-[3px]">
          <div className="h-24 bg-white rounded-2xl border border-slate-200 mb-6"></div>
          <div className="grid grid-cols-3 gap-6 mb-6"><div className="h-32 bg-white rounded-2xl border border-slate-200"></div></div>
          <div className="h-96 bg-white rounded-2xl border border-slate-200"></div>
        </div>
      )}

      {profile && (
        <div className="max-w-5xl mx-auto mt-8 px-4">
          <div className="space-y-6">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight font-heading">
                  Mabuhay, {profile.first_name} {profile.last_name}!
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Thank you for helping save fragile lives across Makati City neonatal networks.</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <LogoutButton />
                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 font-mono text-center w-full">
                  <span className="block text-[9px] uppercase tracking-wider font-black text-slate-400">Your Tracking Code</span>
                  <span className="text-sm font-black text-slate-700">{profile.tracking_no}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              </div>
              {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

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
                      <input value={formState.first_name} onChange={(event) => setFormState((current) => ({ ...current, first_name: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Last name</span>
                      <input value={formState.last_name} onChange={(event) => setFormState((current) => ({ ...current, last_name: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                  </div>
                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Middle initial</span>
                    <input value={formState.middle_initial} onChange={(event) => setFormState((current) => ({ ...current, middle_initial: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Contact target</span>
                      <input value={formState.email} onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="email or contact alias" />
                    </label>
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Phone number</span>
                      <input value={formState.phone_number} onChange={(event) => setFormState((current) => ({ ...current, phone_number: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                  </div>
                  <button type="submit" disabled={saving} className="rounded-xl bg-[#E04A75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c83b62] disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save Identity Desk'}
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className={`absolute top-0 left-0 h-full w-1.5 shrink-0 ${profile.status === 'Approved' ? 'bg-emerald-500' : profile.status === 'Deferred' ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <div className="flex items-center justify-between gap-4 mb-4 pl-3">
                    <div>
                      <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Health Screening Status</h2>
                      <p className="text-xs text-slate-500 mt-1">Approved screenings remain valid for 3 months.</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase ${profile.screening_valid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                      {profile.screening_valid ? 'Valid' : 'Needs renewal'}
                    </span>
                  </div>
                  <div className="space-y-3 text-sm text-slate-700 pl-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="font-semibold w-1/3">Clinical File:</span> 
                      <span className={`font-bold ${profile.status === 'Approved' ? 'text-emerald-600' : profile.status === 'Deferred' ? 'text-red-600' : 'text-amber-600'}`}>
                        {profile.status === 'Approved' && '✅ Approved'}
                        {profile.status === 'Deferred' && '🚫 Deferred'}
                        {profile.status === 'Single' && '⏳ Pending Review'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2"><span className="font-semibold w-1/3">Valid until:</span> {profile.screening_valid_until ? new Date(profile.screening_valid_until).toLocaleDateString('en-GB') : 'N/A'}</div>
                    <div className="flex items-center gap-2 pt-2"><span className="font-semibold w-1/3">Donation eligible:</span> {profile.eligible_to_donate ? <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">Yes</span> : <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">No</span>}</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="mb-4">
                    <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Schedule On-Site Donation</h2>
                  </div>
                  
                  {donationMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 mb-4">{donationMessage}</div>}
                  
                  <form onSubmit={handleScheduleDonation} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm text-slate-600">
                        <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Preferred Date & Time</span>
                        <input type="datetime-local" required disabled={!profile.eligible_to_donate} value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#E04A75] disabled:bg-slate-100" />
                      </label>
                      <label className="block text-sm text-slate-600">
                        <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Collection Method</span>
                        <select disabled={!profile.eligible_to_donate} value={collectionMethod} onChange={(e) => setCollectionMethod(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#E04A75] disabled:bg-slate-100">
                          <option value="Breast Pumped">Breast Pumped</option>
                          <option value="Hand Expressed">Hand Expressed</option>
                        </select>
                      </label>
                    </div>

                    {profile.has_previous_donations && (
                      <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer pt-2">
                        <input type="checkbox" disabled={!profile.eligible_to_donate} checked={confirmNoNewRisks} onChange={(e) => setConfirmNoNewRisks(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#E04A75] disabled:opacity-40" />
                        <span className="text-xs text-slate-600 leading-tight">I confirm that no new health risks, infectious symptoms, or restricted medications have occurred since my last clinical clearance.</span>
                      </label>
                    )}

                    <button type="submit" disabled={donationSubmitting || !profile.eligible_to_donate} className="w-full rounded-xl bg-[#1A1A1A] px-4 py-3.5 text-xs font-black text-white hover:bg-slate-800 transition-colors disabled:opacity-50 uppercase tracking-wider mt-2 shadow-sm">
                      {donationSubmitting ? 'Scheduling...' : 'Schedule Clinic Appointment'}
                    </button>
                  </form>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[400px]">
                
                {(!profile.rtn || profile.rtn_status?.toLowerCase() === 'rejected') && (
                  <>
                    <div className="mb-6 border-b border-slate-100 pb-4">
                      <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider font-heading">Request Pasteurized Milk</h2>
                      <p className="text-xs text-slate-500 mt-1">Submit your medical documents to initiate a request.</p>
                      {profile.rtn_status?.toLowerCase() === 'rejected' && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <span className="text-xs font-bold text-red-700 block">🔴 Previous Request Rejected</span>
                          <span className="text-[11px] text-red-600 block mt-1">Remarks: {profile.rtn_remarks || 'Documents missing or invalid.'}</span>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleRequestMilk} className="space-y-4 flex-1 flex flex-col">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <label className="block text-sm text-slate-600">
                          <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Volume (mL)</span>
                          <input type="number" required value={requestVolume} onChange={(e) => setRequestVolume(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#E04A75]" />
                        </label>
                        <label className="block text-sm text-slate-600">
                          <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Hospital/Destination</span>
                          <input type="text" required value={requestHospital} onChange={(e) => setRequestHospital(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#E04A75]" />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <label className="block text-sm text-slate-600">
                          <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Infant Gender</span>
                          <select value={infantGender} onChange={(e) => setInfantGender(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#E04A75]">
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                          </select>
                        </label>
                        <label className="block text-sm text-slate-600">
                          <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Dispensing Activity</span>
                          <select value={dispensingProgram} onChange={(e) => setDispensingProgram(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#E04A75]">
                            <option value="In House">In House (For patients currently admitted inside the hospital)</option>
                            <option value="Milky Way">Milky Way (Makati City external community program)</option>
                            <option value="Donation">Donation (Charity or emergency disaster relief)</option>
                            <option value="POM">Pasteurized Own Milk (Processing your own breastmilk safely for your baby)</option>
                          </select>
                        </label>
                      </div>

                      <label className="block text-sm text-slate-600">
                        <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Select Bottle Storage Type</span>
                        <select value={bottleType} onChange={(e) => setBottleType(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#E04A75]">
                          <option value="ameda">Ameda - Premium hospital grade (+₱85)</option>
                          <option value="korea">Korea Spec - Standard variant (+₱65)</option>
                          <option value="red_cap">Red Cap - Generic hospital variant (+₱40)</option>
                        </select>
                      </label>

                      {requestVolume && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estimated Total Fee</span>
                            <span className="text-lg font-black text-slate-800 font-heading">
                              ₱{estimatedFee.toLocaleString(undefined, {minimumFractionDigits: 2})}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Calculated at ₱2.00/mL processing fee + selected bottle deposit.
                          </p>
                        </div>
                      )}

                      <div>
                          <label className="block text-[10px] uppercase tracking-wider font-black text-slate-500 mb-1">Upload Clinical Abstract (Max 2MB)</label>
                          <input type="file" accept="image/*,.pdf" required onChange={(e) => handleFileUpload(e, setClinicalAbstract)} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#FFF0F3] file:text-[#E04A75] hover:file:bg-[#FFDEE4] cursor-pointer" />
                        </div>
                        <div className="border-t border-slate-200 pt-3">
                          <label className="block text-[10px] uppercase tracking-wider font-black text-slate-500 mb-1">Upload Pediatrician Prescription (Max 2MB)</label>
                          <input type="file" accept="image/*,.pdf" required onChange={(e) => handleFileUpload(e, setPrescription)} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#FFF0F3] file:text-[#E04A75] hover:file:bg-[#FFDEE4] cursor-pointer" />
                        </div>
                      <button type="submit" disabled={requestSubmitting} className="w-full rounded-xl bg-[#E04A75] px-4 py-3 text-sm font-bold text-white hover:bg-[#c83b62] disabled:opacity-60 mt-auto">
                        {requestSubmitting ? 'Generating RTN Ticket...' : 'Submit Request'}
                      </button>
                    </form>
                  </>
                )}

                {(profile.rtn && (!profile.rtn_status || profile.rtn_status?.toLowerCase() === 'pending')) && (
                  <div className="flex flex-col items-center justify-center text-center h-full space-y-4 py-8">
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-2xl mb-2">🟡</div>
                    <h2 className="text-lg font-black text-slate-800 font-heading">Medical Verification Pending</h2>
                    <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                      Your clinical abstract and prescription are currently being verified by our clinical staff against active inventory. Please wait for verification.
                      <br/><br/>Your Ticket: <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">{profile.rtn}</span>
                    </p>
                    <button className="mt-4 text-xs font-bold text-slate-400 hover:text-red-500 underline decoration-slate-300">Cancel Request</button>
                  </div>
                )}

                {(profile.rtn && profile.rtn_status?.toLowerCase() === 'approved') && (
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6 border-b border-emerald-100 pb-4">
                      <div>
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-md mb-2 inline-block">🟢 Approved for Pickup</span>
                        <h2 className="text-lg font-black text-slate-800 font-heading">Milk Allocated</h2>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Allocated Volume</span>
                        <span className="text-xl font-black text-emerald-600">{profile.rtn_volume || '150'} mL</span>
                      </div>
                    </div>

                    <div className="space-y-5 flex-1">
                      
                      <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex justify-between items-center shadow-sm">
                        <div>
                          <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Final Payment Required</span>
                          <p className="text-xs text-emerald-600 font-medium">Please prepare this exact amount for pickup.</p>
                        </div>
                        <span className="text-4xl font-black text-emerald-700 font-heading tracking-tighter">
                          ₱{profile.rtn_fee?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00'}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Who is claiming the milk?</span>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700"><input type="radio" name="pickup" checked={pickupPerson === 'self'} onChange={() => setPickupPerson('self')} className="accent-emerald-600" /> Mother / Self</label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700"><input type="radio" name="pickup" checked={pickupPerson === 'rep'} onChange={() => setPickupPerson('rep')} className="accent-emerald-600" /> Authorized Representative</label>
                        </div>
                        {pickupPerson === 'rep' && (
                          <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 font-medium">
                            <span className="font-bold">Notice:</span> The representative must present a formal authorization letter, photocopies of the mother's IDs, and their own valid government ID.
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-start gap-3 text-xs text-slate-700 font-medium cursor-pointer">
                          <input type="checkbox" checked={bringCooler} onChange={(e) => setBringCooler(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600" />
                          <span>I confirm I will bring a cooler or icebox with gel packs. (Milk will not be released without proper cold chain transport).</span>
                        </label>
                        <label className="flex items-start gap-3 text-xs text-slate-700 font-medium cursor-pointer">
                          <input type="checkbox" checked={consentSettle} onChange={(e) => setConsentSettle(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600" />
                          <span>I understand I must sign the consent form and settle the calculated processing/bottle deposit fees upon arrival.</span>
                        </label>
                      </div>

                      <div className="mt-auto pt-4">
                        <button onClick={handleConfirmPickup} disabled={!bringCooler || !consentSettle} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                          Acknowledge & Confirm Pickup Arrival
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(profile.rtn && profile.rtn_status?.toLowerCase() === 'arriving') && (
                  <div className="flex flex-col items-center justify-center text-center h-full space-y-4 py-8">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl mb-2 shadow-sm border border-emerald-200">🏥</div>
                    <h2 className="text-xl font-black text-emerald-700 font-heading tracking-tight">Please Proceed to the Facility</h2>
                    <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
                      Your pickup is confirmed. Please proceed to the milk bank with your IDs and a cooler with gel packs to claim your <strong className="text-slate-800">{profile.rtn_volume} mL</strong> of safe pasteurized milk.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 w-full max-w-xs">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Final Payment Required</span>
                      <span className="text-2xl font-black text-slate-800">₱{profile.rtn_fee?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Your Personal Storage History Ledger (Donations)</h2>
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

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4">
                <h2 className="text-xs font-black text-emerald-800 uppercase tracking-wider font-heading">Milk Dispensed / Received Ledger</h2>
              </div>
              {receivedHistory.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-medium">
                  You haven't received any pasteurized milk from the facility yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-emerald-50/30 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                        <th className="py-3 px-6">Receipt Ticket</th>
                        <th className="py-3 px-6">Date Received</th>
                        <th className="py-3 px-6">Volume Claimed</th>
                        <th className="py-3 px-6">Total Fee Paid</th>
                        <th className="py-3 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                      {receivedHistory.map((trans) => (
                        <tr key={trans.trans_id} className="hover:bg-slate-50/30">
                          <td className="py-4 px-6 font-mono font-bold text-slate-400">{trans.rtn_reference || `#TRX-${trans.trans_id}`}</td>
                          <td className="py-4 px-6 text-slate-500">{new Date(trans.timestamp).toLocaleDateString('en-GB')}</td>
                          <td className="py-4 px-6 font-black text-emerald-600">{trans.dispensed_vol} mL</td>
                          <td className="py-4 px-6 font-bold text-slate-600">₱{Number(trans.total_fee).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="py-4 px-6">
                            <span className="text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded font-bold uppercase text-[9px]">Completed</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}