'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewHealthScreening() {
  const router = useRouter();
  const [mtn, setMtn] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic UI reveal states
  const [classification, setClassification] = useState('Walk-in donor');
  const [traveledAbroad, setTraveledAbroad] = useState('no');

  // Exact Section D questions from your official medical document image
  const medicalQuestions = [
    { id: "feeling_well", text: "1. Is the donor feeling well today?" },
    { id: "medications", text: "2. Is the donor taking any medications right now? (Excluding vitamins/minerals)" },
    { id: "blood_transfusion", text: "3. Did the donor receive a blood transfusion or blood products within the last 12 months?" },
    { id: "growth_hormone", text: "4. Has the donor ever received human pituitary-derived growth hormone or tissue/organ transplant?" },
    { id: "cjd_history", text: "5. Is there a personal or family history of Creutzfeldt-Jakob Disease (CJD)?" },
    { id: "tattoos_piercings", text: "6. Has the donor had a body piercing, tattoo, or permanent makeup in the last 12 months?" },
    { id: "alcohol_consumption", text: "7. Does the donor regularly drink more than two alcoholic drinks per day?" },
    { id: "nicotine_drugs", text: "8. Does the donor use any nicotine products (cigarettes, vapes, patches) or illegal drugs?" },
    { id: "infectious_diseases", text: "9. Has the donor ever tested positive for HIV, Hepatitis B, Hepatitis C, or Syphilis?" },
    { id: "std_exposure", text: "10. In the last 12 months, has the donor been exposed to anyone with a sexually transmitted disease?" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      
      // Collect the JSON answers dynamically
      const answers: any = {};
      medicalQuestions.forEach(q => {
        answers[q.id] = formData.get(q.id);
      });

      // Send the complete payload matching your Prisma model perfectly
      const response = await fetch('/api/screenings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mtn: mtn,
          final_status: formData.get('final_status'),
          donor_classification: classification,
          classification_specifics: formData.get('classification_specifics') || null,
          traveled_abroad: traveledAbroad === 'yes',
          travel_country: traveledAbroad === 'yes' ? formData.get('travel_country') : null,
          travel_reason: traveledAbroad === 'yes' ? formData.get('travel_reason') : null,
          donation_reason: formData.get('donation_reason'),
          spouse_consent: formData.get('spouse_consent') === 'yes',
          answers: answers
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Success: ${data.message}`);
        router.push('/portals/nurse/dashboard');
      } else {
        alert(`API Error: ${data.error}`);
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Submission failed: ${error.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-12">
      {/* HEADER BANNER */}
      <div className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-50 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/portals/nurse/dashboard" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
            ← Back to Station
          </Link>
          <div className="h-4 w-[1px] bg-slate-300"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#E04A75] font-heading">Clinical Evaluation Desk</span>
        </div>
        <span className="text-xs text-slate-400 font-bold">Official Form: Appendix G-1</span>
      </div>

      <div className="max-w-3xl mx-auto mt-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800 font-heading tracking-tight">Donor Clinical Health Screening</h1>
          <p className="text-sm text-slate-500 mt-1">Complete Section B, C, and D evaluations to update official milk bank clearance.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* LOOKUP PANEL */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Target Profile</h2>
            <div className="max-w-md">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Donor Tracking Number (MTN)</label>
              <input 
                type="text" 
                required
                value={mtn}
                onChange={(e) => setMtn(e.target.value)}
                placeholder="e.g. MTN-1024" 
                className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm font-bold placeholder-slate-400 focus:border-[#E04A75] uppercase text-slate-800" 
              />
            </div>
          </div>

          {/* SECTION B: CLASSIFICATION */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-black text-[#E04A75] uppercase tracking-wider mb-3 font-heading">Section B: Donor Classification</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['Hospital donor', 'Outreach donor', 'Walk-in donor', 'Pick-up donor', 'Others'].map((item) => (
                <label key={item} className="cursor-pointer flex items-center gap-2 p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 has-[:checked]:border-[#E04A75] has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75] transition-all">
                  <input 
                    type="radio" 
                    name="classification" 
                    value={item} 
                    checked={classification === item}
                    onChange={(e) => setClassification(e.target.value)}
                    className="accent-[#E04A75]" 
                  />
                  {item}
                </label>
              ))}
            </div>

            {/* CONDITIONAL SPECIFY INPUT */}
            {['Hospital donor', 'Outreach donor', 'Others'].includes(classification) && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-600 mb-1">Please specify ({classification}):</label>
                <input 
                  type="text" 
                  name="classification_specifics" 
                  required 
                  placeholder="Enter hospital name, outreach location, or details..."
                  className="w-full border border-slate-300 p-2.5 rounded-lg text-sm text-slate-800 outline-none focus:border-[#E04A75]"
                />
              </div>
            )}
          </div>

          {/* SECTION C: GENERAL HEALTH & TRAVEL */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-black text-[#E04A75] uppercase tracking-wider mb-1 font-heading">Section C: General Health & Travel</h2>
            
            {/* TRAVEL ABROAD */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pt-2">
              <span className="text-sm font-medium text-slate-700">Has the donor traveled outside the country in the last 12 months?</span>
              <div className="flex gap-2">
                <label className="cursor-pointer px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75] has-[:checked]:border-[#FFDEE4]">
                  <input type="radio" name="travel_toggle" value="yes" onChange={() => setTraveledAbroad('yes')} className="mr-1.5 accent-[#E04A75]" /> YES
                </label>
                <label className="cursor-pointer px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 has-[:checked]:bg-slate-800 has-[:checked]:text-white">
                  <input type="radio" name="travel_toggle" value="no" defaultChecked onChange={() => setTraveledAbroad('no')} className="mr-1.5 accent-slate-800" /> NO
                </label>
              </div>
            </div>

            {traveledAbroad === 'yes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Travel Country / Destination:</label>
                  <input type="text" name="travel_country" required placeholder="e.g. Singapore, Japan" className="w-full border p-2 rounded text-sm text-slate-800 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Reason for Travel:</label>
                  <input type="text" name="travel_reason" required placeholder="e.g. Vacation, Work conference" className="w-full border p-2 rounded text-sm text-slate-800 outline-none" />
                </div>
              </div>
            )}

            {/* SPOUSE CONSENT */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-700">Does the donor have their husband's/partner's consent to donate milk?</span>
              <div className="flex gap-2">
                <label className="cursor-pointer px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700 has-[:checked]:border-emerald-200">
                  <input type="radio" name="spouse_consent" value="yes" defaultChecked className="mr-1.5 accent-emerald-600" /> YES / NA
                </label>
                <label className="cursor-pointer px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 has-[:checked]:bg-red-50 has-[:checked]:text-red-700 has-[:checked]:border-red-200">
                  <input type="radio" name="spouse_consent" value="no" className="mr-1.5 accent-red-600" /> NO
                </label>
              </div>
            </div>

            {/* DONATION REASON */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">Why does the donor want to donate milk?</label>
              <textarea 
                name="donation_reason" 
                required 
                rows={2}
                placeholder="e.g. Oversupply of milk, wants to help fragile NICU infants..."
                className="w-full border border-slate-300 p-3 rounded-lg text-sm text-slate-800 outline-none focus:border-[#E04A75]"
              ></textarea>
            </div>
          </div>

          {/* SECTION D: MEDICAL HISTORY */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-xs font-black text-[#E04A75] uppercase tracking-wider font-heading">Section D: Medical History Compliance</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {medicalQuestions.map((q) => (
                <div key={q.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50">
                  <span className="text-sm font-medium text-slate-700 max-w-xl">{q.text}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75] has-[:checked]:border-[#FFDEE4]">
                      <input type="radio" name={q.id} value="yes" required className="accent-[#E04A75] mr-1" /> YES
                    </label>
                    <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700 has-[:checked]:border-emerald-200">
                      <input type="radio" name={q.id} value="no" required className="accent-emerald-600 mr-1" /> NO
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OUTCOME & SUBMIT */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Final Clearance Decision</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <label className="cursor-pointer border rounded-xl p-4 flex gap-3 items-start has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/30">
                <input type="radio" name="final_status" value="Approved" required className="accent-emerald-600 mt-0.5" />
                <div>
                  <span className="block text-sm font-bold text-slate-800">Approve Donor</span>
                  <span className="block text-xs text-slate-500">Donor meets all clinical screening criteria successfully.</span>
                </div>
              </label>
              <label className="cursor-pointer border rounded-xl p-4 flex gap-3 items-start has-[:checked]:border-red-500 has-[:checked]:bg-red-50/30">
                <input type="radio" name="final_status" value="Deferred" required className="accent-red-600 mt-0.5" />
                <div>
                  <span className="block text-sm font-bold text-slate-800">Defer / Disqualify</span>
                  <span className="block text-xs text-slate-500">High-risk medical indicators present. Restrict raw donations.</span>
                </div>
              </label>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-[#1A1A1A] text-white py-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-sm tracking-wide disabled:opacity-50">
              {isSubmitting ? "Committing Clinical Records to Neon..." : "Save Complete Health Screening"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}