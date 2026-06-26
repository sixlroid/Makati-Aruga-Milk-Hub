'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import MilkLabelModal from '@/components/MilkLabelModal';

export default function NurseDashboard() {
  // --- STATS STATE ---
  const [stats, setStats] = useState({
    raw_volume: 0,
    active_donors: 0,
    dispensed_volume: 0
  });

  // --- RAW DONATION STATES ---
  const [donorMtn, setDonorMtn] = useState('');
  const [volume, setVolume] = useState('');
  const [source, setSource] = useState('I. In House');
  const [isLogging, setIsLogging] = useState(false);

  // --- NEW: DISPENSING STATES ---
  const [receiverMtn, setReceiverMtn] = useState('');
  const [dispenseVolume, setDispenseVolume] = useState('');
  const [hospital, setHospital] = useState('within_makati');
  const [bottleType, setBottleType] = useState('ameda');
  const [isDispensing, setIsDispensing] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [inquiryForm, setInquiryForm] = useState({ requester_name: '', contact_info: '', required_volume: '' });
  const [isSavingInquiry, setIsSavingInquiry] = useState(false);
  const RATE_PER_ML = 2.0;
  const BOTTLE_DEPOSIT = 50;
  const computedCost = hospital === 'outside_makati'
    ? (Number(dispenseVolume) || 0) * RATE_PER_ML + BOTTLE_DEPOSIT
    : 0;

  // --- FETCH STATS ON LOAD ---
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/nurse/stats');
      if (res.ok) setStats(await res.json());
    } catch (error) {
      console.error("Failed to load stats", error);
    }
  };

  const fetchInquiries = async () => {
    try {
      const res = await fetch('/api/inquiries');
      if (res.ok) setInquiries(await res.json());
    } catch (error) {
      console.error('Failed to load inquiries', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchInquiries();
  }, []);

  // --- HANDLER: LOG RAW DONATION ---
  const handleLogDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLogging(true);
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mtn: donorMtn, volume: volume, source: source })
      });
      const data = await response.json();
      if (response.ok) {
        // Pop open the printable label!
        setLabelData({ mtn: donorMtn, volume: volume });
        setShowLabel(true);
        
        // Clear the form
        setDonorMtn('');
        setVolume('');
        fetchStats(); // Refresh stats!
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Submission failed: ${error.message}`);
    } finally {
      setIsLogging(false);
    }
  };

  // --- NEW HANDLER: DISPENSE MILK ---
  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispensing(true);
    try {
      const response = await fetch('/api/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mtn: receiverMtn, 
          volume: dispenseVolume, 
          hospital: hospital, 
          bottleType: bottleType,
          cost: computedCost 
        })
      });
      const data = await response.json();
      if (response.ok) {
        alert(`Success: ${data.message}`);
        setReceiverMtn('');
        setDispenseVolume('');
        fetchStats(); // Refresh stats so Dispensed Volume ticks up!
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Submission failed: ${error.message}`);
    } finally {
      setIsDispensing(false);
    }
  };

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
    <div className="min-h-screen bg-slate-50 flex font-body">
      <div className="flex-1 p-8 lg:p-10 overflow-y-auto h-screen">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 font-heading">Nurse Station Overview</h1>
            <p className="text-sm text-slate-500 mt-1">Manage donor collections, screenings, and NICU dispensing.</p>
          </div>
          <Link href="/portals/nurse/screenings/new">
            <button className="bg-[#1A1A1A] text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors shadow-sm">
              + Conduct Health Screening
            </button>
          </Link>
        </div>

        {/* TOP STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-[#E04A75]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Raw Collections (Today)</span>
            <div className="text-4xl font-black text-slate-800 font-heading mt-2">{stats.raw_volume} mL</div>
            <span className="text-xs text-[#E04A75] font-bold mt-1 block">Awaiting Lab Pooling</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Donors</span>
            <div className="text-4xl font-black text-slate-800 font-heading mt-2">{stats.active_donors}</div>
            <span className="text-xs text-emerald-500 font-bold mt-1 block">Cleared by Clinical Tests</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-blue-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dispensed (This Month)</span>
            <div className="text-4xl font-black text-slate-800 font-heading mt-2">{stats.dispensed_volume} mL</div>
            <span className="text-xs text-blue-500 font-bold mt-1 block">Successfully released to NICU</span>
          </div>
        </div>

        {/* MAIN MODULES GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* MODULE 1: LOG RAW DONATION */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-[#E04A75] font-heading mb-1">Log Raw Donation Session</h3>
            <p className="text-xs text-slate-500 mb-6">Record expressed milk volumes collected under City campaigns.</p>
            
            <form className="space-y-5 flex-1 flex flex-col" onSubmit={handleLogDonation}>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Select Donor Profile (MTN)</label>
                <input type="text" required value={donorMtn} onChange={(e) => setDonorMtn(e.target.value)} placeholder="e.g. MID-1024" className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75] uppercase" />
              </div>
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Volume (mL)</label>
                  <input type="number" required min="1" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="e.g. 150" className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]" />
                </div>
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Advocacy Source</label>
                  <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]">
                    <option value="I. In House">I. In House</option>
                    <option value="II. Moms Act">II. Moms Act</option>
                    <option value="III. Milky Way">III. Milky Way</option>
                    <option value="IV. SUPSUP TODO">IV. SUPSUP TODO</option>
                    <option value="V. Others">V. Others</option>
                  </select>
                </div>
              </div>
              <div className="mt-auto pt-4">
                <button type="submit" disabled={isLogging} className="w-full bg-[#FFF0F3] text-[#E04A75] border border-[#FFDEE4] py-3 rounded-lg font-bold text-sm hover:bg-[#FFDEE4] transition-colors disabled:opacity-50">
                  {isLogging ? 'Logging...' : 'Record Session & Print Label'}
                </button>
              </div>
            </form>
          </div>

          {/* MODULE 2: DISPENSING DESK */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-[#E04A75] font-heading mb-1">Dispensing & Fulfillment Desk</h3>
            <p className="text-xs text-slate-500 mb-6">Release safe biological milk batches to prescribed recipients.</p>
            
            <form className="space-y-5 flex-1 flex flex-col" onSubmit={handleDispense}>
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Receiver Account (MTN)</label>
                  <input type="text" required value={receiverMtn} onChange={(e) => setReceiverMtn(e.target.value)} placeholder="e.g. MID-7001" className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75] uppercase" />
                </div>
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Volume to Release (mL)</label>
                  <input type="number" required min="1" value={dispenseVolume} onChange={(e) => setDispenseVolume(e.target.value)} placeholder="e.g. 100" className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]" />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Hospital Served</label>
                  <select value={hospital} onChange={(e) => setHospital(e.target.value)} className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]">
                    <option value="within_makati">w/in Makati (Subsidized)</option>
                    <option value="outside_makati">outside Makati (Standard Rate)</option>
                    <option value="discharged">Discharged</option>
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Bottle Type</label>
                  <select value={bottleType} onChange={(e) => setBottleType(e.target.value)} className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]">
                    <option value="ameda">Ameda</option>
                    <option value="korea">Korea</option>
                    <option value="red_cap">Red Cap</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* DYNAMIC PRICE CALCULATOR */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 transition-all mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase">Computed Processing Rates</span>
                  <span className="text-lg font-black text-slate-800 font-heading">
                    ₱{computedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Standard rate: ₱2.00 per mL plus a bottle deposit fee.</p>
              </div>

              <div className="mt-auto pt-4">
                <button type="submit" disabled={isDispensing} className="w-full bg-[#E04A75] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#C93660] transition-colors disabled:opacity-50">
                  {isDispensing ? 'Processing Release...' : 'Approve Clinical Release'}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* MODULE 3: INQUIRIES & INTAKE REGISTRY */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#E04A75] font-heading mb-1">Inquiries & Intake Registry</h3>
              <p className="text-xs text-slate-500">Log phone or walk-in requests for milk, capture contact details, and save the target volume.</p>
            </div>
          </div>

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
              <div className="space-y-2 max-h-[320px] overflow-auto">
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
      {/* SHOW PRINT MODAL IF TRIGGERED */}
      {showLabel && (
        <MilkLabelModal 
          type="raw" 
          data={labelData} 
          onClose={() => setShowLabel(false)} 
        />
      )}
    </div>
  );
}