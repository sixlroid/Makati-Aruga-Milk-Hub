'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import MilkLabelModal from '@/components/MilkLabelModal';

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

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch('/api/lab/stats');
      if (statsRes.ok) setStats(await statsRes.json());

      const queueRes = await fetch('/api/lab/batches');
      if (queueRes.ok) setBottleQueue(await queueRes.json());

      // NEW: Fetch batches awaiting microbial checks
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

  // Checkbox functions
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

  const handleExecutePasteurization = async (targetIds: number[]) => {
    if (targetIds.length === 0) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/lab/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: targetIds })
      });
      const data = await response.json();
      
      if (response.ok) {
        setLabelData(data.results);
        setShowLabel(true);
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

  // NEW: Handle dynamic clearance decisions
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
        fetchDashboardData(); // Instantly moves milk into the active vault numbers!
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
    <div className="min-h-screen bg-slate-50 flex font-body">
      <div className="flex-1 p-8 lg:p-10 overflow-y-auto h-screen">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 font-heading">Laboratory & Pasteurization</h1>
            <p className="text-sm text-slate-500 mt-1">Run selective pipelines, verify biological assays, and clear safe milk assets.</p>
          </div>
          <Link href="/portals/nurse/dashboard">
            <button className="bg-slate-200 text-slate-700 px-6 py-3 rounded-lg font-bold text-sm hover:bg-slate-300 transition-colors shadow-sm">
              Switch to Nurse Station ↱
            </button>
          </Link>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-amber-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unprocessed Inventory</span>
            <div className="text-4xl font-black text-slate-800 font-heading mt-2">{stats.pending_raw_ml} mL</div>
            <span className="text-xs text-amber-500 font-bold mt-1 block">Stored in Individual Units</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Safe Milk (Vault)</span>
            <div className="text-4xl font-black text-slate-800 font-heading mt-2">{stats.total_pasteurized_ml} mL</div>
            <span className="text-xs text-emerald-500 font-bold mt-1 block">Cleared & Available to Dispense</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-indigo-400">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Vault Batches</span>
            <div className="text-4xl font-black text-slate-800 font-heading mt-2">{stats.active_batch_count}</div>
            <span className="text-xs text-indigo-500 font-bold mt-1 block">Cleared & Available</span>
          </div>
        </div>

        {/* ACTIONS CONTROLS HUB */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pasteurization Operations Hub</h3>
              <p className="text-xs text-slate-400 mt-0.5">Select specific entries inside the inventory module table below or clear the entire storage grid immediately.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => handleExecutePasteurization(selectedIds)}
                disabled={isProcessing || selectedIds.length === 0}
                className="bg-amber-500 text-white font-bold text-xs px-5 py-3 rounded-xl hover:bg-amber-600 shadow-sm disabled:opacity-40 transition-all"
              >
                🔥 Pasteurize Selected ({selectedIds.length})
              </button>
              <button
                onClick={() => handleExecutePasteurization(bottleQueue.map(b => b.collection_id))}
                disabled={isProcessing || bottleQueue.length === 0}
                className="bg-[#1A1A1A] text-white font-bold text-xs px-5 py-3 rounded-xl hover:bg-slate-800 shadow-sm disabled:opacity-40 transition-all"
              >
                ⚡ Pasteurize All Pending Bottles ({bottleQueue.length})
              </button>
            </div>
          </div>
        </div>

        {/* THE MAIN TWO-COLUMN PROCESSING WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT PANEL: PENDING BOTTLE inventory TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
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
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      <th className="py-3 px-4 w-10">
                        <input type="checkbox" checked={bottleQueue.length > 0 && selectedIds.length === bottleQueue.length} onChange={handleToggleSelectAll} className="accent-[#E04A75]" />
                      </th>
                      <th className="py-3 px-4">Log ID</th>
                      <th className="py-3 px-4">Donor</th>
                      <th className="py-3 px-4">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {bottleQueue.map((bottle) => (
                      <tr key={bottle.collection_id} className="hover:bg-slate-50/40">
                        <td className="py-3.5 px-4">
                          <input type="checkbox" checked={selectedIds.includes(bottle.collection_id)} onChange={() => handleToggleRow(bottle.collection_id)} className="accent-[#E04A75]" />
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">#BOT-{bottle.collection_id}</td>
                        <td className="py-3.5 px-4 font-bold uppercase">{bottle.donor?.tracking_no}</td>
                        <td className="py-3.5 px-4 font-black text-amber-500 font-heading">{bottle.raw_volume_ml} mL</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: THE UNLOCKED QUALITY ASSURANCE DESK */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
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
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      <th className="py-3 px-6">Batch Identifier</th>
                      <th className="py-3 px-6">Volume Pool</th>
                      <th className="py-3 px-6 text-right">Microbial Assay Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {quarantineQueue.map((batch) => (
                      <tr key={batch.batch_id} className="hover:bg-slate-50/40">
                        <td className="py-4 px-6 font-mono font-bold text-slate-800">Batch #{batch.batch_id}</td>
                        <td className="py-4 px-6 font-black text-indigo-500 font-heading">{batch.pooled_volume} mL</td>
                        <td className="py-4 px-6 text-right flex justify-end gap-2">
                          <button
                            disabled={qaProcessingId !== null}
                            onClick={() => handleQaDecision(batch.batch_id, 'Passed')}
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          >
                            ✅ Clear / Pass
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

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