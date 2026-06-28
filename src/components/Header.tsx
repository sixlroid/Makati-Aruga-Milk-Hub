'use client';
import { useState } from 'react'; // <-- Added useState import
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navLinks: Record<string, { label: string; href: string }[]> = {
  admin: [
    { label: 'System Overview', href: '/portals/admin/dashboard' },
    { label: 'User Directory', href: '/portals/admin/users ' },
    { label: 'Reports', href: '/portals/admin/reports' },
    { label: 'Audit Logs', href: '/portals/admin/audit' },
  ],
  nurse: [
    { label: 'Collecting & Dispensing', href: '/portals/nurse/dashboard#collecting' },
    { label: 'Health Screening', href: '/portals/nurse/screenings/new' },
    { label: 'Inquiries', href: '/portals/nurse/inquiries' },
  ],
  lab: [
    { label: 'Vault Overview', href: '/portals/lab/dashboard' },
    { label: 'Matrix Inventory', href: '/portals/lab/inventory' },
    { label: 'Quality Assurance (QA)', href: '/portals/lab/qa' },
  ],
  member: [
    { label: 'My Dashboard', href: '/portals/member/dashboard' },
    { label: 'Donation Ledger', href: '/portals/member/donations' },
    { label: 'Request Milk', href: '/portals/member/request' },
  ],
};

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false); // <-- Track dropdown menu visibility

  if (pathname === '/') return null;

  const rawRole = (session?.user as { role?: string; tracking_no?: string })?.role;
  const roleMap: Record<string, string> = {
    'member_donor_receiver': 'member',
    'MEMBER_DONOR_RECEIVER': 'member',
    'nurse_midwife': 'nurse',
    'NURSE_MIDWIFE': 'nurse',
    'laboratory_staff': 'lab',
    'LABORATORY_STAFF': 'lab',
    'administrator': 'admin',
    'ADMINISTRATOR': 'admin',
  };
  const role = rawRole ? (roleMap[rawRole] ?? rawRole) : undefined;
  const trackingNo = (session?.user as { role?: string; tracking_no?: string })?.tracking_no;
  const links = role ? navLinks[role] ?? [] : [];

  if (!session) return null;

  return (
    <header className="w-full bg-white border-b border-slate-200 shadow-sm relative">
      <div className="px-6 h-16 flex items-center justify-between gap-6">

        {/* Left: Logo + Name */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#E04A75]" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 2 12 2z" />
            </svg>
          </div>
          <span className="text-base font-black text-slate-800 tracking-tight">
            Makati Human Milk Bank
          </span>
        </div>

        {/* Center: Nav links */}
        {links.length > 0 && (
          <nav className="flex items-center gap-6 flex-1 justify-center">
            {links.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-[#E04A75] hover:bg-pink-50 rounded-lg transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right: Dynamic Profile Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 border border-pink-200 rounded-xl bg-pink-50/50 hover:bg-pink-50 transition-all text-sm font-semibold text-slate-700 hover:text-[#E04A75] focus:outline-none focus:ring-2 focus:ring-pink-300/50"
          >
            <span>Mabuhay, {(session.user as any).fullName || 'User'}!</span>
            <svg
              className={`w-4 h-4 text-[#E04A75] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-pink-100 rounded-xl shadow-md py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
              {/* Edit Profile Action */}
              {/* Edit Profile Action */}
                <Link
                  href="/portals/profile" // <-- Change this to a static universal link
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:text-[#E04A75] hover:bg-pink-50 transition-colors font-semibold border-b"
                >
                <svg className="w-4 h-4 mr-2 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Edit Profile
              </Link>

              {/* Sign Out Action */}
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  signOut({ callbackUrl: '/' });
                }}
                className="flex items-center w-full px-4 py-2.5 text-sm text-[#E04A75] hover:bg-pink-50/70 transition-colors font-semibold text-left"
              >
                <svg className="w-4 h-4 mr-2 text-[#E04A75]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}