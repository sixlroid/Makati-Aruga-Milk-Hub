'use client';
import TraceabilityScanner from '@/components/TraceabilityScanner';

export default function LabInventory() {
  return (
    <div className="min-h-screen bg-slate-50 font-body p-8 lg:p-10 pb-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#E04A75] mb-1">Processing Center</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">Matrix Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Verify system-wide physical traceability and chain of custody.</p>
        </div>

        {/* TRACEABILITY SCANNER */}
        <TraceabilityScanner />

      </div>
    </div>
  );
}