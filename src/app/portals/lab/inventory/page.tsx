'use client';
import { useState, useEffect } from 'react';
import MilkLabelModal from '@/components/MilkLabelModal';

export default function LabInventory() {
  const [bottleQueue, setBottleQueue] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);
  const [showPasteurizeModal, setShowPasteurizeModal] = useState(false);
  const [targetPasteurizeIds, setTargetPasteurizeIds] = useState<number[]>([]);
  const [temperature, setTemperature] = useState('');
  const [duration, setDuration] = useState('');

  const fetchData = async () => {
    try {
      const queueRes = await fetch('/api/lab/batches');
      if (queueRes.ok) setBottleQueue(await queueRes.json());
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to load inventory', error);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
    setTemperature('62.5');
    setDuration('30');
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
        body: JSON.stringify({ ids: targetPasteurizeIds, temperature, duration })
      });
      const data = await response.json();
      if (response.ok) {
        if (data.message.includes('Discard Recommended')) {
          alert(`⚠️ SAFETY WARNING: ${data.message}`);
        } else {
          alert('✅ Cycle logged successfully.');
        }
        setLabelData(data.results);
        setShowLabel(true);
        setShowPasteurizeModal(false);
        fetchData();
      } else {
        alert(`Notice: ${data.error}`);
      }
    } catch (error: any) {
      alert(`System Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body p-8 lg:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#E04A75] mb-1">Processing Center</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">Matrix Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Select and process raw milk bottles from the incoming storage matrix.</p>
        </div>

        {/* ACTIONS HUB */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Pasteurization Operations Hub</h3>
            <p className="text-xs text-slate-500 mt-1">Select specific entries or clear the entire storage grid immediately.</p>
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

        {/* INVENTORY TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Incoming Raw Storage Matrix</h2>
            <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2.5 py-1 rounded-md border border-amber-200">
              {bottleQueue.length} Bottles
            </span>
          </div>
          {bottleQueue.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No raw storage bottles waiting.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
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
                  <tr key={bottle.collection_id} className="hover:bg-slate-50/60">
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
          )}
        </div>
      </div>

      {/* PASTEURIZATION MODAL */}
      {showPasteurizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-heading">Pasteurization Logger</h2>
              <button onClick={() => setShowPasteurizeModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-6">Processing <span className="font-bold text-amber-600">{targetPasteurizeIds.length}</span> bottles. Input thermal parameters.</p>
              <form onSubmit={handleExecutePasteurization} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Cycle Temperature (°C)</label>
                  <input type="number" step="0.1" required value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="e.g. 62.5" className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm font-mono focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Cycle Duration (Minutes)</label>
                  <input type="number" required value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 30" className="w-full border border-slate-300 p-3.5 rounded-xl outline-none text-sm font-mono focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowPasteurizeModal(false)} className="w-1/3 bg-white text-slate-700 border border-slate-300 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={isProcessing} className="w-2/3 bg-amber-500 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-amber-600 disabled:opacity-50">
                    {isProcessing ? 'Processing...' : 'Save Cycle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showLabel && <MilkLabelModal type="pasteurized" data={labelData} onClose={() => setShowLabel(false)} />}
    </div>
  );
}