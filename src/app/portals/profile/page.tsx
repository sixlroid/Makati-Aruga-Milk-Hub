"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function UniversalProfilePage() {
  const { data: session, update: updateSession } = useSession();
  
  // Extract user info from session safely
  const user = session?.user as any;
  const fullName = user?.fullName || "";
  const email = user?.email || "";

  // Split name into initial values
  const nameParts = fullName.split(" ");
  const initialFirstName = nameParts[0] || "";
  const initialLastName = nameParts.slice(1).join(" ") || "";

  // Controlled Component States for Form Inputs
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Sync state values once NextAuth session asynchronously streams down
  useEffect(() => {
    if (user) {
      setFirstName(initialFirstName);
      setLastName(initialLastName);
      setEmailAddress(email);
    }
  }, [session, initialFirstName, initialLastName, email]);

  // Discard Edits Handler: Flushes changes and reverts back to the original database profile records
  const handleDiscard = () => {
    if (window.confirm("Are you sure you want to discard your unsaved edits?")) {
      setFirstName(initialFirstName);
      setLastName(initialLastName);
      setMiddleInitial("");
      setEmailAddress(email);
      setPhoneNumber("");
      setMessage(null);
    }
  };

 // Update Profile Form Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const updatedFullName = `${firstName} ${lastName}`.trim();

      // 1. Fire live JSON payloads to the real backend route engine we just built
      const response = await fetch("/api/user/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          firstName, 
          lastName, 
          email: emailAddress, 
          phoneNumber 
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update database profile parameters.");
      }

      // 2. Hot-reload the client-side session state so the system navbar updates instantly!
      if (updateSession) {
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            fullName: updatedFullName,
            email: emailAddress
          }
        });
      }

      setMessage("Profile updated successfully in the database!");
    } catch (error: any) {
      console.error(error);
      setMessage(error.message || "Something went wrong while updating your account details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-12">
      <div className="max-w-5xl mx-auto mt-8 px-4">
        
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider font-heading">Update Profile</h2>
              <p className="text-xs text-slate-500 mt-1">Update your personal details.</p>
            </div>
          </div>
          
          {message && (
            <div className={`rounded-xl border px-3 py-2 text-sm ${message.includes('success') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">First name</span>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                </label>
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Last name</span>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                </label>
              </div>
              <label className="block text-sm text-slate-600">
                <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Middle initial</span>
                <input value={middleInitial} onChange={(e) => setMiddleInitial(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Email address</span>
                  <input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="email or contact alias" />
                </label>
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider font-black text-slate-400">Phone number</span>
                  <input 
                    type="tel"
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} 
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" 
                  />
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={handleDiscard}
                  className="rounded-xl bg-white border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors shadow-sm flex-1"
                >
                  Discard Edits
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="rounded-xl bg-[#E04A75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c83b62] disabled:opacity-60 transition-colors shadow-sm flex-1"
                >
                  {isSubmitting ? 'Saving…' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}