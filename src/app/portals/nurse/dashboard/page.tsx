'use client';
import { useState, useEffect } from 'react';
import MilkLabelModal from '@/components/MilkLabelModal';
import LogoutButton from '@/components/LogoutButton';
import TraceabilityScanner from '@/components/TraceabilityScanner';

type MilkRequest = {
  rtn: string; mtn: string; requested_volume: number; hospital: string;
  status: 'pending' | 'approved' | 'arriving'; computed_fee?: number;
  created_at: string; rtn_abstract?: string; rtn_prescription?: string;
  bottle_type: string; infant_gender: string; dispensing_program: string;
};

type PendingBottle = {
  collection_id: number; mtn: string; volume: number; source: string; date: string;
};

export default function NurseDashboard() {
  const [stats, setStats] = useState({ raw_volume: 0, active_donors: 0, dispensed_volume: 0, pasteurized_volume: 0 });
  const [dtnReference, setDtnReference] = useState('');
  const [volume, setVolume] = useState('');
  const [source, setSource] = useState('In House');
  const [confirmRisks, setConfirmRisks] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  const [activeQueueTab, setActiveQueueTab] = useState<'pending' | 'pickup'>('pending');
  const [requests, setRequests] = useState<MilkRequest[]>([]);
  const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null);
  const [approvedVolume, setApprovedVolume] = useState('');

  const [showLabel, setShowLabel] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);

  const [inquiries, setInquiries] = useState<any[]>([]);
  const [isSavingInquiry, setIsSavingInquiry] = useState(false);
  
  const [inquiryForm, setInquiryForm] = useState({
    requester_name: '', contact_info: '', inquiry_type: 'Request Milk',
    priority: 'Standard', required_volume: '', infant_gender: 'M', dispensing_program: 'In House', bottle_type: 'ameda'
  });
  
  const [confirmDocs, setConfirmDocs] = useState(false);

  const [dispatchingId, setDispatchingId] = useState<number | null>(null);
  
  // STRIPPED: No more email requirement
  const [guestForm, setGuestForm] = useState({ first_name: '', last_name: '', dob: '' });

  const [pendingBottles, setPendingBottles] = useState<PendingBottle[]>([]);
  const [showScreening, setShowScreening] = useState(false);
  const [screeningDtn, setScreeningDtn] = useState('');
  const [isScreeningProcessing, setIsScreeningProcessing] = useState(false);
  const [screeningChecks, setScreeningChecks] = useState({ meds: false, illness: false, lifestyle: false });
  const allScreeningChecked = screeningChecks.meds && screeningChecks.illness && screeningChecks.lifestyle;

  const fetchStats = async () => {
    try { const res = await fetch('/api/nurse/stats'); if (res.ok) setStats(await res.json()); } catch (e) {}
  };
  const fetchRequests = async () => {
    try { const res = await fetch('/api/nurse/requests'); if (res.ok) setRequests(await res.json()); } catch (e) {}
  };
  const fetchInquiries = async () => {
    try { const res = await fetch('/api/inquiries'); if (res.ok) setInquiries(await res.json()); } catch (e) {}
  };

  useEffect(() => {
    fetchStats();
    fetchRequests();
    fetchInquiries();
  }, []);

  const handleLogDonation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLogging(true);
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtn: dtnReference, volume, source, confirm_no_new_risks: confirmRisks })
      });
      const data = await response.json();
      if (response.ok) {
        setLabelData({ dtn: dtnReference, volume });
        setShowLabel(true);
        setDtnReference(''); setVolume(''); setConfirmRisks(false);
        fetchStats(); 
      } else { alert(`Error: ${data.error}`); }
    } catch (e: any) { alert(`Submission failed: ${e.message}`); } finally { setIsLogging(false); }
  };

  const handleApproveReview = async (rtn: string, mtn: string, requestedBottle: string, requestedVol: number) => {
    setIsProcessingRequest(rtn);
    try {
      const finalVolumeToApprove = approvedVolume ? Number(approvedVolume) : requestedVol;
      const safeBottle = requestedBottle || 'ameda';
      const fee = (finalVolumeToApprove * 2.0) + ({ ameda: 85, korea: 65, red_cap: 40 }[safeBottle] || 85);

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
      if (res.ok) { alert(`Success!`); fetchRequests(); fetchStats(); } else { alert(`Error: ${(await res.json()).error}`); }
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
        if (data.inquiry) {
          setInquiries(prev => [data.inquiry, ...prev].slice(0, 15));
        } else {
          alert(data.message);
          fetchRequests();
        }
        setInquiryForm({
          requester_name: '', contact_info: '', inquiry_type: 'Request Milk',
          priority: 'Standard', required_volume: '', infant_gender: 'M', dispensing_program: 'In House', bottle_type: 'ameda'
        });
        setConfirmDocs(false);
      } else {
        alert("Error saving inquiry.");
      }
    } catch (e) { console.error(e); } finally { setIsSavingInquiry(false); }
  };

  const handleResolveInquiry = async (id: number) => {
    try {
      const res = await fetch('/api/inquiries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inquiry_id: id, status: 'Resolved' }) });
      if (res.ok) setInquiries(prev => prev.map(inq => inq.inquiry_id === id ? { ...inq, status: 'Resolved' } : inq));
    } catch (e) {}
  };

  const handleDispatchGuest = async (inquiry_id: number) => {
    try {
      const res = await fetch('/api/inquiries/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiry_id, ...guestForm })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Guest successfully registered and dispatched!\n\nGenerated Ticket: ${data.ticket}`);
        
        setDispatchingId(null);
        setGuestForm({ first_name: '', last_name: '', dob: '' });
        
        // Auto-collapses the menu
        setInquiries(prev => prev.map(inq => 
          inq.inquiry_id === inquiry_id ? { ...inq, status: 'Resolved' } : inq
        ));

        fetchInquiries();
        fetchRequests();
      } else {
        alert(`Error: ${data.error || "System Error."}`);
      }
    } catch (e) { console.error(e); }
  };

  const handleConfirmScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allScreeningChecked) return alert("All medical clearances must be verified.");
    setIsScreeningProcessing(true);
    try {
      const res = await fetch('/api/screenings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtn: screeningDtn })
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ " + data.message);
        setShowScreening(false);
        setScreeningDtn('');
        setScreeningChecks({ meds: false, illness: false, lifestyle: false });
        fetchStats();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Network error.");
    } finally {
      setIsScreeningProcessing(false);
    }
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
            <button onClick={() => setShowScreening(true)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-sm">
              + Conduct Health Screening
            </button>
            <LogoutButton />
          </div>
        </div>

        {/* TOP STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-[#E04A75]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Raw Collections (Today)</span>
            <div className="text-4xl font-black text-slate-900 font-heading mt-2">{stats.raw_volume.toLocaleString()} mL</div>
            <span className="text-xs text-[#E04A75] font-bold mt-1 block">Awaiting Lab Processing</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Donors</span>
            <div className="text-4xl font-black text-slate-900 font-heading mt-2">{stats.active_donors}</div>
            <span className="text-xs text-emerald-600 font-bold mt-1 block">Cleared by Clinical Tests</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-indigo-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dispensed (This Month)</span>
            <div className="text-4xl font-black text-slate-900 font-heading mt-2">{stats.dispensed_volume.toLocaleString()} mL</div>
            <span className="text-xs text-indigo-600 font-bold mt-1 block">Successfully released to NICU</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-amber-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pasteurized Vault</span>
            <div className="text-4xl font-black text-slate-900 font-heading mt-2">{(stats.pasteurized_volume || 0).toLocaleString()} mL</div>
            <span className="text-xs text-amber-500 font-bold mt-1 block">Cleared & Available</span>
          </div>
        </div>

        {/* MAIN MODULES GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">

          {/* MODULE 1: CLINICAL INTAKE (RAW DONATIONS) */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[550px]">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-[#E04A75] font-heading mb-1">Human Milk Collection</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log fresh expressions from on-site appointments or walk-in donor drop-offs.
              </p>
            </div>

            <form className="space-y-6 flex-1 flex flex-col" onSubmit={(e) => { e.preventDefault(); handleLogDonation(e as any); }}>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Verify Appointment (DTN)</label>
                <input type="text" required value={dtnReference} onChange={(e) => setDtnReference(e.target.value)} placeholder="e.g. DTN-123456" className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-2 focus:ring-pink-100 transition-all uppercase font-mono bg-white shadow-inner" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Measured Vol (mL)</label>
                  <input type="number" required min="1" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="e.g. 150" className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-2 focus:ring-pink-100 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Collection Source</label>
                  <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm focus:border-[#E04A75] focus:ring-2 focus:ring-pink-100 transition-all bg-white">
                    <option value="In House">In House (Clinic Appt)</option>
                    <option value="Moms Act">Moms Act Drive</option>
                    <option value="Milky Way">Milky Way Campaign</option>
                    <option value="Hospital Transfer">External Hospital Transfer</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100">
                <label className="flex items-start gap-3 text-xs text-slate-700 font-medium cursor-pointer bg-amber-50 p-3 rounded-xl border border-amber-200 mb-4">
                  <input type="checkbox" required checked={confirmRisks} onChange={(e) => setConfirmRisks(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#E04A75]" />
                  <span>I confirm that I have interviewed the donor and there are no new health risks, infectious symptoms, or restricted medications since their last screening.</span>
                </label>
                <button type="submit" disabled={isLogging} className="w-full bg-[#1A1A1A] text-white py-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm flex justify-center items-center gap-2">
                  {isLogging ? 'Registering to Database...' : 'Log to Cold Storage & Print Label'}
                </button>
              </div>
            </form>
          </div>

          {/* MODULE 2: NICU DISPENSING */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[550px] overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-[#E04A75] font-heading mb-1">Milk Dispensing & Fulfillment</h3>
                  <p className="text-xs text-slate-500">Manage member requests and release safe biological batches.</p>
                </div>
              </div>
              <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                <button onClick={() => setActiveQueueTab('pending')} className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${activeQueueTab === 'pending' ? 'bg-[#E04A75] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Medical Reviews ({pendingQueue.length})</button>
                <button onClick={() => setActiveQueueTab('pickup')} className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${activeQueueTab === 'pickup' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Awaiting Pickup ({pickupQueue.length})</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                          <div>
                            <span className="block text-[9px] font-bold text-indigo-400 uppercase mb-0.5">Bottle</span>
                            <span className="text-xs font-semibold text-indigo-900 capitalize">
                              {req.bottle_type ? req.bottle_type.replace('_', ' ') : 'Ameda (Default)'}
                            </span>
                          </div>
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
                          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex justify-between items-center mb-4"><span className="text-[10px] font-bold text-emerald-800 uppercase">To Collect:</span><span className="text-sm font-black text-emerald-700">₱{req.computed_fee?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</span></div>
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

        {/* MODULE 3: TRIAGE & INTAKE REGISTRY (PURE WALK-IN ONLY) */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#E04A75] font-heading mb-1">Walk-In Triage & Intake Registry</h3>
              <p className="text-xs text-slate-500">Log unregistered walk-ins and triage urgencies to instantly generate their RTN/DTN tickets.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-8">
            <form className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100" onSubmit={(e) => { e.preventDefault(); handleInquirySubmit(e as any); }}>
              <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Inquiry Type</label>
                  <select value={inquiryForm.inquiry_type} onChange={(e) => setInquiryForm(p => ({ ...p, inquiry_type: e.target.value }))} className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75] bg-white">
                    <option value="Request Milk">🍼 Requesting Milk</option>
                    <option value="Donate">💝 Want to Donate</option>
                    <option value="General">ℹ️ General Question</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Urgency Level</label>
                  <select value={inquiryForm.priority} onChange={(e) => setInquiryForm(p => ({ ...p, priority: e.target.value }))} className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75] bg-white">
                    <option value="Standard">Standard (Normal)</option>
                    <option value="Emergency">🚨 Emergency (Immediate)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Requester Name</label><input type="text" required value={inquiryForm.requester_name} onChange={(e) => setInquiryForm(p => ({ ...p, requester_name: e.target.value }))} placeholder="e.g. Maria Santos" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75]" /></div>
                <div><label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Contact Details</label><input type="text" required value={inquiryForm.contact_info} onChange={(e) => setInquiryForm(p => ({ ...p, contact_info: e.target.value }))} placeholder="Phone or email" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75]" /></div>
              </div>
              
              {inquiryForm.inquiry_type === 'Request Milk' && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                    <div><label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Est. Vol (mL)</label><input type="number" required min="1" value={inquiryForm.required_volume} onChange={(e) => setInquiryForm(p => ({ ...p, required_volume: e.target.value }))} placeholder="250" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75]" /></div>
                    <div><label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Infant Gender</label><select value={inquiryForm.infant_gender} onChange={(e) => setInquiryForm(p => ({ ...p, infant_gender: e.target.value }))} className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75] bg-white"><option value="M">Male</option><option value="F">Female</option></select></div>
                    <div><label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Program</label><select value={inquiryForm.dispensing_program} onChange={(e) => setInquiryForm(p => ({ ...p, dispensing_program: e.target.value }))} className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75] bg-white"><option value="In House">In House</option><option value="Milky Way">Milky Way</option><option value="Donation">Donation</option><option value="POM">POM</option></select></div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Bottle Type</label>
                      <select value={inquiryForm.bottle_type} onChange={(e) => setInquiryForm(p => ({ ...p, bottle_type: e.target.value }))} className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm focus:border-[#E04A75] bg-white">
                        <option value="ameda">Ameda (+₱85)</option>
                        <option value="korea">Korea Spec (+₱65)</option>
                        <option value="red_cap">Red Cap (+₱40)</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" required checked={confirmDocs} onChange={(e) => setConfirmDocs(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#E04A75] rounded" />
                    <span className="text-xs text-slate-700 font-medium">I confirm the requester has presented a hard or soft copy of the required medical documents (Clinical Abstract & Prescription).</span>
                  </label>
                </div>
              )}

              <button type="submit" disabled={isSavingInquiry} className="w-full bg-[#1A1A1A] text-white py-3 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 mt-2 shadow-sm">{isSavingInquiry ? 'Logging Triage...' : 'Log Walk-In Request'}</button>
            </form>

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
                        <span className="text-[10px] text-slate-400 font-medium">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className={`font-bold ${item.status === 'Resolved' ? 'text-slate-500' : 'text-slate-800'}`}>{item.requester_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500">{item.contact_info}</span>
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">
                              Walk-in Guest
                            </span>
                          </div>
                        </div>
                        {item.required_volume && <div className="text-right"><span className="text-sm font-black text-[#E04A75]">{item.required_volume} mL</span></div>}
                      </div>

                      {item.status !== 'Resolved' && (
                        <div className="mt-4 pt-3 border-t border-slate-100/50">
                          {dispatchingId === item.inquiry_id ? (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 space-y-3">
                              <span className="text-[10px] font-black uppercase text-[#E04A75]">Fast Registration</span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input type="text" placeholder="First Name" required value={guestForm.first_name} onChange={(e) => setGuestForm(p => ({ ...p, first_name: e.target.value }))} className="text-xs p-2 rounded border border-slate-300 outline-none" />
                                <input type="text" placeholder="Last Name" required value={guestForm.last_name} onChange={(e) => setGuestForm(p => ({ ...p, last_name: e.target.value }))} className="text-xs p-2 rounded border border-slate-300 outline-none" />
                                <input type="date" required value={guestForm.dob} onChange={(e) => setGuestForm(p => ({ ...p, dob: e.target.value }))} className="text-xs p-2 rounded border border-slate-300 outline-none text-slate-500" />
                              </div>
                              <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setDispatchingId(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1">Cancel</button>
                                <button onClick={() => handleDispatchGuest(item.inquiry_id)} className="text-[10px] font-bold bg-[#E04A75] text-white px-3 py-1.5 rounded hover:bg-[#c83b62] shadow-sm">Confirm & Dispatch to Queue</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setDispatchingId(item.inquiry_id)} className="text-[10px] font-black bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded transition-colors shadow-sm">
                                ⚡ Register & Dispatch
                              </button>
                              <button onClick={() => handleResolveInquiry(item.inquiry_id)} className="text-[10px] font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded transition-colors shadow-sm">
                                Mark as Resolved
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TRACEABILITY SCANNER SECTION */}
        <div className="w-full">
          <TraceabilityScanner />
        </div>

      </div>

      {/* MILK LABEL MODAL */}
      {showLabel && <MilkLabelModal type="raw" data={labelData} onClose={() => setShowLabel(false)} />}

      {/* HEALTH SCREENING MODAL */}
      {showScreening && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight font-heading">Donor Health Screening</h2>
                  <p className="text-sm text-slate-500 mt-1">Confirm appointment status and clear donors for raw milk intake.</p>
                </div>
                <button
                  onClick={() => { setShowScreening(false); setScreeningDtn(''); setScreeningChecks({ meds: false, illness: false, lifestyle: false }); }}
                  className="text-slate-400 hover:text-slate-700 text-2xl font-bold leading-none mt-1"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleConfirmScreening} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Target Appointment (DTN)</label>
                  <input
                    type="text"
                    required
                    value={screeningDtn}
                    onChange={(e) => setScreeningDtn(e.target.value)}
                    placeholder="e.g. DTN-733986"
                    className="w-full border border-slate-300 p-4 rounded-xl outline-none text-lg font-mono uppercase focus:border-[#E04A75] focus:ring-2 focus:ring-pink-100 transition-all bg-slate-50"
                  />
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800">Verbal Questionnaire Checklist</h4>

                  <label className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={screeningChecks.meds} onChange={(e) => setScreeningChecks({ ...screeningChecks, meds: e.target.checked })} className="mt-1 h-5 w-5 accent-[#E04A75] rounded" />
                    <span className="text-sm text-slate-700">Donor confirms they have not taken any restricted medications or herbal supplements since their last clinical screening.</span>
                  </label>

                  <label className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={screeningChecks.illness} onChange={(e) => setScreeningChecks({ ...screeningChecks, illness: e.target.checked })} className="mt-1 h-5 w-5 accent-[#E04A75] rounded" />
                    <span className="text-sm text-slate-700">Donor is currently in good health and has not experienced any fever, infectious symptoms, or acute illness in the last 48 hours.</span>
                  </label>

                  <label className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={screeningChecks.lifestyle} onChange={(e) => setScreeningChecks({ ...screeningChecks, lifestyle: e.target.checked })} className="mt-1 h-5 w-5 accent-[#E04A75] rounded" />
                    <span className="text-sm text-slate-700">Donor confirms no new tattoos, piercings, or high-risk lifestyle exposures within the last 6 months.</span>
                  </label>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={!allScreeningChecked || isScreeningProcessing}
                    className="w-full bg-[#E04A75] text-white py-4 rounded-xl font-bold hover:bg-[#c83b62] transition-colors disabled:opacity-50 shadow-md"
                  >
                    {isScreeningProcessing ? 'Confirming...' : 'Approve Appointment & Clear for Intake'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}