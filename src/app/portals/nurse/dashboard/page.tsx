'use client';
import Link from 'next/link';

export default function NurseDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 flex font-body">
      {/* MAIN CONTENT */}
      <div className="flex-1 p-8 lg:p-10 overflow-y-auto h-screen">
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
            <div className="text-4xl font-black text-slate-800 font-heading mt-2">480 mL</div>
            <span className="text-xs text-[#E04A75] font-bold mt-1 block">Awaiting Lab Pooling</span>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Donors</span>
            <div className="text-4xl font-black text-slate-800 font-heading mt-2">124</div>
            <span className="text-xs text-emerald-500 font-bold mt-1 block">Cleared by Clinical Tests</span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-blue-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dispensed (This Month)</span>
            <div className="text-4xl font-black text-slate-800 font-heading mt-2">3,200 mL</div>
            <span className="text-xs text-blue-500 font-bold mt-1 block">Successfully released to NICU</span>
          </div>
        </div>

        {/* MAIN MODULES GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* MODULE 1: LOG RAW DONATION (Based on Appendix I) */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-[#E04A75] font-heading mb-1">Log Raw Donation Session</h3>
            <p className="text-xs text-slate-500 mb-6">Record expressed milk volumes collected under City campaigns.</p>
            
            <form className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Select Donor Profile (MTN)</label>
                <input type="text" placeholder="e.g. MTN-4001" className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]" />
              </div>

              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Volume (mL)</label>
                  <input type="number" placeholder="e.g. 150" className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]" />
                </div>
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Advocacy Source</label>
                  <select className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]">
                    {/* Sourced directly from Appendix I */}
                    <option value="in_house">I. In House</option>
                    <option value="moms_act">II. Moms Act</option>
                    <option value="milky_way">III. Milky Way</option>
                    <option value="supsup_todo">IV. SUPSUP TODO</option>
                    <option value="others">V. Others</option>
                  </select>
                </div>
              </div>

              <button type="button" className="w-full bg-[#FFF0F3] text-[#E04A75] border border-[#FFDEE4] py-3 rounded-lg font-bold text-sm hover:bg-[#FFDEE4] transition-colors mt-2">
                Record Session & Print Unpasteurized Label
              </button>
            </form>
          </div>

          {/* MODULE 2: DISPENSING DESK (Based on Appendix K) */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-[#E04A75] font-heading mb-1">Dispensing & Fulfillment Desk</h3>
            <p className="text-xs text-slate-500 mb-6">Release safe biological milk batches to prescribed recipients.</p>
            
            <form className="space-y-5">
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Receiver Account (MTN)</label>
                  <input type="text" placeholder="e.g. MTN-7001" className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]" />
                </div>
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Volume to Release (mL)</label>
                  <input type="number" placeholder="e.g. 100" className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm placeholder-slate-400 focus:border-[#E04A75] focus:ring-1 focus:ring-[#E04A75]" />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Hospital Served</label>
                  <select className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm focus:border-[#E04A75]">
                    <option value="within_makati">w/in Makati</option>
                    <option value="outside_makati">outside Makati</option>
                    <option value="discharged">Discharged</option>
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Bottle Type</label>
                  <select className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm focus:border-[#E04A75]">
                    {/* Sourced directly from Appendix K */}
                    <option value="ameda">Ameda</option>
                    <option value="korea">Korea</option>
                    <option value="red_cap">Red Cap</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center mt-2">
                 <span className="text-xs text-slate-500 font-bold uppercase">Computed Processing Rates</span>
                 <span className="text-sm font-black text-slate-800 font-heading">₱0.00</span>
              </div>

              <button type="button" className="w-full bg-[#E04A75] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#C93660] transition-colors">
                Approve Clinical Release
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}