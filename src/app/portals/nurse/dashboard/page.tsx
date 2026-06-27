'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import MilkLabelModal from '@/components/MilkLabelModal';
import LogoutButton from '@/components/LogoutButton';

type MilkRequest = {
  rtn: string; mtn: string; requested_volume: number; hospital: string;
  status: 'pending' | 'approved' | 'arriving'; computed_fee?: number;
  created_at: string; rtn_abstract?: string; rtn_prescription?: string;
  bottle_type: string; infant_gender: string; dispensing_program: string;
};

type DonationAppointment = {
  appointment_id: number;
  dtn: string;
  donor_id: number;
  appointment_date: string;
  collection_method: string;
  status: string;
  donor: { first_name: string; last_name: string; tracking_no: string };
};

export default function NurseDashboard() {
  const [stats, setStats] = useState({ raw_volume: 0, active_donors: 0, dispensed_volume: 0 });
  const [appointmentDtn, setAppointmentDtn] = useState('');
  const [volume, setVolume] = useState('');
  const [source, setSource] = useState('In House');
  const [isLogging, setIsLogging] = useState(false);
  const [nurseConfirmRisks, setNurseConfirmRisks] = useState(false);

  const [activeQueueTab, setActiveQueueTab] = useState<'pending' | 'pickup'>('pending');
  const [requests, setRequests] = useState<MilkRequest[]>([]);
  const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null);
  const [approvedVolume, setApprovedVolume] = useState('');

  const [showLabel, setShowLabel] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);
  const [appointments, setAppointments] = useState<DonationAppointment[]>([]);
  const [isProcessingAppt, setIsProcessingAppt] = useState<number | null>(null);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [isSavingInquiry, setIsSavingInquiry] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({ 
    requester_name: '', contact_info: '', member_mtn: '', inquiry_type: 'Request Milk',
    priority: 'Standard', required_volume: '', infant_gender: 'M', dispensing_program: 'In House'
  });

  // --- SAFE VAULT STATE ---
  const [vaultBatches, setVaultBatches] = useState<any[]>([]);
  // ------------------------

  const fetchStats = async () => {
    try { const res = await fetch('/api/nurse/stats'); if (res.ok) setStats(await res.json()); } catch (e) {}
  };
  const fetchRequests = async () => {
    try { const res = await fetch('/api/nurse/requests'); if (res.ok) setRequests(await res.json()); } catch (e) {}
  };
  const fetchInquiries = async () => {
    try { const res = await fetch('/api/inquiries'); if (res.ok) setInquiries(await res.json()); } catch (e) {}
  };
  
  const fetchAppointments = async () => {
    try { 
      const res = await fetch('/api/nurse/appointments'); 
      if (res.ok) setAppointments(await res.json()); 
    } catch(e) {}
  };

  const fetchVault = async () => {
    try { 
      const res = await fetch('/api/nurse/vault'); 
      if (res.ok) setVaultBatches(await res.json()); 
    } catch (e) {}
  };

  const handleUpdateAppointment = async (id: number, dtn: string, status: string) => {
    setIsProcessingAppt(id);
    try {
      const res = await fetch('/api/nurse/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: id, dtn, status })
      });
      if (res.ok) fetchAppointments();
    } catch (e) {} finally { setIsProcessingAppt(null); }
  };

  useEffect(() => {
    fetchStats();
    fetchRequests();
    fetchInquiries();
    fetchAppointments();
    fetchVault();
  }, []);

  const handleLogDonation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    setIsLogging(true);
    try {
      const response = await fetch('/api/collections', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          dtn: appointmentDtn, 
          volume, 
          source,
          confirm_no_new_risks: nurseConfirmRisks
        }) 
      });
      const data = await response.json();
      if (response.ok) {
        setLabelData({ dtn: appointmentDtn, volume }); setShowLabel(true);
        setAppointmentDtn(''); 
        setVolume(''); 
        setNurseConfirmRisks(false);
        fetchStats(); 
      } else { alert(`Error: ${data.error}`); }
    } catch (e: any) { alert(`Submission failed: ${e.message}`); } finally { setIsLogging(false); }
  };

  const handleApproveReview = async (rtn: string, mtn: string, requestedBottle: string, requestedVol: number) => {
    setIsProcessingRequest(rtn);
    try {
      const finalVolumeToApprove = approvedVolume ? Number(approvedVolume) : requestedVol;
      const fee = (finalVolumeToApprove * 2.0) + ({ ameda: 85, korea: 65, red_cap: 40 }[requestedBottle] || 0);
      const response = await fetch('/api/nurse/requests/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rtn, mtn, approved_volume: finalVolumeToApprove, computed_fee: fee, hospital: 'Standard Dispense' }) });
      if (response.ok) { alert(`Approved!`); fetchRequests(); setApprovedVolume(''); } else { alert(`Error: ${(await response.json()).error}`); }
    } catch (e: any) { alert(`Failed: ${e.message}`); } finally { setIsProcessingRequest(null); }
  };

  const handleRejectRequest = async (rtn: string, mtn: string) => {
    if (!confirm("Are you sure?")) return; setIsProcessingRequest(rtn);
    try {
      const res = await fetch('/api/nurse/requests/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rtn, mtn }) });
      if (res.ok) fetchRequests();
    } catch (e) {} finally { setIsProcessingRequest(null); }
  };

  const handleFinalDispense = async (rtn: string, mtn: string, finalVolume: number, finalFee: number, bottleType: string) => {
    setIsProcessingRequest(rtn);
    try {
      const res = await fetch('/api/dispense', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mtn, volume: finalVolume, hospital: 'pre-approved', bottleType, cost: finalFee, rtn }) });
      if (res.ok) { 
        alert(`Success!`); 
        fetchRequests(); 
        fetchStats(); 
        fetchVault(); 
      } else { 
        alert(`Error: ${(await res.json()).error}`); 
      }
    } catch (e: any) { alert(`Failed: ${e.message}`); } finally { setIsProcessingRequest(null); }
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setIsSavingInquiry(true);
    try {
      const res = await fetch('/api/inquiries', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(inquiryForm) 
      });
      
      if (res.ok) {
        const data = await res.json();
        setInquiries(prev => [data.inquiry, ...prev].slice(0, 15));
        setInquiryForm({ 
          requester_name: '', contact_info: '', member_mtn: '', 
          inquiry_type: 'Request Milk', priority: 'Standard', 
          required_volume: '', infant_gender: 'M', dispensing_program: 'In House' 
        });
      } else {
        alert("Error saving inquiry.");
      }
    } catch (e) {
      console.error(e);
    } finally { 
      setIsSavingInquiry(false); 
    }
  };

  const handleResolveInquiry = async (id: number) => {
    try {
      const res = await fetch('/api/inquiries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inquiry_id: id, status: 'Resolved' }) });
      if (res.ok) setInquiries(prev => prev.map(inq => inq.inquiry_id === id ? { ...inq, status: 'Resolved' } : inq));
    } catch (e) {}
  };

  const pendingQueue = requests.filter(r => r.status === 'pending');
  const pickupQueue = requests.filter(r => r.status === 'approved' || r.status === 'arriving');

  return (
    <div className="min-h-screen bg-slate-50 flex font-body text-slate-800">
      <div className="flex-1 p-8 lg:p-10 overflow-y-auto h-screen [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">Nurse Station Overview</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">Manage donor collections, screenings, and NICU dispensing.</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <Link href="/portals/nurse/screenings/new">
              <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-sm">
                + Conduct Health Screening
              </button>
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* TOP STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-[#E04A75]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Raw Collections (Today)</span>
            <div className="text-4xl font-black text-slate-900 font-heading mt-2">{stats.raw_volume.toLocaleString()} mL</div>
            <span className="text-xs text-[#E04A75] font-bold mt-1 block">Awaiting Lab Pooling</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Donors</span>
            <div className="text-4xl font-black text-slate-900 font-heading mt-2">{stats.active_donors}</div>
            <span className="text-xs text-emerald-600 font-bold mt-1 block">Cleared by Clinical Tests</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-indigo-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dispensed (This Month)</span>
            <div className="text-4xl font-black text-slate-900 font-heading mt-2">{stats.dispensed_volume.toLocaleString()} mL</div>
            <span className="text-xs text-indigo-600 font-bold mt-1 block">Successfully released to recipients</span>
          </div>
        </div>

        {/* MAIN MODULES GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          
          {/* MODULE 1: CLINICAL INTAKE (RAW DONATIONS) */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[550px]">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-[#E04A75] font-heading mb-1">Clinical Intake: Raw Milk</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log fresh expressions by scanning an approved appointment ticket (DTN).
              </p>
            </div>
            
            <form className="space-y-6 flex-1 flex flex-col" onSubmit={(e) => { e.preventDefault(); handleLogDonation(e as any); }}>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Verify Appointment Ticket (DTN)
                </label>
                <input 
                  type="text" 
                  required 
                  value={appointmentDtn} 
                  onChange={(e) => setAppointmentDtn(e.target.value)} 
                  placeholder="e.g. DTN-1024" 
                  className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-2 focus:ring-pink-100 transition-all uppercase font-mono bg-white shadow-inner" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Measured Vol (mL)</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    value={volume} 
                    onChange={(e) => setVolume(e.target.value)} 
                    placeholder="e.g. 150" 
                    className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-2 focus:ring-pink-100 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Collection Source</label>
                  <select 
                    value={source} 
                    onChange={(e) => setSource(e.target.value)} 
                    className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm focus:border-[#E04A75] focus:ring-2 focus:ring-pink-100 transition-all bg-white"
                  >
                    <option value="In House">In House (Clinic Appt)</option>
                    <option value="Moms Act">Moms Act Drive</option>
                    <option value="Milky Way">Milky Way Campaign</option>
                    <option value="Hospital Transfer">External Hospital Transfer</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    required
                    checked={nurseConfirmRisks} 
                    onChange={(e) => setNurseConfirmRisks(e.target.checked)} 
                    className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 accent-amber-600 cursor-pointer" 
                  />
                  <span className="text-xs font-bold text-amber-800 leading-tight">
                    Required: I have verbally confirmed with the donor that no new health risks, infections, or restricted medications have occurred since their clinical screening.
                  </span>
                </label>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={isLogging} 
                  className="w-full bg-[#1A1A1A] text-white py-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm flex justify-center items-center gap-2"
                >
                  {isLogging ? (
                    'Registering to Database...'
                  ) : (
                    <>
                      <span>Log to Cold Storage & Print Label</span>
                      <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* MODULE 2: DISPENSING */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[550px] overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-[#E04A75] font-heading mb-1">Pasteurized Milk Dispensing</h3>
                  <p className="text-xs text-slate-500">Manage member requests and release safe biological batches.</p>
                </div>
              </div>
              
              <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                <button onClick={() => setActiveQueueTab('pending')} className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${activeQueueTab === 'pending' ? 'bg-[#E04A75] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Medical Reviews ({pendingQueue.length})</button>
                <button onClick={() => setActiveQueueTab('pickup')} className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${activeQueueTab === 'pickup' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Awaiting Pickup ({pickupQueue.length})</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {/* TAB 1: PENDING MEDICAL REVIEWS */}
              {activeQueueTab === 'pending' && (
                <div className="space-y-4">
                  {pendingQueue.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-medium">No pending requests requiring medical review.</div>
                  ) : (
                    pendingQueue.map(req => (
                      <div key={req.rtn} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-800">{req.rtn}</span>
                            <span className="block text-[10px] text-slate-400 uppercase mt-0.5">Member: {req.mtn}</span>
                          </div>
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-0.5 rounded">Requested: {req.requested_volume}mL</span>
                        </div>
                        <div className="flex gap-2 mb-4">
                          <button disabled={!req.rtn_abstract} onClick={() => window.open(req.rtn_abstract, '_blank')} className="flex-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 py-1.5 rounded hover:bg-indigo-100 transition-colors disabled:opacity-50">📄 View Abstract</button>
                          <button disabled={!req.rtn_prescription} onClick={() => window.open(req.rtn_prescription, '_blank')} className="flex-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 py-1.5 rounded hover:bg-indigo-100 transition-colors disabled:opacity-50">📄 View Prescription</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-indigo-50/40 rounded-lg border border-indigo-100/50">
                          <div><span className="block text-[9px] font-bold text-indigo-400 uppercase mb-0.5">Gender</span><span className="text-xs font-semibold text-indigo-900">{req.infant_gender === 'M' ? 'Male' : 'Female'}</span></div>
                          <div><span className="block text-[9px] font-bold text-indigo-400 uppercase mb-0.5">Program</span><span className="text-xs font-semibold text-indigo-900 truncate block">{req.dispensing_program}</span></div>
                          <div><span className="block text-[9px] font-bold text-indigo-400 uppercase mb-0.5">Bottle</span><span className="text-xs font-semibold text-indigo-900 capitalize">{req.bottle_type?.replace('_', ' ')}</span></div>
                        </div>
                        <div className="mb-4">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Approved Vol (mL)</label>
                          <input type="number" placeholder={`Leave blank to approve full ${req.requested_volume}mL`} value={approvedVolume} onChange={(e) => setApprovedVolume(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleApproveReview(req.rtn, req.mtn, req.bottle_type, req.requested_volume)} disabled={isProcessingRequest === req.rtn} className="flex-1 bg-amber-500 text-white text-[11px] font-bold py-2 rounded-lg hover:bg-amber-600 disabled:opacity-50">Approve Request</button>
                          <button onClick={() => handleRejectRequest(req.rtn, req.mtn)} disabled={isProcessingRequest === req.rtn} className="px-3 bg-white border border-red-200 text-red-600 text-[11px] font-bold py-2 rounded-lg hover:bg-red-50 disabled:opacity-50">Reject</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: AWAITING PICKUP */}
              {activeQueueTab === 'pickup' && (
                <div className="space-y-4">
                  {pickupQueue.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-medium">No approved requests awaiting pickup.</div>
                  ) : (
                    pickupQueue.map(req => (
                      <div key={req.rtn} className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 h-full w-1.5 bg-emerald-500 shrink-0" />
                        <div className="pl-2">
                          <div className="flex justify-between items-start mb-3">
                            <div><span className="font-mono text-xs font-bold text-slate-800">{req.rtn}</span><span className="block text-[10px] text-slate-400 uppercase mt-0.5">Member: {req.mtn}</span></div>
                            <div className="text-right"><span className="block text-[10px] text-slate-400 font-bold uppercase">To Release</span><span className="text-lg font-black text-emerald-600 font-heading leading-tight">{req.requested_volume} mL</span></div>
                          </div>
                          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex justify-between items-center mb-4"><span className="text-[10px] font-bold text-emerald-800 uppercase">To Collect:</span><span className="text-sm font-black text-emerald-700">₱{req.computed_fee?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00'}</span></div>
                          <button onClick={() => handleFinalDispense(req.rtn, req.mtn, req.requested_volume, req.computed_fee || 0, req.bottle_type)} disabled={isProcessingRequest === req.rtn} className="w-full bg-emerald-600 text-white text-xs font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">Verify Cooler & Complete Dispense</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODULE 3: DONATION APPOINTMENTS (DTN QUEUE) */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-indigo-600 font-heading mb-1">Donor Appointments (DTN Queue)</h3>
            <p className="text-xs text-slate-500">Review scheduled clinic donations and authorize DTN tickets for physical intake.</p>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* PENDING REVIEW COLUMN */}
            <div className="border border-slate-200 rounded-xl bg-slate-50 p-5">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Pending Medical Review</h4>
              <div className="space-y-3">
                {appointments.filter(a => a.status === 'Pending').length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">No pending appointments.</div>
                ) : (
                  appointments.filter(a => a.status === 'Pending').map(appt => (
                    <div key={appt.appointment_id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{appt.dtn}</span>
                          <span className="block text-[10px] text-slate-400 uppercase mt-1">MTN: {appt.donor.tracking_no}</span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{appt.collection_method}</span>
                      </div>
                      <div className="mb-4">
                        <span className="block text-sm font-bold text-slate-700">{appt.donor.first_name} {appt.donor.last_name}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">🗓️ {new Date(appt.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                      <div className="flex gap-2 border-t border-slate-100 pt-3">
                        <button onClick={() => handleUpdateAppointment(appt.appointment_id, appt.dtn, 'Approved')} disabled={isProcessingAppt === appt.appointment_id} className="flex-1 bg-indigo-600 text-white text-[10px] font-bold py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">Approve DTN</button>
                        <button onClick={() => handleUpdateAppointment(appt.appointment_id, appt.dtn, 'Rejected')} disabled={isProcessingAppt === appt.appointment_id} className="px-4 bg-white border border-red-200 text-red-600 text-[10px] font-bold py-2 rounded-lg hover:bg-red-50 disabled:opacity-50">Reject</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* APPROVED ARRIVALS COLUMN */}
            <div className="border border-emerald-200 rounded-xl bg-emerald-50 p-5">
              <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-4 border-b border-emerald-200/50 pb-2">Approved / Expected Arrivals</h4>
              <div className="space-y-3">
                {appointments.filter(a => a.status === 'Approved').length === 0 ? (
                  <div className="text-center py-8 text-xs text-emerald-600/50">No expected arrivals.</div>
                ) : (
                  appointments.filter(a => a.status === 'Approved').map(appt => (
                    <div key={appt.appointment_id} className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-full w-1.5 bg-emerald-500 shrink-0" />
                      <div className="pl-2">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono text-xs font-black text-emerald-800">{appt.dtn}</span>
                        </div>
                        <div>
                          <span className="block text-sm font-bold text-slate-700">{appt.donor.first_name} {appt.donor.last_name}</span>
                          <span className="block text-xs text-emerald-600 font-medium mt-1">Expected: {new Date(appt.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                        <div className="mt-3 bg-emerald-100/50 p-2 rounded text-[10px] text-emerald-800 font-medium">
                          Use the "Clinical Intake: Raw Milk" module to scan this DTN when the donor arrives.
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* MODULE 4: SAFE VAULT INVENTORY */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-emerald-600 font-heading mb-1">Safe Vault Inventory</h3>
              <p className="text-xs text-slate-500">Pasteurized, QA-cleared batches ready for NICU and community dispensing.</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 px-5 py-2.5 rounded-xl text-right">
              <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Available</span>
              <span className="text-xl font-black text-emerald-700">{vaultBatches.reduce((sum, b) => sum + b.current_volume, 0)} mL</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            {vaultBatches.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400 font-medium">The vault is currently empty.</div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
                    <tr className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                      <th className="py-3 px-6">Batch ID</th>
                      <th className="py-3 px-6">Available Volume</th>
                      <th className="py-3 px-6">Processing Details</th>
                      <th className="py-3 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-700 bg-white">
                    {vaultBatches.map((batch) => (
                      <tr key={batch.batch_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-slate-900">BATCH-{batch.batch_id}</td>
                        <td className="py-4 px-6 font-black text-emerald-600 text-sm">{batch.current_volume} mL</td>
                        <td className="py-4 px-6 text-slate-500">
                          {batch.pasteurization_temp}°C for {batch.pasteurization_time} mins
                        </td>
                        <td className="py-4 px-6">
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase">
                            QA Passed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* MODULE 5: TRIAGE & INTAKE REGISTRY */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#E04A75] font-heading mb-1">Walk-In Triage & Intake Registry</h3>
              <p className="text-xs text-slate-500">Log walk-ins, link accounts, and triage urgencies before formal processing.</p>
            </div>
          </div>

          {/* MODULE 3: TRIAGE & INTAKE REGISTRY */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#E04A75] font-heading mb-1">Walk-In Triage & Intake Registry</h3>
              <p className="text-xs text-slate-500">Log walk-ins, link accounts, and triage urgencies before formal processing.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-8">
            <form className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100" onSubmit={(e) => { e.preventDefault(); handleInquirySubmit(e as any); }}>
              <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Inquiry Type</label>
                  <select value={inquiryForm.inquiry_type} onChange={(e) => setInquiryForm(p => ({...p, inquiry_type: e.target.value}))} className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75] bg-white">
                    <option value="Request Milk">🍼 Requesting Milk</option>
                    <option value="Donate">💝 Want to Donate</option>
                    <option value="General">ℹ️ General Question</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Urgency Level</label>
                  <select value={inquiryForm.priority} onChange={(e) => setInquiryForm(p => ({...p, priority: e.target.value}))} className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75] bg-white">
                    <option value="Standard">Standard (Normal)</option>
                    <option value="Emergency">🚨 Emergency (Immediate)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Requester Name</label><input type="text" required value={inquiryForm.requester_name} onChange={(e) => setInquiryForm(p => ({ ...p, requester_name: e.target.value }))} placeholder="e.g. Maria Santos" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75]" /></div>
                
                {/* --- UPDATED: SMS Target Label --- */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Phone Number (SMS Target)</label>
                  <input type="text" required value={inquiryForm.contact_info} onChange={(e) => setInquiryForm(p => ({ ...p, contact_info: e.target.value }))} placeholder="e.g. 09XXXXXXXXX" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75]" />
                </div>
              </div>
              <div><label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Member MTN (Optional Link)</label><input type="text" value={inquiryForm.member_mtn} onChange={(e) => setInquiryForm(p => ({ ...p, member_mtn: e.target.value }))} placeholder="e.g. MID-123456" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm font-mono focus:border-[#E04A75] uppercase" /></div>
              {inquiryForm.inquiry_type === 'Request Milk' && (
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200">
                  <div><label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Est. Vol (mL)</label><input type="number" required min="1" value={inquiryForm.required_volume} onChange={(e) => setInquiryForm(p => ({ ...p, required_volume: e.target.value }))} placeholder="250" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75]" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Infant Gender</label><select value={inquiryForm.infant_gender} onChange={(e) => setInquiryForm(p => ({...p, infant_gender: e.target.value}))} className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75] bg-white"><option value="M">Male</option><option value="F">Female</option></select></div>
                  <div><label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Program</label><select value={inquiryForm.dispensing_program} onChange={(e) => setInquiryForm(p => ({...p, dispensing_program: e.target.value}))} className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75] bg-white"><option value="In House">In House</option><option value="Milky Way">Milky Way</option><option value="Donation">Donation</option><option value="POM">POM</option></select></div>
                </div>
              )}
              <button type="submit" disabled={isSavingInquiry} className="w-full bg-[#1A1A1A] text-white py-3 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 mt-2 shadow-sm">{isSavingInquiry ? 'Logging Triage...' : 'Log to Registry'}</button>
            </form>

            {/* --- UPDATED: Recent Triage Board with Smart Linking Badges --- */}
            <div className="border border-slate-200 rounded-2xl bg-white shadow-inner overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
                <h4 className="text-sm font-bold text-slate-800 font-heading">Recent Triage Board</h4><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latest 15</span>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto max-h-[440px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {inquiries.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-400">No walk-ins on the board.</div>
                ) : (
                  inquiries.map((item) => (
                    <div key={item.inquiry_id} className={`rounded-xl border p-4 transition-colors ${item.status === 'Resolved' ? 'bg-slate-50 border-slate-100 opacity-60' : item.priority === 'Emergency' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2 items-center">
                          {item.priority === 'Emergency' && <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">Emergency</span>}
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.inquiry_type}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className={`font-bold ${item.status === 'Resolved' ? 'text-slate-500' : 'text-slate-800'}`}>{item.requester_name}</p>
                          
                          {/* --- DYNAMIC BADGE LOGIC HERE --- */}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500 font-mono">{item.contact_info}</span>
                            {item.member_mtn ? (
                              <span className="text-[9px] font-mono bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                                <span>🔗 Linked:</span> {item.member_mtn}
                              </span>
                            ) : (
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">
                                Guest / Unregistered
                              </span>
                            )}
                          </div>

                        </div>
                        {item.required_volume && <div className="text-right"><span className="text-sm font-black text-[#E04A75]">{item.required_volume} mL</span></div>}
                      </div>
                      {item.status !== 'Resolved' && (
                        <div className="mt-4 pt-3 border-t border-slate-100/50 flex justify-end">
                          <button onClick={() => handleResolveInquiry(item.inquiry_id)} className="text-[10px] font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded transition-colors shadow-sm">Mark as Resolved</button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
      {showLabel && <MilkLabelModal type="raw" data={labelData} onClose={() => setShowLabel(false)} />}
    </div>
  );
}