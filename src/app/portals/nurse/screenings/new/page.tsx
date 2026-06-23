'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewHealthScreening() {
  const router = useRouter();
  const [mtn, setMtn] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic UI reveal states
  const [classification, setClassification] = useState('Komunidad (Community)');
  const [traveledAbroad, setTraveledAbroad] = useState('no');

  // Dynamic UI reveal states (Conditionals)
  const [hasDonatedBefore, setHasDonatedBefore] = useState('no');
  const [hasDeferredBefore, setHasDeferredBefore] = useState('no');
  const [infantJaundice, setInfantJaundice] = useState('no');
  const [infantOtherMilk, setInfantOtherMilk] = useState('no');

  // --- THE OFFICIAL DOH CLINICAL ARRAYS ---
  const infectiousDiseases = [
    { id: "tb", fil: "Tuberculosis", eng: "Tuberculosis" },
    { id: "hepb", fil: "Hepatitis B", eng: "Hepatitis B" },
    { id: "mastitis", fil: "Mastitis / Pamamaga ng suso", eng: "Mastitis (breast inflammation)" },
    { id: "syphilis", fil: "Syphilis", eng: "Syphilis" },
    { id: "herpes", fil: "Herpes", eng: "Herpes" },
    { id: "std", fil: "Sexually Transmitted Disease", eng: "Sexually Transmitted Disease (STD)" }
  ];

  const riskFactors = [
    { id: "blood_transfusion", fil: "Ikaw ba ay nasalinan ng dugo o mga produkto na mula sa dugo nitong nakaraang 12 buwan?", eng: "Have you received a blood transfusion or blood products within the last 12 months?" },
    { id: "organ_transplant", fil: "Ikaw ba ay nakatanggap ng parte ng katawan 'organ' nitong nakaraang 12 buwan?", eng: "Have you received an organ or tissue transplant within the last 12 months?" },
    { id: "alcohol", fil: "Nakainom ka ba ng alak sa nakaraang 24 oras?", eng: "Have you consumed alcohol within the last 24 hours?" },
    { id: "smoke", fil: "Ikaw ba ay naninigarilyo?", eng: "Do you smoke?" },
    { id: "drugs", fil: "Ikaw ba ay gumagamit ng ipinagbabawal na gamot?", eng: "Do you use prohibited or illegal drugs?" },
    { id: "tattoo", fil: "Ikaw ba ay mayroong tattoo sa kahit anong parte ng iyong katawan?", eng: "Do you have a tattoo on any part of your body?" },
    { id: "vegan", fil: "Ikaw ba ay kumakain ng purong gulay lamang?", eng: "Do you eat a strictly vegetable-only diet?" },
    { id: "multivitamins", fil: "Ikaw ba ay umiinom ng mga multivitamins?", eng: "Do you take multivitamins?" },
    { id: "herbal", fil: "Ikaw ba ay umiinom ng herbal drugs o mega dose vitamins?", eng: "Do you take herbal medicines or megadose vitamin supplements?" },
    { id: "hormones", fil: "Ikaw ba ay umiinom ng pills or replacement hormones?", eng: "Do you take contraceptive pills or hormone replacement medications?" },
    { id: "breast_surgery", fil: "Ikaw ba ay naoperahan na sa suso?", eng: "Have you ever undergone breast surgery?" },
    { id: "breast_implants", fil: "Kung OO, ikaw ba ay nilagyan ng artipisyal na suso?", eng: "If YES, have you received breast implants?" },
    { id: "multiple_partners", fil: "Ikaw ba ay nagkaroon ng karanasan sa pakikipagtalik na higit sa 1?", eng: "Have you had multiple sexual partners?" },
    { id: "accidental_prick", fil: "Ikaw ba ay naturukan ng karayom nang hindi sinasadya na nadikit sa dugo ng ibang tao?", eng: "Have you ever been accidentally pricked by a needle that had been exposed to another person's blood?" }
  ];

  const partnerRisks = [
    { id: "partner_bisexual", fil: "Nakikipagtalik sa kaparehas nakasarian / Bisexual", eng: "Has had sexual relations with someone of the same sex / is bisexual" },
    { id: "partner_promiscuous", fil: "Nakikipagtalik sa higit sa isang tao / Promiscuous", eng: "Has had sexual relations with multiple partners / is promiscuous" },
    { id: "partner_std", fil: "Nakikipagtalik sa taong may sakit na STD/AIDS/HIV", eng: "Has had sexual contact with a person who has STD/AIDS/HIV" },
    { id: "partner_blood", fil: "Paulit-ulit na nasalinan ng dugo", eng: "Has repeatedly received blood transfusions" },
    { id: "partner_drugs", fil: "Gumamit ng gamot sa paraan ng pagtusok sa katawan", eng: "Has used drugs through injection (intravenous drug user)" }
  ];

  // --- THE DATABASE SUBMISSION LOGIC ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      
      const answers: any = {};
      [...infectiousDiseases, ...riskFactors, ...partnerRisks].forEach(q => {
        answers[q.id] = formData.get(q.id);
      });

      answers.last_delivery = formData.get('last_delivery');
      answers.is_normal_delivery = formData.get('is_normal_delivery');
      answers.prev_donation_details = formData.get('prev_donation_details');
      answers.prev_deferral_details = formData.get('prev_deferral_details');
      answers.infant_age = formData.get('infant_age');
      answers.infant_fullterm = formData.get('infant_fullterm');
      answers.infant_exclusive_bm = formData.get('infant_exclusive_bm');
      answers.jaundice_duration = formData.get('jaundice_duration');
      answers.other_milk_source = formData.get('other_milk_source');

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

      let data;
      try { data = await response.json(); } catch(e) { throw new Error("API failed to return JSON."); }

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
            ← Back
          </Link>
          <div className="h-4 w-[1px] bg-slate-300"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#E04A75] font-heading">Clinical Evaluation Desk</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto mt-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800 font-heading tracking-tight">Health Profile</h1>
          <p className="text-sm text-slate-500 mt-1">MHMB FORM-001</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* MEMBER ID */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-xs font-black text-[#E04A75] uppercase tracking-wider font-heading">Member ID</h2>
            </div>
            <div className="p-6">
              <div className="max-w-md">
                <input type="text" required value={mtn} onChange={(e) => setMtn(e.target.value)} placeholder="e.g. MTN-1024" className="w-full border border-slate-300 p-3 rounded-lg outline-none text-sm font-bold placeholder-slate-400 focus:border-[#E04A75] uppercase text-slate-800" />
              </div>
            </div>
          </div>

          {/* COMBINED CARD 1: DONOR LOGISTICS & TRAVEL INFO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-xs font-black text-[#E04A75] uppercase tracking-wider font-heading">Donor Logistics & Travel Information</h2>
            </div>
            
            <div className="divide-y divide-slate-200">
              
              {/* Donor Classification */}
              <div className="bg-white">
                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Klasipikasyon ng Donor / Donor Classification</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['Komunidad (Community)', 'Pribado (Private)', 'Empleyado (Employee)', 'Ahensya (Agency)', 'Ospital (Hospital)'].map((item) => (
                      <label key={item} className="cursor-pointer flex items-center gap-2 p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 has-[:checked]:border-[#E04A75] has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75] transition-all">
                        <input type="radio" name="classification" value={item} checked={classification === item} onChange={(e) => setClassification(e.target.value)} className="accent-[#E04A75]" />
                        {item}
                      </label>
                    ))}
                  </div>
                  {['Empleyado (Employee)', 'Ahensya (Agency)', 'Ospital (Hospital)'].includes(classification) && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-600 mb-1">If applicable, please specify (Pangalan ng Ospital/Ahensya):</label>
                      <input type="text" name="classification_specifics" placeholder="Enter details here..." className="w-full border border-slate-300 p-2.5 rounded-lg text-sm text-slate-800 outline-none focus:border-[#E04A75]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Travel History */}
              <div className="bg-white">
                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paglalakbay / Travel History</h3>
                </div>
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <span className="block text-sm font-bold text-slate-800">Naglakbay ka na ba sa labas ng Pilipinas sa loob ng 5 taon?</span>
                      <span className="block text-xs text-slate-500 italic">Have you traveled outside the Philippines in the past 5 years?</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <label className="cursor-pointer px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75] has-[:checked]:border-[#FFDEE4]"><input type="radio" name="travel_toggle" value="yes" onChange={() => setTraveledAbroad('yes')} className="mr-1.5 accent-[#E04A75]" /> OO </label>
                      <label className="cursor-pointer px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 has-[:checked]:bg-slate-800 has-[:checked]:text-white"><input type="radio" name="travel_toggle" value="no" defaultChecked onChange={() => setTraveledAbroad('no')} className="mr-1.5 accent-slate-800" /> HINDI </label>
                    </div>
                  </div>
                  {traveledAbroad === 'yes' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Anong bansa? (Which country?):</label>
                        <input type="text" name="travel_country" required placeholder="e.g. Japan, Singapore" className="w-full border p-2 rounded text-sm text-slate-800 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Dahilan ng Paglalakbay? (Reason for travel?):</label>
                        <select name="travel_reason" defaultValue="" className="w-full border p-2 rounded text-sm text-slate-800 outline-none bg-white">
                          <option value="" disabled>Pumili</option>
                          <option value="Turista">Turista (Tourist)</option>
                          <option value="Trabaho">Trabaho (Employment)</option>
                          <option value="Pag-aaral">Pag-aaral (Education)</option>
                          <option value="Iba pa">Iba pa (Others)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reason for Donating */}
              <div className="bg-white">
                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kadahilanan ng Pagbibigay / Reason for Donating</h3>
                </div>
                <div className="p-6">
                  <label className="block text-sm font-bold text-slate-800 mb-0.5">Kadahilanan ng pagbibigay ng iyong gatas:</label>
                  <textarea name="donation_reason" required rows={2} placeholder="Ilagay ang dahilan dito..." className="w-full border border-slate-300 p-3 rounded-lg text-sm text-slate-800 outline-none focus:border-[#E04A75] mt-2"></textarea>
                </div>
              </div>

              {/* Partner's Consent */}
              <div className="bg-white">
                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pahintulot ng Asawa / Partner's Consent</h3>
                </div>
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <span className="block text-sm font-bold text-slate-800">Papayagan ka ba ng iyong asawa na magbigay ng iyong gatas?</span>
                      <span className="block text-xs text-slate-500 italic">Does the donor have their partner's consent to donate milk?</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <label className="cursor-pointer px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700 has-[:checked]:border-emerald-200"><input type="radio" name="spouse_consent" value="yes" defaultChecked className="mr-1.5 accent-emerald-600" /> OO / N/A</label>
                      <label className="cursor-pointer px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 has-[:checked]:bg-red-50 has-[:checked]:text-red-700 has-[:checked]:border-red-200"><input type="radio" name="spouse_consent" value="no" className="mr-1.5 accent-red-600" /> HINDI</label>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>


          {/* COMBINED CARD 2: THE ENTIRE CLINICAL HEALTH HISTORY (SCREENING I) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-xs font-black text-[#E04A75] uppercase tracking-wider font-heading">Health Screening</h2>
            </div>
            
            <div className="divide-y divide-slate-200">
              
              {/* Pregnancy & Lactation History */}
              <div className="bg-white">
                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pregnancy & Lactation History</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="p-6">
                    <label className="block text-sm font-bold text-slate-800">1. Kailan ang huli mong panganganak?</label>
                    <span className="block text-xs text-slate-500 italic mb-3">When was your most recent childbirth?</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="date" name="last_delivery" required className="w-full border p-2 rounded text-sm text-slate-800 outline-none" />
                      <select name="is_normal_delivery" defaultValue="" required className="w-full border p-2 rounded text-sm text-slate-800 outline-none bg-white">
                        <option value="" disabled>Normal delivery ba ito? (Was it a normal delivery?)</option>
                        <option value="yes">OO (Yes)</option>
                        <option value="no">HINDI (No / C-Section)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <span className="block text-sm font-bold text-slate-800">2. Dati ka na bang nakapagbigay ng iyong gatas na pampasuso?</span>
                        <span className="block text-xs text-slate-500 italic">Have you previously donated your breast milk?</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75] has-[:checked]:border-[#FFDEE4]"><input type="radio" name="prev_donation" value="yes" onChange={() => setHasDonatedBefore('yes')} required className="accent-[#E04A75] mr-1" /> OO</label>
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-slate-200"><input type="radio" name="prev_donation" value="no" onChange={() => setHasDonatedBefore('no')} defaultChecked required className="accent-slate-600 mr-1" /> HINDI</label>
                      </div>
                    </div>
                    {hasDonatedBefore === 'yes' && (
                      <input type="text" name="prev_donation_details" required placeholder="Kung OO, kailan at saan? (If yes, when and where?)" className="w-full border p-2.5 rounded-lg text-sm text-slate-800 outline-none focus:border-[#E04A75] mt-4" />
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <span className="block text-sm font-bold text-slate-800">3. Nagkaroon ba ng pagkakataon na naipagpaliban ang pagbibigay mo ng iyong gatas?</span>
                        <span className="block text-xs text-slate-500 italic">Have you ever been deferred or disqualified from donating?</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75] has-[:checked]:border-[#FFDEE4]"><input type="radio" name="prev_deferral" value="yes" onChange={() => setHasDeferredBefore('yes')} required className="accent-[#E04A75] mr-1" /> OO</label>
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-slate-200"><input type="radio" name="prev_deferral" value="no" onChange={() => setHasDeferredBefore('no')} defaultChecked required className="accent-slate-600 mr-1" /> HINDI</label>
                      </div>
                    </div>
                    {hasDeferredBefore === 'yes' && (
                      <input type="text" name="prev_deferral_details" required placeholder="Kung OO, ibigay ang dahilan at saan? (If yes, reason and where?)" className="w-full border p-2.5 rounded-lg text-sm text-slate-800 outline-none focus:border-[#E04A75] mt-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Mga Karamdaman / Medical History */}
              <div className="bg-white">
                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mga Karamdaman / Medical History</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Nagkaroon ka ba ng alin man sa mga sumusunod? (Have you ever had any of the following?)</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {infectiousDiseases.map((q) => (
                    <div key={q.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <span className="block text-sm font-bold text-slate-700">{q.fil}</span>
                        <span className="block text-xs text-slate-500 italic">{q.eng}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75] has-[:checked]:border-[#FFDEE4]"><input type="radio" name={q.id} value="yes" required className="accent-[#E04A75] mr-1" /> OO</label>
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700 has-[:checked]:border-emerald-200"><input type="radio" name={q.id} value="no" required className="accent-emerald-600 mr-1" /> HINDI</label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lifestyle & Risk Assessment */}
              <div className="bg-white">
                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lifestyle & Risk Assessment</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {riskFactors.map((q) => (
                    <div key={q.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="max-w-xl">
                        <span className="block text-sm font-bold text-slate-700">{q.fil}</span>
                        <span className="block text-xs text-slate-500 italic">{q.eng}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75] has-[:checked]:border-[#FFDEE4]"><input type="radio" name={q.id} value="yes" required className="accent-[#E04A75] mr-1" /> OO</label>
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700 has-[:checked]:border-emerald-200"><input type="radio" name={q.id} value="no" required className="accent-emerald-600 mr-1" /> HINDI</label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Partner Risk Assessment */}
              <div className="bg-white">
                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Partner Risk Assessment</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Ikaw ba ay nagkaroon ng partner na nagkaroon ng alin man sa mga sumusunod? (Has your partner experienced any of the following?)</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {partnerRisks.map((q) => (
                    <div key={q.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="max-w-xl">
                        <span className="block text-sm font-bold text-slate-700">{q.fil}</span>
                        <span className="block text-xs text-slate-500 italic">{q.eng}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75] has-[:checked]:border-[#FFDEE4]"><input type="radio" name={q.id} value="yes" required className="accent-[#E04A75] mr-1" /> OO</label>
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700 has-[:checked]:border-emerald-200"><input type="radio" name={q.id} value="no" required className="accent-emerald-600 mr-1" /> HINDI</label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kalusugan ng anak ng Donor (Infant Health Assessment) */}
              <div className="bg-white">
                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kalusugan ng anak ng Donor (Infant Health Assessment)</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="p-6">
                    <label className="block text-sm font-bold text-slate-800">1. Ilang buwan o taon na ang iyong bunsong anak?</label>
                    <span className="block text-xs text-slate-500 italic mb-3">How old is your youngest child?</span>
                    <select name="infant_age" defaultValue="" required className="w-full border p-2.5 rounded-lg text-sm text-slate-800 outline-none bg-white">
                      <option value="" disabled>Pumili (Select Age Range)</option>
                      <option value="0-10 days">0 day - 10 days</option>
                      <option value="11 days - 7 months">11 days - 7 months</option>
                      <option value="8 months - 2 years">8 months - 2 years</option>
                    </select>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span className="block text-sm font-bold text-slate-800 mb-1">2. Ipinanganak mo ba ang iyong bunsong anak ng husto sa buwan?</span>
                      <span className="block text-xs text-slate-500 italic mb-2">Was your child born full-term?</span>
                      <div className="flex gap-2">
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700"><input type="radio" name="infant_fullterm" value="yes" required className="accent-emerald-600 mr-1" /> OO</label>
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75]"><input type="radio" name="infant_fullterm" value="no" required className="accent-[#E04A75] mr-1" /> HINDI</label>
                      </div>
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-slate-800 mb-1">3. Puro ba na gatas mula sa suso ang ibinibigay mo?</span>
                      <span className="block text-xs text-slate-500 italic mb-2">Exclusively breastfed without formula?</span>
                      <div className="flex gap-2">
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700"><input type="radio" name="infant_exclusive_bm" value="yes" required className="accent-emerald-600 mr-1" /> OO</label>
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75]"><input type="radio" name="infant_exclusive_bm" value="no" required className="accent-[#E04A75] mr-1" /> HINDI</label>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <span className="block text-sm font-bold text-slate-800">4. Nanilaw ba ang iyong bunsong anak?</span>
                        <span className="block text-xs text-slate-500 italic">Did your youngest child develop jaundice?</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75] has-[:checked]:border-[#FFDEE4]"><input type="radio" name="infant_jaundice" value="yes" onChange={() => setInfantJaundice('yes')} required className="accent-[#E04A75] mr-1" /> OO</label>
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-slate-200"><input type="radio" name="infant_jaundice" value="no" onChange={() => setInfantJaundice('no')} defaultChecked required className="accent-slate-600 mr-1" /> HINDI</label>
                      </div>
                    </div>
                    {infantJaundice === 'yes' && (
                      <input type="text" name="jaundice_duration" required placeholder="Kung OO, gaano katagal? (If yes, for how long?)" className="w-full border p-2.5 rounded-lg text-sm text-slate-800 outline-none focus:border-[#E04A75] mt-4" />
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <span className="block text-sm font-bold text-slate-800">5. Nakatanggap ba ang iyong anak ng gatas mula sa ibang ina?</span>
                        <span className="block text-xs text-slate-500 italic">Has your child received breast milk from another mother?</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-[#FFF0F3] has-[:checked]:text-[#E04A75] has-[:checked]:border-[#FFDEE4]"><input type="radio" name="infant_other_milk" value="yes" onChange={() => setInfantOtherMilk('yes')} required className="accent-[#E04A75] mr-1" /> OO</label>
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 has-[:checked]:bg-slate-200"><input type="radio" name="infant_other_milk" value="no" onChange={() => setInfantOtherMilk('no')} defaultChecked required className="accent-slate-600 mr-1" /> HINDI</label>
                      </div>
                    </div>
                    {infantOtherMilk === 'yes' && (
                      <input type="text" name="other_milk_source" required placeholder="Kung OO, saan? (If yes, where/from whom?)" className="w-full border p-2.5 rounded-lg text-sm text-slate-800 outline-none focus:border-[#E04A75] mt-4" />
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* FINAL CLEARANCE DECISION */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-8">
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
              {isSubmitting ? "Committing DOH Clinical Records to Neon..." : "Save Complete Health Screening"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}