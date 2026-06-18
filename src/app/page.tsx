'use client';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PublicGateway() {
  const [activeTab, setActiveTab] = useState('login');
  const [role, setRole] = useState('member_donor_receiver');
  
  // Form States
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [dob, setDob] = useState('');
  const [ethnicity, setEthnicity] = useState('');
  const [status, setStatus] = useState('Single');
  const [infoSource, setInfoSource] = useState('');
  const [providedId, setProvidedId] = useState('');
  const [loginId, setLoginId] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- LOGIN LOGIC & ROUTING ---
    if (activeTab === 'login') {
      const res = await signIn('credentials', {
        redirect: false,
        username: loginId, // Sends whatever they typed (Email, MTN, or Phone)
        password: password,
      });

      if (res?.error) {
        alert("Invalid credentials. Please try again.");
        return;
      }

      // If successful, grab their session to see what role they have
      const session = await getSession();
      const userRole = (session?.user as any)?.role;

      // THE TRAFFIC COP: Route them to their specific dashboard!
      if (userRole === 'nurse') router.push('/portals/nurse/dashboard');
      else if (userRole === 'admin') router.push('/portals/admin/dashboard');
      else if (userRole === 'lab') router.push('/portals/lab/dashboard');
      else router.push('/portals/member/dashboard');
      
      return;
    }
    
    // --- REGISTRATION LOGIC ---
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        role, phone, email, password, firstName, lastName, 
        middleInitial, dob, ethnicity, status, infoSource,
        providedTrackingId: providedId 
      }),
    });

    const data = await response.json();

    if (response.ok) {
      alert("Registration successful! You can now log in.");
      setActiveTab('login');
      // Automatically fill the login ID field with their new email/phone to save them time
      setLoginId(email || phone); 
      setPassword('');
    } else {
      alert("Registration failed: " + (data.error || "Unknown error"));
    }
  };

  return (
    // CHANGED: font-sans to font-body
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-body bg-white">
      {/* LEFT PANE */}
      <div className="w-full lg:w-1/2 bg-[#FFF0F3] p-8 lg:p-12 flex flex-col justify-between">
        <div>
          {/* CHANGED: font-serif to font-heading */}
          <h1 className="text-3xl lg:text-4xl font-black text-[#1A1A1A] font-heading mb-6">Makati Human Milk Bank</h1>
          <span className="text-xs font-bold text-[#E04A75] uppercase tracking-wider mb-6 block">OPERATIONS PORTAL</span>
          <p className="text-sm text-[#666] leading-relaxed mb-8">Pioneer local government human milk bank in the Philippines ensuring verified clinical access to safe, pasteurized donor breastmilk for NICU patients.</p>

          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-[#FFDEE4]">
              {/* CHANGED: font-serif to font-heading */}
              <h3 className="font-bold text-[#E04A75] text-sm font-heading">MOM'S ACT (RA 10028)</h3>
              <p className="text-xs text-[#666] mt-1">Enabling lactation breaks, designated expression stations, and health tracking.</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-[#FFDEE4]">
              {/* CHANGED: font-serif to font-heading */}
              <h3 className="font-bold text-[#E04A75] text-sm font-heading">SUPSUP TODO CAMPAIGN</h3>
              <p className="text-xs text-[#666] mt-1">LGU community nutrition drive bringing localized milk collections closer to mothers.</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-[#FFDEE4]">
              {/* CHANGED: font-serif to font-heading */}
              <h3 className="font-bold text-[#E04A75] text-sm font-heading">PROJECT MILKY WAY</h3>
              <p className="text-xs text-[#666] mt-1">Securing transport logistics of expressed breastmilk safely to caregivers.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANE */}
      <div className="w-full lg:w-1/2 p-8 lg:p-12 overflow-y-auto h-screen">
        <div className="max-w-md mx-auto w-full">
          <div className="flex gap-8 mb-8 border-b border-[#FFDEE4]">
            <button onClick={() => setActiveTab('login')} className={`pb-2 font-bold uppercase ${activeTab === 'login' ? 'text-[#E04A75] border-b-2 border-[#E04A75]' : 'text-[#666]'}`}>Account Login</button>
            <button onClick={() => setActiveTab('register')} className={`pb-2 font-bold uppercase ${activeTab === 'register' ? 'text-[#E04A75] border-b-2 border-[#E04A75]' : 'text-[#666]'}`}>Register</button>
          </div>

          <form className="space-y-4" onSubmit={handleRegister}>
            {activeTab === 'login' ? (
              // --- LOGIN FORM ---
              <>
                <div>
                  <label className="block text-[10px] font-bold text-[#1A1A1A] uppercase mb-1">Phone Number or Member ID</label>
                  <input type="text" placeholder="e.g. 09171234567 or MTN-1024" value={loginId} onChange={(e) => setLoginId(e.target.value)} className="w-full border border-slate-300 p-3 outline-none placeholder-slate-400 text-slate-800" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#1A1A1A] uppercase mb-1">Password</label>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-slate-300 p-3 outline-none placeholder-slate-400 text-slate-800" required />
                </div>
              </>
            ) : (
              // --- REGISTRATION FORM ---
              <>
                <select className="w-full border border-slate-300 p-3 outline-none text-slate-800" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="member_donor_receiver">Member (Donor/Receiver)</option>
                  <option value="admin">Administrator</option>
                  <option value="nurse">Nurse/Midwife</option>
                  <option value="lab">Laboratory Staff</option>
                </select>

                <div className="flex gap-2">
                  <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-2/5 border border-slate-300 p-3 outline-none placeholder-slate-400 text-slate-800" required />
                  <input type="text" placeholder="M.I." value={middleInitial} onChange={(e) => setMiddleInitial(e.target.value)} className="w-1/5 border border-slate-300 p-3 outline-none placeholder-slate-400 text-slate-800" maxLength={2} />
                  <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-2/5 border border-slate-300 p-3 outline-none placeholder-slate-400 text-slate-800" required />
                </div>

                <div className="flex gap-2">
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-1/2 border border-slate-300 p-3 outline-none placeholder-slate-400 text-slate-800" required />
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-1/2 border border-slate-300 p-3 outline-none text-slate-800">
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <input type="text" placeholder="Ethnicity" value={ethnicity} onChange={(e) => setEthnicity(e.target.value)} className="w-1/2 border border-slate-300 p-3 outline-none placeholder-slate-400 text-slate-800" required />
                  <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-1/2 border border-slate-300 p-3 outline-none placeholder-slate-400 text-slate-800" required />
                </div>

                {role.startsWith('member') ? (
                  <>
                    <input type="email" placeholder="Email (Optional)" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-300 p-3 outline-none placeholder-slate-400 text-slate-800" />
                    <select 
                      value={infoSource} 
                      onChange={(e) => setInfoSource(e.target.value)} 
                      className={`w-full border border-slate-300 p-3 outline-none ${infoSource === '' ? 'text-slate-400' : 'text-slate-800'}`} 
                      required
                    >
                      <option value="" disabled>How did you hear about us?</option>
                      <option value="Acquaintance">Acquaintance</option>
                      <option value="Poster/Pamphlet">Poster/Pamphlet</option>
                      <option value="Others">Others</option>
                    </select>
                  </>
                ) : (
                  <>
                    <input type="email" placeholder="Staff Email (Required)" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-300 p-3 outline-none placeholder-slate-400 text-slate-800" required />
                    <input type="text" placeholder="Provided Staff ID (e.g. NMTN-1024)" value={providedId} onChange={(e) => setProvidedId(e.target.value)} className="w-full border border-slate-300 p-3 outline-none placeholder-slate-400 text-slate-800" required />
                  </>
                )}

                <input type="password" placeholder="Set Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-slate-300 p-3 outline-none placeholder-slate-400 text-slate-800" required />
              </>
            )}

            {/* CHANGED: Added font-heading and tracking-wide to the button */}
            <button type="submit" className="w-full bg-[#E04A75] text-white py-3 font-bold uppercase hover:bg-[#C93660] transition-colors mt-4 font-heading tracking-wide">
              {activeTab === 'login' ? 'Login' : 'Agree & Register'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}