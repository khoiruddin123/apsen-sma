"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import { QRCodeSVG } from "qrcode.react";

export default function TeacherPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);

  // Form Buka Sesi
  const [selectedClass, setSelectedClass] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);

  // Active Session State
  const [activeSession, setActiveSession] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  // Modal Manual Attendance
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [manualStatus, setManualStatus] = useState<"hadir" | "sakit" | "izin" | "alpa">("hadir");
  const [manualNotes, setManualNotes] = useState("");
  const [updatingManual, setUpdatingManual] = useState(false);

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
      if (!data.user || (data.user.role !== "guru" && data.user.role !== "admin")) {
        router.push("/");
        return;
      }
      setUser(data.user);
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
      if (data.classes) {
        setClasses(data.classes);
        if (data.classes.length > 0) {
          setSelectedClass(data.classes[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Poll Attendance Records every 3 seconds if active session exists
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      fetchAttendanceRecords(activeSession.id);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchAttendanceRecords = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/teacher/attendance?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.records) {
        setAttendanceRecords(data.records);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName || !selectedClass) return;
    setCreatingSession(true);

    try {
      const res = await fetch("/api/teacher/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_name: subjectName,
          class_id: selectedClass,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal membuka sesi.");
      } else {
        setActiveSession(data.session);
        fetchAttendanceRecords(data.session.id);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    if (!confirm("Apakah Anda yakin ingin menutup Sesi KBM ini?")) return;

    try {
      const res = await fetch("/api/teacher/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });

      if (res.ok) {
        setActiveSession(null);
        setAttendanceRecords([]);
        alert("Sesi KBM Berhasil Ditutup.");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveManualAttendance = async () => {
    if (!selectedStudent || !activeSession) return;
    setUpdatingManual(true);

    try {
      const res = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          studentId: selectedStudent.student_id,
          status: manualStatus,
          notes: manualNotes,
        }),
      });

      if (res.ok) {
        fetchAttendanceRecords(activeSession.id);
        setSelectedStudent(null);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingManual(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-semibold">
        Memuat Portal Guru...
      </div>
    );
  }

  const hadirCount = attendanceRecords.filter((r) => r.status === "hadir").length;
  const totalCount = attendanceRecords.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-6">
        {/* Banner Welcome Guru */}
        <div className="navy-gradient border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              👨‍🏫 Portal Guru Mata Pelajaran
            </span>
            <h2 className="text-2xl font-black mt-2">Selamat Mengajar, {user.name}!</h2>
            <p className="text-sm text-slate-300 mt-1">
              Buka Sesi KBM, tampilkan QR Code ke murid di proyektor kelas, atau lakukan absensi manual.
            </p>
          </div>
          <div className="text-5xl">📖</div>
        </div>

        {/* Jika belum ada sesi aktif: Tampilkan Form Buka Sesi */}
        {!activeSession ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🚀 Buka Sesi KBM / Jam Pelajaran Baru</span>
              </h3>
              <p className="text-xs text-slate-400">
                Pilih mata pelajaran dan kelas SMA yang sedang Anda ajar jam ini.
              </p>
            </div>

            <form onSubmit={handleOpenSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Contoh: Fisika, Matematika, Bahasa Indonesia"
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Pilih Kelas SMA
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.major})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={creatingSession}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                {creatingSession ? (
                  <span>Membuka Sesi...</span>
                ) : (
                  <>
                    <span>Buka Sesi & Tampilkan QR Pelajaran</span>
                    <span>➔</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Jika Sesi Aktif Berlangsung */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: QR Code Display for Projector */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center text-center justify-between">
              <div>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-3 py-1 rounded-full font-extrabold animate-pulse">
                  🔴 SESI KBM AKTIF
                </span>
                <h3 className="text-xl font-extrabold text-white mt-3">{activeSession.subject_name}</h3>
                <p className="text-sm font-semibold text-blue-400 mt-0.5">{activeSession.class_name}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Tampilkan QR Code ini di layar proyektor depan kelas agar murid memindai via HP.
                </p>
              </div>

              {/* QR Code Canvas */}
              <div className="bg-white p-4 rounded-2xl shadow-2xl border-4 border-blue-600 my-4">
                <QRCodeSVG value={activeSession.qr_token} size={220} level="H" />
              </div>

              <div className="w-full space-y-2">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
                  Kode QR Token: <span className="font-bold text-blue-400">{activeSession.qr_token}</span>
                </div>
                <button
                  onClick={handleCloseSession}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all"
                >
                  🔒 Tutup Sesi Pembelajaran
                </button>
              </div>
            </div>

            {/* Right Column: Live Attendance List & Manual Action */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 gap-2">
                <div>
                  <h3 className="font-bold text-lg text-white">📋 Pemantauan Kehadiran Real-time</h3>
                  <p className="text-xs text-slate-400">
                    Otomatis diperbarui setiap 3 detik. Klik baris nama murid untuk absensi manual.
                  </p>
                </div>
                <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold text-emerald-400">
                  Hadir: {hadirCount} / {totalCount} Siswa
                </div>
              </div>

              {/* Table Attendance Records */}
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-3">Siswa</th>
                      <th className="p-3">NISN</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Waktu Presensi</th>
                      <th className="p-3 text-right">Aksi Manual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-medium">
                    {attendanceRecords.map((r) => (
                      <tr key={r.student_id} className="hover:bg-slate-800/60 transition-all">
                        <td className="p-3 font-bold text-white">{r.student_name}</td>
                        <td className="p-3 font-mono text-slate-400">{r.student_nisn}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                              r.status === "hadir"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : r.status === "sakit"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : r.status === "izin"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-400">
                          {r.scanned_at ? new Date(r.scanned_at).toLocaleTimeString() : "-"}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedStudent(r)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 rounded-lg text-xs font-semibold"
                          >
                            ✏️ Edit Status
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Absen Manual Guru */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white">✏️ Absen Manual Siswa</h3>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-slate-400 hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                <p className="font-bold text-white text-sm">{selectedStudent.student_name}</p>
                <p className="font-mono text-slate-400">NISN: {selectedStudent.student_nisn}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                  Pilih Status Kehadiran
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["hadir", "sakit", "izin", "alpa"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setManualStatus(st)}
                      className={`py-2 text-xs font-extrabold uppercase rounded-xl transition-all ${
                        manualStatus === st
                          ? st === "hadir"
                            ? "bg-emerald-600 text-white"
                            : st === "sakit"
                            ? "bg-amber-600 text-white"
                            : st === "izin"
                            ? "bg-blue-600 text-white"
                            : "bg-rose-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Contoh: Ada Surat Dokter"
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveManualAttendance}
                  disabled={updatingManual}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
                >
                  {updatingManual ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
