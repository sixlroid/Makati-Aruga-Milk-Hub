'use client';
import { useState, useEffect } from 'react';

export default function LabQA() {
  const [quarantineQueue, setQuarantineQueue] = useState<any[]>([]);
  const [qaProcessingId, setQaProcessingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const qaRes = await fetch('/api/lab/qa');
      if (qaRes.ok) setQuarantineQueue(await qaRes.json());
    } catch (error) {
      console.error('Failed to load QA queue', error);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('System failed to log testing verdict.');
    } finally {
      setQaProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body p-8 lg:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#E04A75] mb-1">Processing Center</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">Quality Assurance (QA)</h1>
          <p className="text-sm text-slate-500 mt-1">Review quarantined batches and issue pass or discard verdicts.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Biological Quality Assurance Desk</h2>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-md border border-indigo-200">
              {quarantineQueue.length} Quarantined
            </span>
          </div>
          {quarantineQueue.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              🎉 Perfect! There are no pasteurized batches awaiting biological culture reviews.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
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
                    <tr key={batch.batch_id} className={`hover:bg-slate-50/60 ${isFlagged ? 'bg-red-50/30' : ''}`}>
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">#{batch.batch_id}</td>
                      <td className="py-4 px-6 font-black text-indigo-600 font-heading">{batch.pooled_volume} mL</td>
                      <td className={`py-4 px-6 font-bold ${batch.pasteurization_temp < 62.5 ? 'text-red-600' : 'text-slate-700'}`}>{batch.pasteurization_temp || '--'}°</td>
                      <td className={`py-4 px-6 font-bold ${batch.pasteurization_time < 30 ? 'text-red-600' : 'text-slate-700'}`}>{batch.pasteurization_time || '--'}m</td>
                      <td className="py-4 px-6 text-right flex justify-end gap-2">
                        <button disabled={qaProcessingId !== null || isFlagged} onClick={() => handleQaDecision(batch.batch_id, 'Passed')} className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-40">✅ Pass</button>
                        <button disabled={qaProcessingId !== null} onClick={() => handleQaDecision(batch.batch_id, 'Failed')} className="bg-red-50 text-red-700 border border-red-200 font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-all">❌ Discard</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}