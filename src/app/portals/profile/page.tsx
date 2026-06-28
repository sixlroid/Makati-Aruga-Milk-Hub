"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function UniversalProfilePage() {
  const { data: session, update: updateSession } = useSession();
  
  // Extract user info from session safely
  const user = session?.user as any;
  const fullName = user?.fullName || "";
  const email = user?.email || "";
  const role = user?.role || "member";

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

  // Sync state values once NextAuth session asynchronously streams down
  useEffect(() => {
    if (user) {
      setFirstName(initialFirstName);
      setLastName(initialLastName);
      setEmailAddress(email);
    }
  }, [session]);

  // Discard Edits Handler: Flushes changes and reverts back to the original database profile records
  const handleDiscard = () => {
    if (window.confirm("Are you sure you want to discard your unsaved edits?")) {
      setFirstName(initialFirstName);
      setLastName(initialLastName);
      setMiddleInitial("");
      setEmailAddress(email);
      setPhoneNumber("");
    }
  };

 // Update Profile Form Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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

      alert("Profile updated successfully in the database!");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Something went wrong while updating your account details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto p-8 bg-white border border-slate-100 rounded-2xl shadow-sm mt-6">
        
        <h2 className="text-xl font-extrabold text-[#0f172a] tracking-wide uppercase">UPDATE PROFILE</h2>
        <p className="text-sm font-medium text-slate-500 mb-8">Update your personal details...</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
          
          {/* Left Panel: Core IDs */}
          <div className="w-full md:w-2/5 bg-slate-50/60 border border-slate-100 rounded-xl p-6 h-fit">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              {role.charAt(0).toUpperCase() + role.slice(1)} Core IDs
            </h3>
            <div className="space-y-3 text-sm font-bold text-[#0f172a]">
              <p>Tracking No: <span className="font-normal text-slate-600">{user?.tracking_no || "N/A"}</span></p>
              <p>Donor Tracking No: <span className="font-normal text-slate-600">N/A</span></p>
              <p>Receiver Tracking No: <span className="font-normal text-slate-600">N/A</span></p>
            </div>
          </div>
          
          {/* Right Panel: Dynamic Forms */}
          <div className="w-full md:w-3/5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">First Name</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-none focus:border-pink-400 font-medium shadow-sm transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Last Name</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-none focus:border-pink-400 font-medium shadow-sm transition-colors" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Middle Initial</label>
              <input 
                type="text" 
                value={middleInitial}
                onChange={(e) => setMiddleInitial(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-none focus:border-pink-400 font-medium shadow-sm transition-colors" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-none focus:border-pink-400 font-medium shadow-sm transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input 
                  type="text" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-none focus:border-pink-400 font-medium shadow-sm transition-colors" 
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 pt-4 justify-start">
              <button 
                type="button" 
                onClick={handleDiscard}
                className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors text-sm shadow-sm"
              >
                Discard Edits
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#DE3D6D] hover:bg-[#c2325c] text-white font-bold rounded-xl transition-colors text-sm shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? "Updating..." : "Update Profile"}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}