'use client';

import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PublicGateway() {
  const [activeTab, setActiveTab] = useState('login');
  const [role, setRole] = useState('member_donor_receiver');

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastName, setLastName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [dob, setDob] = useState('');
  const [ethnicity, setEthnicity] = useState('');
  const [status, setStatus] = useState('Single');
  const [infoSource, setInfoSource] = useState('');
  const [providedId, setProvidedId] = useState('');
  const [loginId, setLoginId] = useState('');
  const router = useRouter();

  const sanitizeDigits = (value: string) => value.replace(/\D/g, '').slice(0, 11);
  const sanitizeLetters = (value: string) => value.replace(/[^A-Za-z]/g, '').slice(0, 2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (activeTab === 'login') {
        const res = await signIn('credentials', {
          redirect: false,
          username: loginId,
          password,
        });

        if (!res?.ok || res?.error) {
          alert('Invalid credentials. Please try again.');
          return;
        }

        router.refresh();

        let session = await getSession();
        for (let attempt = 0; attempt < 3 && !session?.user; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          session = await getSession();
        }

        const userRole = (session?.user as any)?.role;

        if (userRole === 'nurse') router.push('/portals/nurse/dashboard');
        else if (userRole === 'admin') router.push('/portals/admin/dashboard');
        else if (userRole === 'lab') router.push('/portals/lab/dashboard');
        else router.push('/portals/member/dashboard');

        return;
      }

      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      const trimmedMiddleInitial = middleInitial.trim();
      const trimmedDob = dob.trim();
      const trimmedEthnicity = ethnicity.trim();
      const trimmedPhone = phone.trim();
      const trimmedStatus = status.trim();
      const trimmedPassword = password.trim();
      const trimmedEmail = email.trim();
      const trimmedInfoSource = infoSource.trim();
      const trimmedProvidedId = providedId.trim();

      if (!trimmedFirstName || !trimmedLastName || !trimmedDob || !trimmedStatus || !trimmedEthnicity || !trimmedPhone || !trimmedPassword) {
        alert('Please complete all required registration fields.');
        return;
      }

      if (!/^\d{11}$/.test(trimmedPhone)) {
        alert('Phone number must be exactly 11 digits.');
        return;
      }

      if (trimmedMiddleInitial && !/^[A-Za-z]{1,2}$/.test(trimmedMiddleInitial)) {
        alert('Middle initial may only contain letters.');
        return;
      }

      if (role.startsWith('member')) {
        if (!trimmedInfoSource) {
          alert('How did you hear about us is required.');
          return;
        }
      } else if (!trimmedEmail || !trimmedProvidedId) {
        alert('Staff registration requires an email address and staff ID.');
        return;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          phone: trimmedPhone,
          email: trimmedEmail,
          password: trimmedPassword,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          middleInitial: trimmedMiddleInitial,
          dob: trimmedDob,
          ethnicity: trimmedEthnicity,
          status: trimmedStatus,
          infoSource: trimmedInfoSource,
          providedTrackingId: trimmedProvidedId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Registration successful! You can now log in.');
        setActiveTab('login');
        setLoginId(email || phone);
        setPassword('');
      } else {
        alert('Registration failed: ' + (data.error || 'Unknown error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-slate-50 font-sans text-slate-800">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-2">
        <section className="relative overflow-hidden bg-[#FFF1F4] px-8 py-10 lg:px-14 lg:py-14">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl" />
          <div className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-white/40 blur-3xl" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full bg-white/90 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-rose-600 shadow-sm ring-1 ring-rose-100">
                Makati City Operations Portal
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-[#1A1A1A] lg:text-6xl lg:leading-[1.05]">
                Makati Human Milk Bank
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 lg:text-lg">
                A secure public-health platform supporting donor screening,
                milk processing, clinical coordination, and regulated access
                for maternal and neonatal care workflows.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-rose-100 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">
                    Screening
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    Donor intake and review
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">
                    Processing
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    Lab and batch workflow
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">
                    Access
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    Member and staff portals
                  </p>
                </div>
              </div>

              <div className="mt-10 space-y-4">
                <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm shadow-rose-100/40">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-rose-600">
                    Donor Screening
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Structured intake, eligibility review, and guided account
                    verification for qualified donor participation.
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm shadow-rose-100/40">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-rose-600">
                    Laboratory Processing
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Supports controlled handling, pasteurization workflow,
                    labeling, and quality tracking for milk bank operations.
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm shadow-rose-100/40">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-rose-600">
                    Safe Distribution
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Helps coordinate approved donor milk access for infants
                    requiring supported nutritional care.
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm shadow-rose-100/40">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-rose-600">
                    Operations Oversight
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Role-based portal access for administrators, nurses,
                    laboratory staff, and registered members.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-rose-100 bg-white/90 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Clinical Trust
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Built for regulated health-oriented workflows and careful
                  coordination.
                </p>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-white/90 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Public Service
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Supports maternal and infant care through structured digital
                  access.
                </p>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-white/90 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Secure Access
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Account-controlled entry for approved users, staff, and
                  administrators.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white px-8 py-10 lg:px-16 lg:py-14">
          <div className="w-full max-w-xl">
            <div className="rounded-[28px] border border-rose-100 bg-white p-10 shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:p-12">
              <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-600">
                  Public Gateway
                </p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900 lg:text-5xl">
                  Access your portal
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-500">
                  Sign in to continue or create an account for approved member
                  and staff access.
                </p>

                <div className="mt-6 flex gap-8 border-b border-rose-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className={`pb-3 text-sm font-bold uppercase tracking-wide transition ${
                      activeTab === 'login'
                        ? 'border-b-2 border-rose-500 text-rose-600'
                        : 'text-slate-500 hover:text-rose-600'
                    }`}
                  >
                    Account Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className={`pb-3 text-sm font-bold uppercase tracking-wide transition ${
                      activeTab === 'register'
                        ? 'border-b-2 border-rose-500 text-rose-600'
                        : 'text-slate-500 hover:text-rose-600'
                    }`}
                  >
                    Register
                  </button>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {activeTab === 'login' ? (
                  <>
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">
                        Phone Number or Member ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. you@example.com or 09171234567"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">
                        Password
                      </label>
                      <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">
                        Registration Type
                      </label>
                      <select
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="member_donor_receiver">
                          Member (Donor/Receiver)
                        </option>
                        <option value="admin">Administrator</option>
                        <option value="nurse">Nurse/Midwife</option>
                        <option value="lab">Laboratory Staff</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-2/5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                        required
                      />
                      <input
                        type="text"
                        placeholder="M.I."
                        value={middleInitial}
                        onChange={(e) => setMiddleInitial(sanitizeLetters(e.target.value))}
                        className="w-1/5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                        maxLength={2}
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-2/5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                        required
                      />
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-1/2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                        required
                      />
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-1/2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ethnicity"
                        value={ethnicity}
                        onChange={(e) => setEthnicity(e.target.value)}
                        className="w-1/2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                        required
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={phone}
                        onChange={(e) => setPhone(sanitizeDigits(e.target.value))}
                        className="w-1/2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                        required
                      />
                    </div>

                    {role.startsWith('member') ? (
                      <>
                        <input
                          type="email"
                          placeholder="Email (Optional)"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                        />
                        <select
                          value={infoSource}
                          onChange={(e) => setInfoSource(e.target.value)}
                          className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100 ${
                            infoSource === '' ? 'text-slate-400' : 'text-slate-800'
                          }`}
                          required
                        >
                          <option value="" disabled>
                            How did you hear about us?
                          </option>
                          <option value="Acquaintance">Acquaintance</option>
                          <option value="Poster/Pamphlet">Poster/Pamphlet</option>
                          <option value="Others">Others</option>
                        </select>
                      </>
                    ) : (
                      <>
                        <input
                          type="email"
                          placeholder="Staff Email (Required)"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Provided Staff ID (e.g. NID-1024)"
                          value={providedId}
                          onChange={(e) => setProvidedId(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                          required
                        />
                      </>
                    )}

                    <input
                      type="password"
                      placeholder="Set Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                      required
                    />
                  </>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 w-full rounded-2xl bg-[#E04A75] px-4 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#C93660] focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-rose-300"
                >
                  {isSubmitting
                    ? 'Please wait...'
                    : activeTab === 'login'
                      ? 'Login'
                      : 'Agree & Register'}
                </button>
              </form>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-rose-50 px-4 py-4 text-xs leading-5 text-slate-600">
                  Authorized use only. Access may be monitored for security,
                  operations, and compliance purposes.
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-xs leading-5 text-slate-600">
                  For staff accounts, use issued credentials and the assigned
                  operational role during registration.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
