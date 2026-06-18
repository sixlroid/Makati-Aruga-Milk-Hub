export default function NurseDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <div className="w-64 bg-white border-r border-slate-200 p-6 hidden md:block">
        <h2 className="text-xl font-black text-[#E04A75] font-serif mb-8">MAMH Clinical</h2>
        <nav className="space-y-2">
          <div className="text-sm font-bold text-[#E04A75] bg-[#FFF0F3] p-3 rounded-lg cursor-pointer">Overview</div>
          <div className="text-sm font-bold text-slate-500 hover:bg-slate-50 p-3 rounded-lg cursor-pointer">Health Screenings</div>
          <div className="text-sm font-bold text-slate-500 hover:bg-slate-50 p-3 rounded-lg cursor-pointer">Log Collection</div>
        </nav>
      </div>

      <div className="flex-1 p-8 lg:p-12">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Nurse Station</h1>
        <p className="text-slate-500 bg-white p-6 rounded-xl border border-slate-200 mt-6">
          Welcome, Nurse. This is where you will manage donor screenings, view uploaded medical documents, and log raw milk collections.
        </p>
      </div>
    </div>
  );
}