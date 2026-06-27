'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import MilkLabelModal from '@/components/MilkLabelModal';
import LogoutButton from '@/components/LogoutButton';
import TraceabilityScanner from '@/components/TraceabilityScanner';

export default function LabDashboard() {
  const [stats, setStats] = useState({
    pending_raw_ml: 0,
    total_pasteurized_ml: 0,
    active_batch_count: 0
  });
  
  const [bottleQueue, setBottleQueue] = useState<any[]>([]);
  const [quarantineQueue, setQuarantineQueue] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qaProcessingId, setQaProcessingId] = useState<number | null>(null);

  // Label Modal state controls
  const [showLabel, setShowLabel] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);

  // Pasteurization Logger Modal States
  const [showPasteurizeModal, setShowPasteurizeModal] = useState(false);
  const [targetPasteurizeIds, setTargetPasteurizeIds] = useState<number[]>([]);
  const [temperature, setTemperature] = useState('');
  const [duration, setDuration] = useState('');

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch('/api/lab/stats');
      if (statsRes.ok) setStats(await statsRes.json());

      const queueRes = await fetch('/api/lab/batches');
      if (queueRes.ok) setBottleQueue(await queueRes.json());

      const qaRes = await fetch('/api/lab/qa');
      if (qaRes.ok) setQuarantineQueue(await qaRes.json());
      
      setSelectedIds([]); 
    } catch (error) {
      console.error("Data tracking refresh failed", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleRow = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === bottleQueue.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(bottleQueue.map(b => b.collection_id));
    }
  };

  const promptPasteurization = (ids: number[]) => {
    setTargetPasteurizeIds(ids);
    setTemperature('62.5'); // Default standard for Holder method
    setDuration('30');      // Default standard for Holder method
    setShowPasteurizeModal(true);
  };

  const handleExecutePasteurization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetPasteurizeIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/lab/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids: targetPasteurizeIds,
          temperature: temperature,
          duration: duration
        })
      });
      const data = await response.json();
      
      if (response.ok) {
        if (data.message.includes("Discard Recommended")) {
          alert(`⚠️ SAFETY WARNING: ${data.message}`);
        } else {
          alert('✅ Cycle logged successfully.');
        }

        setLabelData(data.results);
        setShowLabel(true);
        setShowPasteurizeModal(false); 
        fetchDashboardData();
      } else {
        alert(`Notice: ${data.error}`);
      }
    } catch (error: any) {
      alert(`System Error: ${error.message}`);
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
      {/* ADDED SCROLLBAR HIDDEN CLASSES TO MAIN CONTAINER */}
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

        {/* ACTIONS CONTROLS HUB */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Pasteurization Operations Hub</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">Select specific entries inside the inventory module table below or clear the entire storage grid immediately.</p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              onClick={() => promptPasteurization(selectedIds)}
              disabled={isProcessing || selectedIds.length === 0}
              className="bg-amber-500 text-white font-bold text-xs px-6 py-3 rounded-xl hover:bg-amber-600 shadow-sm disabled:opacity-40 transition-all flex items-center gap-2"
            >
              <span>🔥</span> Pasteurize Selected ({selectedIds.length})
            </button>
            <button
              onClick={() => promptPasteurization(bottleQueue.map(b => b.collection_id))}
              disabled={isProcessing || bottleQueue.length === 0}
              className="bg-slate-900 text-white font-bold text-xs px-6 py-3 rounded-xl hover:bg-slate-800 shadow-sm disabled:opacity-40 transition-all flex items-center gap-2"
            >
              <span>⚡</span> Pasteurize All Pending Bottles ({bottleQueue.length})
            </button>
          </div>
        </div>

        {/* THE MAIN TWO-COLUMN PROCESSING WORKSPACE GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          
          {/* LEFT PANEL: PENDING BOTTLE INVENTORY TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Incoming Raw Storage Matrix</h2>
              <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2.5 py-1 rounded-md border border-amber-200">
                {bottleQueue.length} Bottles
              </span>
            </div>

            {bottleQueue.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs flex-1 flex items-center justify-center">
                No raw storage bottles waiting inside the storage unit.
              </div>
            ) : (
              // ADDED SCROLLBAR HIDDEN CLASSES TO TABLE CONTAINER
              <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                    <tr className="border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      <th className="py-3 px-4 w-10">
                        <input type="checkbox" checked={bottleQueue.length > 0 && selectedIds.length === bottleQueue.length} onChange={handleToggleSelectAll} className="accent-[#E04A75]" />
                      </th>
                      <th className="py-3 px-4">Log ID</th>
                      <th className="py-3 px-4">Donor</th>
                      <th className="py-3 px-4 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {bottleQueue.map((bottle) => (
                      <tr key={bottle.collection_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <input type="checkbox" checked={selectedIds.includes(bottle.collection_id)} onChange={() => handleToggleRow(bottle.collection_id)} className="accent-[#E04A75]" />
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">#BOT-{bottle.collection_id}</td>
                        <td className="py-3.5 px-4 font-bold uppercase text-slate-900">{bottle.donor?.tracking_no}</td>
                        <td className="py-3.5 px-4 font-black text-amber-600 font-heading text-right">{bottle.raw_volume_ml} mL</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: THE UNLOCKED QUALITY ASSURANCE DESK */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Biological Quality Assurance Desk</h2>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-md border border-indigo-200">
                {quarantineQueue.length} Quarantined
              </span>
            </div>

            {quarantineQueue.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs flex-1 flex items-center justify-center">
                🎉 Perfect! There are no pasteurized batches awaiting biological culture reviews.
              </div>
            ) : (
              // ADDED SCROLLBAR HIDDEN CLASSES TO TABLE CONTAINER
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

      {/* PASTEURIZATION LOGGER MODAL */}
      {showPasteurizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-heading">Pasteurization Logger</h2>
              <button onClick={() => setShowPasteurizeModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                You are preparing to process <span className="font-bold text-amber-600 px-1 py-0.5 bg-amber-50 rounded">{targetPasteurizeIds.length}</span> bottles. Please input the exact thermal parameters used for this cycle.
              </p>
              
              <form onSubmit={handleExecutePasteurization} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Cycle Temperature (°C)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    required 
                    value={temperature} 
                    onChange={(e) => setTemperature(e.target.value)} 
                    placeholder="e.g. 62.5" 
                    className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Cycle Duration (Minutes)</label>
                  <input 
                    type="number" 
                    required 
                    value={duration} 
                    onChange={(e) => setDuration(e.target.value)} 
                    placeholder="e.g. 30" 
                    className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all font-mono" 
                  />
                </div>
                <div className="mt-8 flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowPasteurizeModal(false)} className="w-1/3 bg-white text-slate-700 border border-slate-300 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={isProcessing} className="w-2/3 bg-amber-500 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2">
                    {isProcessing ? 'Processing...' : 'Save Cycle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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