'use client';
import { useState, useEffect } from 'react';
import MilkLabelModal from '@/components/MilkLabelModal';

type MilkRequest = {
  rtn: string; mtn: string; requested_volume: number; hospital: string;
  status: 'pending' | 'approved' | 'arriving'; computed_fee?: number;
  created_at: string; rtn_abstract?: string; rtn_prescription?: string;
  bottle_type: string; infant_gender: string; dispensing_program: string;
};

export default function CollectingAndDispensingDashboard() {
  const [stats, setStats] = useState({ raw_volume: 0, active_donors: 0, dispensed_volume: 0, pasteurized_volume: 0 });
  const [dtnReference, setDtnReference] = useState('');
  const [volume, setVolume] = useState('');
  const [source, setSource] = useState('In House');
  const [confirmRisks, setConfirmRisks] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  // New states for the Appointments Queue
  const [activeCollectionTab, setActiveCollectionTab] = useState<'log' | 'appointments'>('log');
  const [appointments, setAppointments] = useState<any[]>([]);

  const [activeQueueTab, setActiveQueueTab] = useState<'pending' | 'pickup'>('pending');
  const [requests, setRequests] = useState<MilkRequest[]>([]);
  const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null);
  const [approvedVolume, setApprovedVolume] = useState('');
  const [showLabel, setShowLabel] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);

  // --- THE FIX: Block Next.js Caching ---
  const fetchStats = async () => {
    try { const res = await fetch('/api/nurse/stats', { cache: 'no-store' });
    if (res.ok) setStats(await res.json()); } catch (e) {}
  };

  const fetchRequests = async () => {
    try { const res = await fetch('/api/nurse/requests', { cache: 'no-store' });
    if (res.ok) setRequests(await res.json()); } catch (e) {}
  };

  const fetchAppointments = async () => {
    try { const res = await fetch('/api/nurse/appointments', { cache: 'no-store' });
    if (res.ok) setAppointments(await res.json()); } catch (e) {}
  };

  useEffect(() => {
    fetchStats();
    fetchRequests();
    fetchAppointments();
  }, []);

  // --- THE FIX: Secure Document Viewer for JPGs & PDFs ---
  const openDocument = (base64Data: string | undefined) => {
    if (!base64Data) return;
    try {
      if (!base64Data.startsWith('data:')) {
        window.open(base64Data, '_blank');
        return;
      }
      const arr = base64Data.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) return;
      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Cleanup the temporary file from memory after 10 seconds
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error(e);
      alert("Failed to load document.");
    }
  };

  const handleApproveAppointment = async (dtn: string) => {
    try {
      const res = await fetch('/api/nurse/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtn })
      });
      if (res.ok) {
        alert("Appointment Confirmed! Member has been notified to proceed.");
        fetchAppointments();
      } else { alert("Failed to confirm appointment."); }
    } catch (e) {}
  };

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
      const res = await fetch('/api/nurse/dispense', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mtn, volume: finalVolume, hospital: 'pre-approved', bottleType, cost: finalFee, rtn }) });
      if (res.ok) { alert(`Success!`); fetchRequests(); fetchStats(); } else { alert(`Error: ${(await res.json()).error}`); }
    } catch (e: any) { alert(`Failed: ${e.message}`); } finally { setIsProcessingRequest(null); }
  };

  const pendingQueue = requests.filter(r => r.status === 'pending');
  const pickupQueue = requests.filter(r => r.status === 'approved' || r.status === 'arriving');

  return (
    <div className="min-h-screen bg-slate-50 flex font-body text-slate-800 pb-12">
      <div className="w-full max-w-7xl mx-auto p-8 lg:p-10">

        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">Collecting & Dispensing Overview</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">Manage daily donor collections and NICU dispensing queues.</p>
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
          <div id="collecting" className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[550px] overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-black text-[#E04A75] font-heading mb-1">Human Milk Collection</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Log fresh expressions or approve incoming schedules.</p>
              </div>
              <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                <button onClick={() => setActiveCollectionTab('log')} className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${activeCollectionTab === 'log' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Log Intake</button>
                <button onClick={() => setActiveCollectionTab('appointments')} className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${activeCollectionTab === 'appointments' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Pending Schedules ({appointments.length})</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              
              {activeCollectionTab === 'log' && (
                <form className="space-y-6 flex flex-col h-full" onSubmit={handleLogDonation}>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Verify Confirmed DTN</label>
                    <input type="text" required value={dtnReference} onChange={(e) => setDtnReference(e.target.value)} placeholder="e.g. DTN-123456" className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-2 focus:ring-pink-100 transition-all uppercase font-mono bg-slate-50" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Measured Vol (mL)</label>
                      <input type="number" required min="1" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="e.g. 150" className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-2 focus:ring-pink-100 transition-all bg-white shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Collection Source</label>
                      <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm focus:border-[#E04A75] focus:ring-2 focus:ring-pink-100 transition-all bg-white shadow-sm">
                        <option value="In House">In House (Clinic Appt)</option>
                        <option value="Moms Act">Moms Act Drive</option>
                        <option value="Milky Way">Milky Way Campaign</option>
                        <option value="Hospital Transfer">External Hospital Transfer</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-200">
                    <label className="flex items-start gap-3 text-xs text-slate-700 font-medium cursor-pointer bg-white p-4 rounded-xl border border-slate-200 mb-4 shadow-sm">
                      <input type="checkbox" required checked={confirmRisks} onChange={(e) => setConfirmRisks(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#E04A75]" />
                      <span>I confirm that I have interviewed the donor and there are no new health risks, infectious symptoms, or restricted medications since their last screening.</span>
                    </label>
                    <button type="submit" disabled={isLogging} className="w-full bg-[#1A1A1A] text-white py-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm flex justify-center items-center gap-2">
                      {isLogging ? 'Registering to Database...' : 'Log to Cold Storage & Print Label'}
                    </button>
                  </div>
                </form>
              )}

              {activeCollectionTab === 'appointments' && (
                <div className="space-y-4">
                  {appointments.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-medium">No pending appointment schedules.</div>
                  ) : (
                    appointments.map(appt => (
                      <div key={appt.appointment_id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-800">{appt.dtn}</span>
                            <span className="block text-[10px] text-slate-400 uppercase mt-0.5">Member: {appt.donor?.tracking_no}</span>
                          </div>
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-0.5 rounded">Requested Date</span>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 mb-4">
                          <span className="block text-[11px] font-bold text-amber-800 mb-1">
                            {new Date(appt.appointment_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-xs text-amber-600 font-medium">Method: {appt.collection_method}</span>
                        </div>
                        <button onClick={() => handleApproveAppointment(appt.dtn)} className="w-full bg-amber-500 text-white text-xs font-bold py-3 rounded-xl hover:bg-amber-600 transition-colors shadow-sm">
                          Approve Schedule & Notify Member
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* MODULE 2: MILK DISPENSING */}
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
                          <button disabled={!req.rtn_abstract} onClick={() => openDocument(req.rtn_abstract)} className="flex-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 py-1.5 rounded hover:bg-indigo-100 transition-colors disabled:opacity-50">📄 View Abstract</button>
                          <button disabled={!req.rtn_prescription} onClick={() => openDocument(req.rtn_prescription)} className="flex-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 py-1.5 rounded hover:bg-indigo-100 transition-colors disabled:opacity-50">📄 View Prescription</button>
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
      </div>

      {/* MILK LABEL MODAL */}
      {showLabel && <MilkLabelModal type="raw" data={labelData} onClose={() => setShowLabel(false)} />}
    </div>
  );
}