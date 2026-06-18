export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <div className="w-64 bg-[#1A1A1A] text-white border-r border-slate-800 p-6 hidden md:block">
        <h2 className="text-xl font-black text-white font-serif mb-8">MAMH Admin</h2>
        <nav className="space-y-2">
          <div className="text-sm font-bold text-white bg-slate-800 p-3 rounded-lg cursor-pointer">System Overview</div>
          <div className="text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-lg cursor-pointer">Staff Management</div>
          <div className="text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-lg cursor-pointer">Audit Logs</div>
        </nav>
      </div>

      <div className="flex-1 p-8 lg:p-12">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Administrator Panel</h1>
        <p className="text-slate-500 bg-white p-6 rounded-xl border border-slate-200 mt-6">
          Welcome, Admin. This is your master view of all operations, staff accounts, and financial transactions.
        </p>
      </div>
    </div>
  );
}