export default function MemberDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 flex font-body">
      {/* Sidebar Placeholder */}
      <div className="w-64 bg-white border-r border-slate-200 p-6 hidden md:block">
        <h2 className="text-xl font-black text-[#E04A75] font-heading mb-8">MAMH Portal</h2>
        <nav className="space-y-2">
          <div className="text-sm font-bold text-[#E04A75] bg-[#FFF0F3] p-3 rounded-lg cursor-pointer">My Dashboard</div>
          <div className="text-sm font-bold text-slate-500 hover:bg-slate-50 p-3 rounded-lg cursor-pointer">Donation History</div>
          <div className="text-sm font-bold text-slate-500 hover:bg-slate-50 p-3 rounded-lg cursor-pointer">Request Milk</div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 lg:p-12">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Member Dashboard</h1>
        <p className="text-slate-500 bg-white p-6 rounded-xl border border-slate-200 mt-6">
          Welcome to the donor and receiver portal! Once the login system is wired up, your real profile data will appear here.
        </p>
      </div>
    </div>
  );
}