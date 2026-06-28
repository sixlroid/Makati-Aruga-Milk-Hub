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

  const [pendingProcessingBatches, setPendingProcessingBatches] = useState<any[]>([]);
  
  // Modal States for Pasteurization
  const [activeProcessBatch, setActiveProcessBatch] = useState<any | null>(null);
  const [modalInputs, setModalInputs] = useState({ temp: '', time: '', mbt: 'Passed' });

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch('/api/lab/stats');
      if (statsRes.ok) setStats(await statsRes.json());

      const qaRes = await fetch('/api/lab/qa');
      if (qaRes.ok) setQuarantineQueue(await qaRes.json());
      
      fetchProcessingBatches(); 
    } catch (error) {
      console.error("Data tracking refresh failed", error);
    }
  };

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

  const openProcessModal = (batch: any) => {
    setActiveProcessBatch(batch);
    setModalInputs({ temp: '', time: '', mbt: 'Passed' });
  };

  const handleProcessBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProcessBatch) return;

    if (!modalInputs.temp || !modalInputs.time) {
      alert("Please enter both Temperature and Time.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/batches/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: activeProcessBatch.batch_id,
          temp: modalInputs.temp,
          time: modalInputs.time,
          mbt_result: modalInputs.mbt
        })
      });
      if (res.ok) {
        // THE FIX: Trigger the sticker printing right as it goes to QA!
        setLabelData({
          batch_id: activeProcessBatch.batch_id,
          volume: activeProcessBatch.pooled_volume,
          temp: modalInputs.temp,
          time: modalInputs.time
        });
        setShowLabel(true);

        setActiveProcessBatch(null); // Close the processing modal
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
          
          {/* LEFT PANEL: TABLE-BASED PASTEURIZATION MODULE */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[500px]">
            <div className="mb-4 border-b border-slate-100 pb-4 shrink-0">
              <h3 className="text-lg font-bold text-emerald-600 font-heading mb-1">Pasteurization & MBT Clearance</h3>
              <p className="text-xs text-slate-500">Log heating metrics and microbiological test (MBT) results for pooled batches sent from the Nurse Station.</p>
            </div>
            
            {pendingProcessingBatches.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400 font-medium flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl">
                No active batches awaiting pasteurization.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse bg-slate-50/50">
                  <thead className="sticky top-0 bg-white z-10 border-b border-slate-200 shadow-sm">
                    <tr className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      <th className="py-3 px-5">Batch ID</th>
                      <th className="py-3 px-5">Pooled Vol</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {pendingProcessingBatches.map((b) => (
                      <tr key={b.batch_id} className="hover:bg-slate-100 transition-colors">
                        <td className="py-4 px-5 font-mono font-bold text-slate-900">#{b.batch_id}</td>
                        <td className="py-4 px-5 font-black text-indigo-600">{b.pooled_volume} mL</td>
                        <td className="py-4 px-5 text-right">
                          <button 
                            onClick={() => openProcessModal(b)}
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase px-4 py-2 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          >
                            Log Data
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: BIOLOGICAL QUALITY ASSURANCE DESK */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Biological QA Check</h2>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-md border border-indigo-200">
                {quarantineQueue.length} Awaiting QA
              </span>
            </div>

            {quarantineQueue.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs flex-1 flex items-center justify-center">
                All batches have been cleared.
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
                      // THE LOGIC: If it has safety flags, lock the pass button!
                      const hasSafetyFlags = batch.safety_flags !== null;
                      
                      return (
                        <tr key={batch.batch_id} className={`hover:bg-slate-50/60 transition-colors ${hasSafetyFlags ? 'bg-red-50/30 hover:bg-red-50/50' : ''}`}>
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
                              disabled={qaProcessingId !== null || hasSafetyFlags}
                              onClick={() => handleQaDecision(batch.batch_id, 'Passed')}
                              className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                              title={hasSafetyFlags ? "LOCKED: Sub-optimal thermal parameters" : "Clear for dispensing"}
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

      {/* PASTEURIZATION POP-UP MODAL */}
      {activeProcessBatch && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-emerald-50/50">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-emerald-800 tracking-tight font-heading">Process Batch #{activeProcessBatch.batch_id}</h2>
                  <p className="text-xs font-bold text-emerald-600 mt-1">Total Volume: {activeProcessBatch.pooled_volume} mL</p>
                </div>
                <button 
                  onClick={() => setActiveProcessBatch(null)} 
                  className="text-slate-400 hover:text-slate-700 text-2xl font-bold leading-none mt-1"
                >
                  ×
                </button>
              </div>
            </div>
            
            <form onSubmit={handleProcessBatch} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2">Measured Temp (°C) <span className="text-slate-400 ml-1 font-medium">- Target: 62.5°C</span></label>
                <input 
                  type="number" 
                  step="0.1" 
                  required
                  placeholder="e.g. 62.5" 
                  value={modalInputs.temp}
                  onChange={(e) => setModalInputs({...modalInputs, temp: e.target.value})} 
                  className="w-full border border-slate-300 p-3.5 rounded-xl bg-slate-50 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all placeholder:text-slate-400 font-mono" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2">Measured Time (Mins) <span className="text-slate-400 ml-1 font-medium">- Target: 30 mins</span></label>
                <input 
                  type="number" 
                  required
                  placeholder="e.g. 30" 
                  value={modalInputs.time}
                  onChange={(e) => setModalInputs({...modalInputs, time: e.target.value})} 
                  className="w-full border border-slate-300 p-3.5 rounded-xl bg-slate-50 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all placeholder:text-slate-400 font-mono" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2">Microbiological Test (MBT)</label>
                <select 
                  value={modalInputs.mbt}
                  onChange={(e) => setModalInputs({...modalInputs, mbt: e.target.value})} 
                  className="w-full border border-slate-300 p-3.5 rounded-xl bg-white text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all font-semibold"
                >
                  <option value="Passed">Passed (Sterile / Safe)</option>
                  <option value="Failed">Failed (Contaminated)</option>
                </select>
              </div>
              
              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setActiveProcessBatch(null)}
                  className="w-1/3 bg-white border border-slate-300 text-slate-700 text-xs font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-2/3 bg-emerald-600 text-white text-xs font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isProcessing ? 'Processing...' : 'Send to QA Desk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}