'use client';
import { useState, useEffect, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';

export default function RequestMilkPage() {
  const { data: session, status } = useSession();
  const activeMtn = session?.user?.name as string | undefined;

  // --- Profile & Context State ---
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // --- Form State ---
  const [requestVolume, setRequestVolume] = useState('');
  const [requestHospital, setRequestHospital] = useState('');
  const [infantGender, setInfantGender] = useState('M');
  const [dispensingProgram, setDispensingProgram] = useState('In House');
  const [bottleType, setBottleType] = useState('ameda');
  const [clinicalAbstract, setClinicalAbstract] = useState<File | null>(null);
  const [prescription, setPrescription] = useState<File | null>(null);
  
  // --- UI State ---
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  // --- Pickup State ---
  const [pickupPerson, setPickupPerson] = useState('self');
  const [bringCooler, setBringCooler] = useState(false);
  const [consentSettle, setConsentSettle] = useState(false);

  // --- Fetch Profile Data ---
  const fetchProfile = async (mtnStr: string) => {
    try {
      const res = await fetch(`/api/member/profile?mtn=${mtnStr}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.member ?? {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && activeMtn) fetchProfile(activeMtn);
  }, [status, activeMtn]);

  // --- Dynamic Fee Calculation ---
  const volumeNumber = parseInt(requestVolume) || 0;
  const bottleCosts: Record<string, number> = { ameda: 85, korea: 65, red_cap: 40 };
  const estimatedFee = (volumeNumber * 2) + (bottleCosts[bottleType] || 0);

  // --- Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files.length > 0) {
      setter(e.target.files[0]);
    }
  };

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
          infant_gender: infantGender,
          dispensing_program: dispensingProgram,
          bottle_type: bottleType,
          cost: estimatedFee
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        // THE FIX: Forcibly override the local profile state to trigger STATE 2 instantly
        setProfile((prevProfile: any) => ({
          ...prevProfile,
          rtn: data.rtn || prevProfile.rtn || 'GENERATING...', // Use API RTN or fallback
          rtn_status: 'pending' 
        }));
        
        setRequestVolume('');
        setRequestHospital('');
        
        // Silently fetch the real backend state in the background
        if (activeMtn) await fetchProfile(activeMtn); 
      } else {
        setRequestMessage(data.error ?? 'Request rejected by routing gate.');
      }
    } catch (error) {
      setRequestMessage('Network connectivity timeout fault.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleConfirmPickup = async () => {
    // Add logic here to update the RTN status to 'arriving' via your API
    alert("Pickup confirmed! Proceed to the facility.");
  };

  // Helper boolean for conditional rendering
  const isRtnActive = profile.rtn && profile.rtn_status && 
                      ['pending', 'approved', 'arriving'].includes(profile.rtn_status.toLowerCase());

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">Loading request desk...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-12">
      <div className="max-w-3xl mx-auto mt-8 px-4">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[400px]">
          
          {/* STATE 1: CAN REQUEST */}
          {!isRtnActive && (
            <>
              <div className="mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider font-heading">Request Pasteurized Milk</h2>
                <p className="text-xs text-slate-500 mt-1">Submit your medical documents to initiate a request.</p>
                {profile.rtn_status?.toLowerCase() === 'rejected' && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="text-xs font-bold text-red-700 block">Previous Request Rejected</span>
                    <span className="text-[11px] text-red-600 block mt-1">Remarks: {profile.rtn_remarks || 'Documents missing or invalid.'}</span>
                  </div>
                )}
              </div>

              {requestMessage && (
                <div className={`rounded-xl border px-3 py-2 text-sm mb-4 ${requestMessage.includes('fault') || requestMessage.includes('rejected') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  {requestMessage}
                </div>
              )}

              <form onSubmit={handleRequestMilk} className="space-y-4 flex-1 flex flex-col">
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Volume (mL)</span>
                    <input type="number" required value={requestVolume} onChange={(e) => setRequestVolume(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#E04A75]" />
                  </label>
                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Hospital/Destination</span>
                    <input type="text" required value={requestHospital} onChange={(e) => setRequestHospital(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#E04A75]" />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Infant Gender</span>
                    <select value={infantGender} onChange={(e) => setInfantGender(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#E04A75]">
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </label>
                  <label className="block text-sm text-slate-600">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Dispensing Activity</span>
                    <select value={dispensingProgram} onChange={(e) => setDispensingProgram(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#E04A75]">
                      <option value="In House">In House (For patients currently admitted inside the hospital)</option>
                      <option value="Milky Way">Milky Way (Makati City external community program)</option>
                      <option value="Donation">Donation (Charity or emergency disaster relief)</option>
                      <option value="POM">Pasteurized Own Milk (Processing your own breastmilk safely for your baby)</option>
                    </select>
                  </label>
                </div>

                <label className="block text-sm text-slate-600">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Select Bottle Storage Type</span>
                  <select value={bottleType} onChange={(e) => setBottleType(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#E04A75]">
                    <option value="ameda">Ameda - Premium hospital grade (+₱85)</option>
                    <option value="korea">Korea Spec - Standard variant (+₱65)</option>
                    <option value="red_cap">Red Cap - Generic hospital variant (+₱40)</option>
                  </select>
                </label>

                {requestVolume && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estimated Total Fee</span>
                      <span className="text-lg font-black text-slate-800 font-heading">
                        ₱{estimatedFee.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Calculated at ₱2.00/mL processing fee + selected bottle deposit.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-black text-slate-500 mb-1">Upload Clinical Abstract (Max 2MB)</label>
                  <input type="file" accept="image/*,.pdf" required onChange={(e) => handleFileUpload(e, setClinicalAbstract)} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#FFF0F3] file:text-[#E04A75] hover:file:bg-[#FFDEE4] cursor-pointer" />
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <label className="block text-[10px] uppercase tracking-wider font-black text-slate-500 mb-1">Upload Pediatrician Prescription (Max 2MB)</label>
                  <input type="file" accept="image/*,.pdf" required onChange={(e) => handleFileUpload(e, setPrescription)} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#FFF0F3] file:text-[#E04A75] hover:file:bg-[#FFDEE4] cursor-pointer" />
                </div>
                <button type="submit" disabled={requestSubmitting} className="w-full rounded-xl bg-[#E04A75] px-4 py-3 text-sm font-bold text-white hover:bg-[#c83b62] disabled:opacity-60 mt-auto">
                  {requestSubmitting ? 'Generating RTN Ticket...' : 'Submit Request'}
                </button>
              </form>
            </>
          )}

          {/* STATE 2: PENDING REVIEW */}
          {(isRtnActive && profile.rtn_status?.toLowerCase() === 'pending') && (
            <div className="flex flex-col items-center justify-center text-center h-full space-y-4 py-8">
              <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl mb-2 shadow-sm">🟡</div>
              <h2 className="text-lg font-black text-slate-800 font-heading">Medical Verification Pending</h2>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Your clinical abstract and prescription are currently being verified by our clinical staff against active vault inventory. Please wait for culture and validation clearance.
                <br/><br/>Your Receipt Ticket (RTN): <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded mt-1 inline-block">{profile.rtn}</span>
              </p>
            </div>
          )}
          
          {/* STATE 3: APPROVED */}
          {(isRtnActive && profile.rtn_status?.toLowerCase() === 'approved') && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-start mb-6 border-b border-emerald-100 pb-4">
                <div>
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-md mb-2 inline-block">🟢 Approved for Pickup</span>
                  <h2 className="text-lg font-black text-slate-800 font-heading">Milk Allocated</h2>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Allocated Volume</span>
                  <span className="text-xl font-black text-emerald-600">{profile.rtn_volume || '150'} mL</span>
                </div>
              </div>

              <div className="space-y-5 flex-1">
                <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex justify-between items-center shadow-sm">
                  <div>
                    <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Final Payment Required</span>
                    <p className="text-xs text-emerald-600 font-medium">Please prepare this exact amount for pickup.</p>
                  </div>
                  <span className="text-4xl font-black text-emerald-700 font-heading tracking-tighter">
                    ₱{profile.rtn_fee?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00'}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Who is claiming the milk?</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                      <input type="radio" name="pickup" checked={pickupPerson === 'self'} onChange={() => setPickupPerson('self')} className="accent-emerald-600" /> Mother / Self
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                      <input type="radio" name="pickup" checked={pickupPerson === 'rep'} onChange={() => setPickupPerson('rep')} className="accent-emerald-600" /> Authorized Representative
                    </label>
                  </div>
                  {pickupPerson === 'rep' && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 font-medium">
                      <span className="font-bold">Notice:</span> The representative must present a formal authorization letter, photocopies of the mother's IDs, and their own valid government ID.
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 text-xs text-slate-700 font-medium cursor-pointer">
                    <input type="checkbox" checked={bringCooler} onChange={(e) => setBringCooler(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600" />
                    <span>I confirm I will bring a cooler or icebox with gel packs. (Milk will not be released without proper cold chain transport).</span>
                  </label>
                  <label className="flex items-start gap-3 text-xs text-slate-700 font-medium cursor-pointer">
                    <input type="checkbox" checked={consentSettle} onChange={(e) => setConsentSettle(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600" />
                    <span>I understand I must sign the consent form and settle the calculated processing/bottle deposit fees upon arrival.</span>
                  </label>
                </div>

                <div className="mt-auto pt-4">
                  <button onClick={handleConfirmPickup} disabled={!bringCooler || !consentSettle} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                    Acknowledge & Confirm Pickup Arrival
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATE 4: ARRIVING */}
          {(isRtnActive && profile.rtn_status?.toLowerCase() === 'arriving') && (
            <div className="flex flex-col items-center justify-center text-center h-full space-y-4 py-8">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl mb-2 shadow-sm border border-emerald-200">🏥</div>
              <h2 className="text-xl font-black text-emerald-700 font-heading tracking-tight">Please Proceed to the Facility</h2>
              <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
                Your pickup is confirmed. Please proceed to the milk bank with your IDs and a cooler with gel packs to claim your <strong className="text-slate-800">{profile.rtn_volume} mL</strong> of safe pasteurized milk.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 w-full max-w-xs">
                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Final Payment Required</span>
                <span className="text-2xl font-black text-slate-800">₱{profile.rtn_fee?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00'}</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}