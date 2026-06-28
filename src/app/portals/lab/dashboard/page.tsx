'use client';
import { useState, useEffect } from 'react';
import MilkLabelModal from '@/components/MilkLabelModal';
import LogoutButton from '@/components/LogoutButton';
import TraceabilityScanner from '@/components/TraceabilityScanner';

export default function LabDashboard() {
  const [stats, setStats] = useState({
    pending_raw_ml: 0,
    total_pasteurized_ml: 0,
    active_batch_count: 0
  });
  
  const [quarantineQueue, setQuarantineQueue] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qaProcessingId, setQaProcessingId] = useState<number | null>(null);

  // Label Modal state controls
  const [showLabel, setShowLabel] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);

  // --- TRANSPLANTED PASTEURIZATION STATES ---
  const [pendingProcessingBatches, setPendingProcessingBatches] = useState<any[]>([]);
  const [processingInputs, setProcessingInputs] = useState<Record<string, { temp: string, time: string, mbt: string }>>({});

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch('/api/lab/stats');
      if (statsRes.ok) setStats(await statsRes.json());

      const qaRes = await fetch('/api/lab/qa');
      if (qaRes.ok) setQuarantineQueue(await qaRes.json());
      
      fetchProcessingBatches(); // Refresh the new transplanted module
    } catch (error) {
      console.error("Data tracking refresh failed", error);
    }
  };

  // Fetch specifically for the Pasteurization Module
  const fetchProcessingBatches = async () => {
    try {
      const res = await fetch('/api/batches/pending');
      if (res.ok) setPendingProcessingBatches(await res.json());
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- TRANSPLANTED PASTEURIZATION SUBMIT HANDLER ---
  const handleProcessBatch = async (batchId: number) => {
    const inputs = processingInputs[batchId] || { temp: '62.5', time: '30', mbt: 'Passed' };
    setIsProcessing(true);
    try {
      const res = await fetch('/api/batches/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: batchId,
          temp: inputs.temp,
          time: inputs.time,
          mbt_result: inputs.mbt
        })
      });
      if (res.ok) {
        alert("✅ Batch pasteurization & QA logged successfully.");
        fetchProcessingBatches();
        fetchDashboardData(); // Refresh stats
      } else { 
        alert("Error processing batch."); 
      }
    } catch(e) { 
      alert("Network error."); 
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQaDecision = async (batchId: number, decision: 'Passed' | 'Failed') => {
    setQaProcessingId(batchId);
    try {
      const response = await fetch('/api/lab/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, decision })
      });
      const data = await response.json();

      if (response.ok) {
        alert(`Clearance Updated: ${data.message}`);
        fetchDashboardData(); 
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("System failed to log testing verdict.");
    } finally {
      setQaProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-body relative text-slate-800">
      <div className="flex-1 p-8 lg:p-10 overflow-y-auto h-screen max-w-[1600px] mx-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#E04A75] mb-1">Processing Center</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">Laboratory Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">Run selective pipelines, verify biological assays, and clear safe milk assets for NICU distribution.</p>
          </div>
          <div className="shrink-0 flex items-center gap-4">
            <LogoutButton />
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-amber-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unprocessed Inventory</span>
            <div className="text-4xl font-black text-slate-900 font-heading mt-2">{stats.pending_raw_ml.toLocaleString()} mL</div>
            <span className="text-xs text-amber-500 font-bold mt-1 block">Stored in Individual Units</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Safe Milk (Vault)</span>
            <div className="text-4xl font-black text-slate-900 font-heading mt-2">{stats.total_pasteurized_ml.toLocaleString()} mL</div>
            <span className="text-xs text-emerald-600 font-bold mt-1 block">Cleared & Available to Dispense</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-indigo-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Vault Batches</span>
            <div className="text-4xl font-black text-slate-900 font-heading mt-2">{stats.active_batch_count}</div>
            <span className="text-xs text-indigo-500 font-bold mt-1 block">Cleared & Available</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          
          {/* LEFT PANEL: TRANSPLANTED PASTEURIZATION MODULE */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[500px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="mb-6 border-b border-slate-100 pb-4 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-emerald-600 font-heading mb-1">Laboratory: Pasteurization & MBT Clearance</h3>
              <p className="text-xs text-slate-500">Log heating metrics and microbiological test (MBT) results for pooled batches sent from the Nurse Station.</p>
            </div>
            
            {pendingProcessingBatches.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400 font-medium flex-1 flex items-center justify-center">
                No active batches awaiting pasteurization.
              </div>
            ) : (
              <div className="space-y-6">
                {pendingProcessingBatches.map((b) => (
                  <div key={b.batch_id} className="border border-slate-200 p-5 rounded-2xl bg-slate-50/50 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-black font-mono bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded tracking-wider uppercase">Batch #{b.batch_id}</span>
                        <span className="block text-[10px] text-slate-400 font-bold mt-2">Pooled Vol: {b.pooled_volume} mL</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-5">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">Temp (°C) - Target: 62.5°C</label>
                        <input type="number" step="0.1" defaultValue="62.5" onChange={(e) => setProcessingInputs(p => ({...p, [b.batch_id]: {...p[b.batch_id], temp: e.target.value}}))} className="w-full border border-slate-200 p-2 rounded-lg bg-white text-sm outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">Time (Mins) - Target: 30 mins</label>
                        <input type="number" defaultValue="30" onChange={(e) => setProcessingInputs(p => ({...p, [b.batch_id]: {...p[b.batch_id], time: e.target.value}}))} className="w-full border border-slate-200 p-2 rounded-lg bg-white text-sm outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-1">Microbiological Test (MBT)</label>
                        <select defaultValue="Passed" onChange={(e) => setProcessingInputs(p => ({...p, [b.batch_id]: {...p[b.batch_id], mbt: e.target.value}}))} className="w-full border border-slate-200 p-2.5 rounded-lg bg-white text-sm outline-none focus:border-emerald-500">
                          <option value="Passed">Passed (Sterile/Safe)</option>
                          <option value="Failed">Failed (Contaminated)</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleProcessBatch(b.batch_id)} 
                      disabled={isProcessing}
                      className="w-full bg-emerald-600 text-white text-xs font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      Process & Finalize Batch Clearance
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: BIOLOGICAL QUALITY ASSURANCE DESK */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Biological Quality Assurance Desk</h2>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-md border border-indigo-200">
                {quarantineQueue.length} Flagged
              </span>
            </div>

            {quarantineQueue.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs flex-1 flex items-center justify-center">
                🎉 Perfect! There are no flagged or failed batches awaiting manual override.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                    <tr className="border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      <th className="py-3 px-6">Batch ID</th>
                      <th className="py-3 px-6">Volume</th>
                      <th className="py-3 px-6">Temp (°C)</th>
                      <th className="py-3 px-6">Time (Min)</th>
                      <th className="py-3 px-6 text-right">Assay Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {quarantineQueue.map((batch) => {
                      const isFlagged = batch.lab_status === 'Flagged' || batch.safety_flags !== null;
                      
                      return (
                        <tr key={batch.batch_id} className={`hover:bg-slate-50/60 transition-colors ${isFlagged ? 'bg-red-50/30 hover:bg-red-50/50' : ''}`}>
                          <td className="py-4 px-6 font-mono font-bold text-slate-900">#{batch.batch_id}</td>
                          <td className="py-4 px-6 font-black text-indigo-600 font-heading">{batch.pooled_volume} mL</td>
                          
                          <td className={`py-4 px-6 font-bold ${batch.pasteurization_temp < 62.5 ? 'text-red-600' : 'text-slate-700'}`}>
                            {batch.pasteurization_temp || '--'}°
                          </td>
                          <td className={`py-4 px-6 font-bold ${batch.pasteurization_time < 30 ? 'text-red-600' : 'text-slate-700'}`}>
                            {batch.pasteurization_time || '--'}m
                          </td>

                          <td className="py-4 px-6 text-right flex justify-end gap-2">
                            <button
                              disabled={qaProcessingId !== null || isFlagged}
                              onClick={() => handleQaDecision(batch.batch_id, 'Passed')}
                              className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                              title={isFlagged ? "LOCKED: Sub-optimal thermal parameters" : "Clear for dispensing"}
                            >
                              ✅ Pass
                            </button>
                            <button
                              disabled={qaProcessingId !== null}
                              onClick={() => handleQaDecision(batch.batch_id, 'Failed')}
                              className="bg-red-50 text-red-700 border border-red-200 font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            >
                              ❌ Discard
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* TRACEABILITY SCANNER SECTION */}
        <div className="w-full">
          <TraceabilityScanner />
        </div>

      </div>

      {/* OVERLAY LABELS MODAL WINDOW */}
      {showLabel && (
        <MilkLabelModal 
          type="pasteurized" 
          data={labelData} 
          onClose={() => setShowLabel(false)} 
        />
      )}

    </div>
  );
}