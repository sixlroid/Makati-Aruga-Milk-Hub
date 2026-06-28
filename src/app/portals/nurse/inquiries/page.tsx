'use client';
import { useState, useEffect } from 'react';
import TraceabilityScanner from '@/components/TraceabilityScanner';

export default function NurseInquiries() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [isSavingInquiry, setIsSavingInquiry] = useState(false);
  const [confirmDocs, setConfirmDocs] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);
  const [guestForm, setGuestForm] = useState({ first_name: '', last_name: '', dob: '' });

  const [inquiryForm, setInquiryForm] = useState({
    requester_name: '', contact_info: '', inquiry_type: 'Request Milk',
    priority: 'Standard', required_volume: '', infant_gender: 'M', dispensing_program: 'In House', bottle_type: 'ameda'
  });

  const fetchInquiries = async () => {
    try {
      const res = await fetch('/api/inquiries');
      if (res.ok) setInquiries(await res.json());
    } catch (error) {
      console.error('Failed to load inquiries', error);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

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
        setInquiries(prev => prev.map(inq => inq.inquiry_id === inquiry_id ? { ...inq, status: 'Resolved' } : inq));
        fetchInquiries();
      } else {
        alert(`Error: ${data.error || "System Error."}`);
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body p-8 lg:p-10 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800 font-heading tracking-tight">Inquiries & Traceability</h1>
          <p className="text-sm text-slate-500 mt-1">Manage walk-ins, log requests, and track physical milk supply lines.</p>
        </div>

        {/* TRACEABILITY SCANNER */}
        <div className="w-full mb-8">
          <TraceabilityScanner />
        </div>

        {/* WALK-IN TRIAGE */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#E04A75] font-heading mb-1">Walk-In Triage & Intake Registry</h3>
              <p className="text-xs text-slate-500">Log unregistered walk-ins and triage urgencies to instantly generate their RTN/DTN tickets.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-8">
            <form className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100" onSubmit={handleInquirySubmit}>
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
                    <span className="text-xs text-slate-700 font-medium">I confirm the requester has presented a hard or soft copy of the required medical documents (Clinical Abstract & Prescription). [cite: 117]</span>
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
                  <div className="text-center py-8 text-sm text-slate-400">No walk-ins on the board. [cite: 120]</div>
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
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">Walk-in Guest [cite: 125]</span>
                          </div>
                        </div>
                        {item.required_volume && <div className="text-right"><span className="text-sm font-black text-[#E04A75]">{item.required_volume} mL</span></div>}
                      </div>

                      {item.status !== 'Resolved' && (
                        <div className="mt-4 pt-3 border-t border-slate-100/50">
                          {dispatchingId === item.inquiry_id ? (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 space-y-3">
                              <span className="text-[10px] font-black uppercase text-[#E04A75]">Fast Registration [cite: 128]</span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input type="text" placeholder="First Name" required value={guestForm.first_name} onChange={(e) => setGuestForm(p => ({ ...p, first_name: e.target.value }))} className="text-xs p-2 rounded border border-slate-300 outline-none" />
                                <input type="text" placeholder="Last Name" required value={guestForm.last_name} onChange={(e) => setGuestForm(p => ({ ...p, last_name: e.target.value }))} className="text-xs p-2 rounded border border-slate-300 outline-none" />
                                <input type="date" required value={guestForm.dob} onChange={(e) => setGuestForm(p => ({ ...p, dob: e.target.value }))} className="text-xs p-2 rounded border border-slate-300 outline-none text-slate-500" />
                              </div>
                              <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setDispatchingId(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1">Cancel</button>
                                <button onClick={() => handleDispatchGuest(item.inquiry_id)} className="text-[10px] font-bold bg-[#E04A75] text-white px-3 py-1.5 rounded hover:bg-[#c83b62] shadow-sm">Confirm & Dispatch to Queue [cite: 131]</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setDispatchingId(item.inquiry_id)} className="text-[10px] font-black bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded transition-colors shadow-sm">⚡ Register & Dispatch [cite: 133]</button>
                              <button onClick={() => handleResolveInquiry(item.inquiry_id)} className="text-[10px] font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded transition-colors shadow-sm">Mark as Resolved [cite: 134]</button>
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

      </div>
    </div>
  );
}