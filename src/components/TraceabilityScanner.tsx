'use client';
import { useState } from 'react';

export default function TraceabilityScanner() {
  const [search, setSearch] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) return;
    
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/trace?q=${encodeURIComponent(search)}`);
      const result = await res.json();
      
      if (res.ok) {
        setData(result.batch);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to connect to tracing database.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 font-heading mb-1">Asset Traceability Engine</h3>
      <p className="text-xs text-slate-500 mb-4">Search a Batch ID to view its complete chain of custody and thermal history.</p>
      
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input 
          type="text" 
          placeholder="e.g. BATCH-12 or just 12" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-slate-300 p-3 rounded-lg outline-none text-sm focus:border-indigo-500 uppercase" 
        />
        <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Scanning...' : 'Trace Asset'}
        </button>
      </form>

      {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg mb-4">{error}</div>}

      {data && (
        <div className="space-y-6 border-t border-slate-100 pt-6">
          
          {/* STEP 1: RAW COLLECTION */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center text-[10px] font-black text-amber-600">1</div>
              <div className="w-0.5 h-full bg-slate-200 mt-2"></div>
            </div>
            <div className="pb-4">
              <h4 className="text-sm font-bold text-slate-800">Raw Milk Collection</h4>
              <p className="text-xs text-slate-500 mt-1">Donors who contributed to this pooled batch:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.Raw_Collections.map((col: any) => (
                  <span key={col.collection_id} className="bg-amber-50 text-amber-700 text-[10px] px-2 py-1 rounded font-bold border border-amber-200">
                    Donor {col.donor?.tracking_no || 'Unknown'} (+{col.raw_volume_ml}mL)
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* STEP 2: PASTEURIZATION */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-orange-100 border-2 border-orange-500 flex items-center justify-center text-[10px] font-black text-orange-600">2</div>
              <div className="w-0.5 h-full bg-slate-200 mt-2"></div>
            </div>
            <div className="pb-4">
              <h4 className="text-sm font-bold text-slate-800">Thermal Pasteurization</h4>
              <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 grid grid-cols-2 gap-2">
                <div><span className="font-bold">Total Volume:</span> {data.pooled_volume} mL</div>
                <div><span className="font-bold">Temperature:</span> {data.pasteurization_temp || 'N/A'} °C</div>
                <div><span className="font-bold">Duration:</span> {data.pasteurization_time || 'N/A'} Mins</div>
                <div><span className="font-bold">Status:</span> {data.lab_status}</div>
                {data.safety_flags && <div className="col-span-2 text-red-600 font-bold bg-red-50 p-1 rounded mt-1">Alert: {data.safety_flags}</div>}
              </div>
            </div>
          </div>

          {/* STEP 3: DISPENSING */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-[10px] font-black text-emerald-600">3</div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">NICU Release & Dispensing</h4>
              {data.Transactions.length === 0 ? (
                <p className="text-xs text-slate-500 mt-1">This batch has not been dispensed yet.</p>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  {data.Transactions.map((tx: any) => (
                    <div key={tx.trans_id} className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-xs">
                      <span className="font-bold text-emerald-700">Released {tx.dispensed_vol}mL</span> to Receiver {tx.receiver?.tracking_no} on {new Date(tx.timestamp).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}