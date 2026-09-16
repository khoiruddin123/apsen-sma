"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";

export default function WaliKelasPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  useEffect(() => {
    fetchUserSession();
    fetchClasses();
  }, []);

  const fetchUserSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/");
        return;
      }
      const data = await res.json();
      if (!data.user || (data.user.role !== "wali_kelas" && data.user.role !== "admin")) {
        router.push("/");
        return;
      }
      setUser(data.user);
      fetchSummary(data.user.classId || "cls-xi-ipa1");
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/classes");
      const data = await res.json();
      if (data.classes) setClassesList(data.classes);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSummary = async (classId: string) => {
    try {
      const res = await fetch(`/api/walikelas/summary?classId=${classId}`);
      const data = await res.json();
      if (data.summary) {
        setClassInfo(data.classInfo);
        setSummary(data.summary);
        setSelectedClassId(classId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    if (!summary || !summary.studentRecap) return;
    const headers = ["NISN", "Nama Siswa", "Hadir", "Sakit", "Izin", "Alpa"];
    const rows = summary.studentRecap.map((s: any) => [
      s.nisn,
      `"${s.name}"`,
      s.total_hadir,
      s.total_sakit,
      s.total_izin,
      s.total_alpa,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Presensi_${classInfo?.name || "Kelas"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-semibold">
        Memuat Portal Wali Kelas...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-6">
        {/* Banner Welcome Wali Kelas */}
        <div className="navy-gradient border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              👨‍💼 Portal Wali Kelas
            </span>
            <h2 className="text-2xl font-black mt-2">Selamat Datang, {user.name}!</h2>
            <p className="text-sm text-slate-300 mt-1">
              Pantau aktivitas pembelajaran guru mapel & rekapitulasi kehadiran siswa di kelas bimbingan Anda.
            </p>
          </div>
          <div className="text-5xl">📊</div>
        </div>

        {/* Filter Kelas Selector (khusus Admin atau jika Wali Kelas ingin ubah kelas) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase">Kelas Bimbingan Dipilih:</span>
            <select
              value={selectedClassId}
              onChange={(e) => fetchSummary(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2"
            >
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.major})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30"
          >
            <span>📥 Export Laporan (Excel / CSV)</span>
          </button>
        </div>

        {/* Top Summary Statistic Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-2xl font-bold">
                👥
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Total Siswa</p>
                <h3 className="text-2xl font-black text-white">{summary.totalStudents} Siswa</h3>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-2xl font-bold">
                📚
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Total Sesi KBM</p>
                <h3 className="text-2xl font-black text-white">{summary.totalSessions} Sesi</h3>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl font-bold">
                🔴
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Sesi Pembelajaran Aktif</p>
                <h3 className="text-2xl font-black text-emerald-400">
                  {summary.activeSessions.length} Pelajaran Berlangsung
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Monitoring Aktivitas Pembelajaran Guru di Kelas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <span>👨‍🏫 Monitoring Aktivitas Pembelajaran Guru</span>
            </h3>
            <p className="text-xs text-slate-400">
              Melihat guru mata pelajaran mana saja yang sedang / telah mengajar di kelas bimbingan Anda.
            </p>
          </div>

          {summary && summary.activeSessions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {summary.activeSessions.map((s: any) => (
                <div
                  key={s.id}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded font-extrabold uppercase animate-pulse">
                      Sedang Mengajar
                    </span>
                    <h4 className="font-bold text-white text-base mt-1">{s.subject_name}</h4>
                    <p className="text-xs text-slate-400">Pengampu: {s.teacher_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-mono">Mulai: {s.start_time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
              Saat ini tidak ada sesi jam pelajaran yang sedang berlangsung.
            </div>
          )}
        </div>

        {/* Section 2: Rekapitulasi Presensi Kumulatif Siswa */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <span>📊 Rekapitulasi Presensi Kumulatif Siswa</span>
            </h3>
            <p className="text-xs text-slate-400">
              Total statistik kehadiran siswa per mata pelajaran di kelas {classInfo?.name || ""}.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Nama Siswa</th>
                  <th className="p-3">NISN</th>
                  <th className="p-3 text-emerald-400 text-center">Hadir</th>
                  <th className="p-3 text-amber-400 text-center">Sakit</th>
                  <th className="p-3 text-blue-400 text-center">Izin</th>
                  <th className="p-3 text-rose-400 text-center">Alpa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {summary &&
                  summary.studentRecap.map((s: any) => (
                    <tr key={s.student_id} className="hover:bg-slate-800/60 transition-all">
                      <td className="p-3 font-bold text-white">{s.name}</td>
                      <td className="p-3 font-mono text-slate-400">{s.nisn}</td>
                      <td className="p-3 text-center font-bold text-emerald-400">{s.total_hadir}</td>
                      <td className="p-3 text-center font-bold text-amber-400">{s.total_sakit}</td>
                      <td className="p-3 text-center font-bold text-blue-400">{s.total_izin}</td>
                      <td className="p-3 text-center font-bold text-rose-400">{s.total_alpa}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
