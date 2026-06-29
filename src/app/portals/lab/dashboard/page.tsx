'use client';
import { useState, useEffect } from 'react';
import MilkLabelModal from '@/components/MilkLabelModal';

export default function LabDashboard() {
  const [stats, setStats] = useState({
    pending_raw_ml: 0,
    total_pasteurized_ml: 0,
    active_batch_count: 0
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);

  // Unified Processing State
  const [bottleQueue, setBottleQueue] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [modalInputs, setModalInputs] = useState({ temp: '', time: '', mbt: 'Passed' });

  const fetchData = async () => {
    try {
      const statsRes = await fetch('/api/lab/stats');
      if (statsRes.ok) setStats(await statsRes.json());
      
      const queueRes = await fetch('/api/lab/batches');
      if (queueRes.ok) setBottleQueue(await queueRes.json());
      setSelectedIds([]);
    } catch (error) {
      console.error("Data tracking refresh failed", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleRow = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === bottleQueue.length) setSelectedIds([]);
    else setSelectedIds(bottleQueue.map(b => b.collection_id));
  };

  const openProcessModal = (ids: number[]) => {
    setSelectedIds(ids);
    setModalInputs({ temp: '62.5', time: '30', mbt: 'Passed' });
    setShowProcessModal(true);
  };

  const handleProcessBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    if (!modalInputs.temp || !modalInputs.time) { 
      alert("Please enter both Temperature and Time."); 
      return; 
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/lab/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          temperature: modalInputs.temp,
          duration: modalInputs.time,
          mbt_result: modalInputs.mbt
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.message?.includes('Flagged')) alert(`⚠️ SAFETY WARNING: ${data.message}`);
        setLabelData(data.results);
        setShowLabel(true);
        setShowProcessModal(false);
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch(e: any) { 
      alert(`System Error: ${e.message}`); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-body relative text-slate-800 pb-12">
      <div className="flex-1 p-8 lg:p-10 mx-auto max-w-[1200px]">
        
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#E04A75] mb-1">Processing Center</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">Vault Overview</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">Pool raw inventory, log biological assays, and send to Quality Assurance.</p>
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

        {/* UNIFIED PASTEURIZATION HUB */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-sm font-black text-[#E04A75] uppercase tracking-wider font-heading">Pasteurization & Processing</h2>
              <p className="text-xs text-slate-500 mt-1">Select raw bottles to pool, log their pasteurization metrics, and submit to QA.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openProcessModal(selectedIds)} disabled={isProcessing || selectedIds.length === 0} className="bg-amber-500 text-white font-bold text-[10px] px-4 py-2.5 rounded-lg hover:bg-amber-600 shadow-sm disabled:opacity-40 uppercase tracking-wider transition-colors">Pasteurize ({selectedIds.length})</button>
              <button onClick={() => openProcessModal(bottleQueue.map(b => b.collection_id))} disabled={isProcessing || bottleQueue.length === 0} className="bg-slate-900 text-white font-bold text-[10px] px-4 py-2.5 rounded-lg hover:bg-slate-800 shadow-sm disabled:opacity-40 uppercase tracking-wider transition-colors">Pasteurize All</button>
            </div>
          </div>

          <div className="p-6 flex flex-col flex-1">
            {bottleQueue.length === 0 ? (
              <div className="text-center py-16 text-sm text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50 flex items-center justify-center h-full">
                No raw storage bottles waiting for processing.
              </div>
            ) : (
              <div className="overflow-y-auto border border-slate-200 rounded-xl flex-1 max-h-[500px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                    <tr className="border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      <th className="py-4 px-6 w-10"><input type="checkbox" checked={bottleQueue.length > 0 && selectedIds.length === bottleQueue.length} onChange={handleToggleSelectAll} className="accent-[#E04A75] w-4 h-4" /></th>
                      <th className="py-4 px-6">Log ID</th>
                      <th className="py-4 px-6 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {bottleQueue.map((bottle) => (
                      <tr key={bottle.collection_id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => handleToggleRow(bottle.collection_id)}>
                        <td className="py-3 px-6"><input type="checkbox" checked={selectedIds.includes(bottle.collection_id)} onChange={() => {}} className="accent-[#E04A75] w-4 h-4" /></td>
                        <td className="py-3 px-6 font-mono text-slate-500 font-bold">#BOT-{bottle.collection_id}</td>
                        <td className="py-3 px-6 font-black text-amber-600 text-right">{bottle.raw_volume_ml} mL</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODALS */}
      {showLabel && <MilkLabelModal type="pasteurized" data={labelData} onClose={() => setShowLabel(false)} />}

      {/* UNIFIED PROCESSING MODAL */}
      {showProcessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-heading">Process & QA Hand-off</h2>
              <button onClick={() => setShowProcessModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-xl leading-none">✕</button>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-6">Pooling <span className="font-bold text-amber-600">{selectedIds.length}</span> raw bottles. Input thermal parameters and MBT test results.</p>
              
              <form onSubmit={handleProcessBatch} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Cycle Temperature (°C)</label>
                  <input type="number" step="0.1" required value={modalInputs.temp} onChange={(e) => setModalInputs({...modalInputs, temp: e.target.value})} className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Cycle Duration (Minutes)</label>
                  <input type="number" required value={modalInputs.time} onChange={(e) => setModalInputs({...modalInputs, time: e.target.value})} className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Microbiological Test (MBT)</label>
                  <select value={modalInputs.mbt} onChange={(e) => setModalInputs({...modalInputs, mbt: e.target.value})} className="w-full border border-slate-300 p-3.5 rounded-xl bg-white text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 font-semibold transition-all">
                    <option value="Passed">Passed (Sterile / Safe)</option>
                    <option value="Failed">Failed (Contaminated)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowProcessModal(false)} className="w-1/3 bg-white text-slate-700 border border-slate-300 py-3.5 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={isProcessing} className="w-2/3 bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm flex justify-center items-center gap-2">
                    {isProcessing ? 'Processing...' : 'Submit to QA Desk'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}