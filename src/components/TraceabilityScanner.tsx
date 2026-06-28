'use client';
import { useState } from 'react';

export default function TraceabilityScanner() {
  const [search, setSearch] = useState('');
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) return;
    
    setLoading(true);
    setError(null);
    setBatches([]);

    try {
      const res = await fetch(`/api/trace?q=${encodeURIComponent(search)}`);
      const result = await res.json();
      
      if (res.ok) {
        setBatches(result.batches);
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
      <p className="text-xs text-slate-500 mb-4">Search by Volume (mL) to view matching batches and their chain of custody.</p>
      
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input 
          type="number" 
          placeholder="Enter Volume (e.g. 150)" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-slate-300 p-3 rounded-lg outline-none text-sm focus:border-indigo-500 font-mono" 
        />
        <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 shadow-sm">
          {loading ? 'Scanning...' : 'Search Inventory'}
        </button>
      </form>

      {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg mb-4">{error}</div>}

      {batches.length > 0 && (
        <div className="space-y-6">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Found {batches.length} Batch{batches.length > 1 ? 'es' : ''} matching {search} mL
          </div>
          
          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {batches.map((data) => (
              <div key={data.batch_id} className="border border-slate-200 rounded-xl p-6 bg-slate-50 shadow-sm">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                  <h4 className="font-black text-indigo-900 font-heading text-lg">Batch #{data.batch_id}</h4>
                  <span className="bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-md text-xs">
                    {data.pooled_volume} mL
                  </span>
                </div>

                <div className="space-y-6">
                  {/* STEP 1: RAW COLLECTION */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center text-[10px] font-black text-amber-600">1</div>
                      <div className="w-0.5 h-full bg-slate-200 mt-2"></div>
                    </div>
                    <div className="pb-4 w-full">
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
                      {data.lab_status !== 'Discarded' && <div className="w-0.5 h-full bg-slate-200 mt-2"></div>}
                    </div>
                    <div className="pb-4 w-full">
                      <h4 className="text-sm font-bold text-slate-800">Thermal Pasteurization</h4>
                      <div className="mt-2 bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-600 grid grid-cols-2 gap-2 shadow-sm">
                        <div><span className="font-bold">Temperature:</span> {data.pasteurization_temp || '--'} °C</div>
                        <div><span className="font-bold">Duration:</span> {data.pasteurization_time || '--'} Mins</div>
                        <div className="col-span-2">
                          <span className="font-bold">Status: </span> 
                          <span className={data.lab_status === 'Discarded' || data.lab_status === 'Flagged' ? 'text-red-600 font-black' : 'text-emerald-600 font-bold'}>
                            {data.lab_status}
                          </span>
                        </div>
                        {data.safety_flags && <div className="col-span-2 text-red-600 font-bold bg-red-50 p-2 rounded mt-1 border border-red-100">Alert: {data.safety_flags}</div>}
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: CONDITIONAL DISPENSING OR DESTROYED */}
                  {data.lab_status === 'Discarded' ? (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center text-[10px] font-black text-red-600">X</div>
                      </div>
                      <div className="w-full">
                        <h4 className="text-sm font-black text-red-700">Batch Destroyed</h4>
                        <div className="mt-2 bg-red-50 p-3 rounded-lg border border-red-200 text-xs text-red-700 shadow-sm">
                          This batch failed biological quality assurance and was safely discarded. It was never cleared for NICU dispensing.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-[10px] font-black text-emerald-600">3</div>
                      </div>
                      <div className="w-full">
                        <h4 className="text-sm font-bold text-slate-800">NICU Release & Dispensing</h4>
                        {data.Transactions.length === 0 ? (
                          <p className="text-xs text-slate-500 mt-1">This batch has not been dispensed yet.</p>
                        ) : (
                          <div className="mt-2 flex flex-col gap-2">
                            {data.Transactions.map((tx: any) => (
                              <div key={tx.trans_id} className="bg-white p-3 rounded-lg border border-emerald-200 text-xs shadow-sm">
                                <span className="font-bold text-emerald-700">Released {tx.dispensed_vol}mL</span> to Receiver {tx.receiver?.tracking_no} on {new Date(tx.timestamp).toLocaleDateString()}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}