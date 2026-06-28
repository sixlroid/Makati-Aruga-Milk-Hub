'use client';
import { useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';

export default function RequestMilkPage() {
  const { data: session } = useSession();
  const activeMtn = session?.user?.name as string | undefined;

  const [requestVolume, setRequestVolume] = useState('');
  const [requestHospital, setRequestHospital] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  const handleRequestMilk = async (event: FormEvent) => {
    event.preventDefault();
    setRequestSubmitting(true);
    setRequestMessage(null);
    try {
      const res = await fetch('/api/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mtn: activeMtn,
          volume: requestVolume,
          hospital: requestHospital,
          cost: 0
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRequestMessage(data.message ?? 'Milk inventory dispensation allocation request submitted.');
        setRequestVolume('');
        setRequestHospital('');
      } else {
        setRequestMessage(data.error ?? 'Request rejected by routing gate.');
      }
    } catch (error) {
      setRequestMessage('Network connectivity timeout fault.');
    } finally {
      setRequestSubmitting(false);
    }
  };

return (
  <div className="min-h-screen bg-slate-50 p-6 font-body pb-12">
    <div className="h-8 w-full bg-black mb-8 -mx-6 -mt-6" />

    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          
          {/* Header Banner Section */}
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight font-heading">
              Clinical Request Module
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Submit a prescription requisition target to secure localized batch drops from the network.
            </p>
          </div>


          {requestMessage && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {requestMessage}
            </div>
          )}

          <form onSubmit={handleRequestMilk} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
                Requested Volume (mL)
                <input
                  type="number"
                  min="1"
                  required
                  value={requestVolume}
                  onChange={(e) => setRequestVolume(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 font-normal normal-case outline-none focus:border-[#E04A75] focus:bg-white transition"
                  placeholder="e.g. 150"
                />
              </label>

              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
                Hospital / Destination Target
                <input
                  type="text"
                  required
                  value={requestHospital}
                  onChange={(e) => setRequestHospital(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 font-normal normal-case outline-none focus:border-[#E04A75] focus:bg-white transition"
                  placeholder="e.g. Makati Medical Center"
                />
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={requestSubmitting}
                className="w-full md:w-auto rounded-xl bg-[#E04A75] px-6 py-3 text-sm font-semibold text-white hover:bg-[#c83b62] transition disabled:opacity-60"
              >
                {requestSubmitting ? 'Validating Dispatch...' : 'Authorize Allocation'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}