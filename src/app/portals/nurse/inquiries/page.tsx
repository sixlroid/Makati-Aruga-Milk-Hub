'use client';
import { useState, useEffect } from 'react';

export default function NurseInquiries() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [inquiryForm, setInquiryForm] = useState({ requester_name: '', contact_info: '', required_volume: '' });
  const [isSavingInquiry, setIsSavingInquiry] = useState(false);

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
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_name: inquiryForm.requester_name,
          contact_info: inquiryForm.contact_info,
          required_volume: inquiryForm.required_volume
        })
      });
      const data = await response.json();
      if (response.ok) {
        setInquiries(prev => [data.inquiry, ...prev].slice(0, 10));
        setInquiryForm({ requester_name: '', contact_info: '', required_volume: '' });
        alert('Inquiry saved successfully.');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Submission failed: ${error.message}`);
    } finally {
      setIsSavingInquiry(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body p-8 lg:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 font-heading">Inquiries & Intake Registry</h1>
          <p className="text-sm text-slate-500 mt-1">Log phone or walk-in requests for milk, capture contact details, and save the target volume.</p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
            <form className="space-y-4" onSubmit={handleInquirySubmit}>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Requester Name</label>
                <input type="text" required value={inquiryForm.requester_name} onChange={(e) => setInquiryForm(prev => ({ ...prev, requester_name: e.target.value }))} placeholder="e.g. Maria Santos" className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Contact Details</label>
                <input type="text" required value={inquiryForm.contact_info} onChange={(e) => setInquiryForm(prev => ({ ...prev, contact_info: e.target.value }))} placeholder="Phone, email, or address" className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Target Volume (mL)</label>
                <input type="number" required min="1" value={inquiryForm.required_volume} onChange={(e) => setInquiryForm(prev => ({ ...prev, required_volume: e.target.value }))} placeholder="e.g. 250" className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]" />
              </div>
              <button type="submit" disabled={isSavingInquiry} className="w-full bg-[#1A1A1A] text-white py-3 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50">
                {isSavingInquiry ? 'Saving inquiry...' : 'Save Inquiry'}
              </button>
            </form>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-800">Recent Intake Requests</h4>
                <span className="text-[11px] text-slate-500">Latest 10</span>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {inquiries.length === 0 ? (
                  <div className="text-sm text-slate-500">No inquiries logged yet.</div>
                ) : (
                  inquiries.map((item) => (
                    <div key={item.inquiry_id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex justify-between gap-3 items-start">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.requester_name}</p>
                          <p className="text-xs text-slate-500 mt-1">{item.contact_info}</p>
                        </div>
                        <span className="text-xs font-bold text-[#E04A75]">{item.required_volume} mL</span>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500">
                        <span>{item.status}</span>
                        <span>{new Date(item.created_at || item.timestamp || Date.now()).toLocaleDateString()}</span>
                      </div>
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