"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import { QRCodeSVG } from "qrcode.react";
import * as XLSX from "xlsx";

export default function TeacherPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);

  // Form Buka Sesi
  const [selectedClass, setSelectedClass] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);

  // Active Session & Monitoring
  const [activeSession, setActiveSession] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | "hadir" | "alpa" | "izin_sakit">("semua");

  // Projector Fullscreen Modal State
  const [showProjectorModal, setShowProjectorModal] = useState(false);

  // Jurnal Guru Modal State
  const [showJurnalModal, setShowJurnalModal] = useState(false);
  const [jurnalTopic, setJurnalTopic] = useState("Pembahasan Materi Pembelajaran Utama & Diskusi Kelompok");
  const [jurnalSaved, setJurnalSaved] = useState(false);

  // Manual Edit Modal State
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [manualStatus, setManualStatus] = useState<"hadir" | "sakit" | "izin" | "alpa">("hadir");
  const [manualNotes, setManualNotes] = useState("");
  const [updatingManual, setUpdatingManual] = useState(false);

  // Copy Feedback State
  const [copiedToken, setCopiedToken] = useState(false);

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
      if (!data.user || (data.user.role !== "guru" && data.user.role !== "admin" && data.user.role !== "wali_kelas")) {
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
          const defaultCls = data.classes.find((c: any) => c.id === "cls-xi-ipa1") || data.classes[0];
          setSelectedClass(defaultCls.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Poll attendance records when activeSession is set
  useEffect(() => {
    if (!activeSession) return;
    fetchAttendanceRecords(activeSession.id);

    const interval = setInterval(() => {
      fetchAttendanceRecords(activeSession.id);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchAttendanceRecords = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/teacher/attendance?sessionId=${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.records) {
        setAttendanceRecords(data.records);
      }
    } catch (err) {
      // Ignore network glitch during auto refresh
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
    if (!confirm("Apakah Anda yakin ingin menutup Sesi KBM ini? Kehadiran akan dikunci.")) return;

    try {
      const res = await fetch("/api/teacher/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });

      if (res.ok) {
        setActiveSession(null);
        setAttendanceRecords([]);
        setShowProjectorModal(false);
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

  // Tandai Semua Hadir
  const handleMarkAllHadir = async () => {
    if (!activeSession || attendanceRecords.length === 0) return;
    if (!confirm("Apakah Anda yakin ingin menandai semua siswa sebagai HADIR?")) return;

    for (const r of attendanceRecords) {
      if (r.status !== "hadir") {
        await fetch("/api/teacher/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: activeSession.id,
            studentId: r.student_id,
            status: "hadir",
            notes: "Masal Guru",
          }),
        });
      }
    }
    fetchAttendanceRecords(activeSession.id);
  };

  // Reset Kehadiran
  const handleResetAttendance = async () => {
    if (!activeSession || attendanceRecords.length === 0) return;
    if (!confirm("Apakah Anda yakin ingin mereset semua presensi siswa ke ALPA?")) return;

    for (const r of attendanceRecords) {
      await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          studentId: r.student_id,
          status: "alpa",
          notes: null,
        }),
      });
    }
    fetchAttendanceRecords(activeSession.id);
  };

  // Unduh Laporan Sesi Excel (.xlsx) Rapi
  const handleDownloadSessionExcel = () => {
    if (!activeSession || attendanceRecords.length === 0) return;

    const today = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const hadirCount = attendanceRecords.filter((r) => r.status === "hadir").length;
    const sakitCount = attendanceRecords.filter((r) => r.status === "sakit").length;
    const izinCount = attendanceRecords.filter((r) => r.status === "izin").length;
    const alpaCount = attendanceRecords.filter((r) => r.status === "alpa").length;

    const excelData: any[][] = [
      ["LAPORAN PRESENSI SESI JAM PELAJARAN"],
      [`Mata Pelajaran: ${activeSession.subject_name}`],
      [`Kelas: ${activeSession.class_name}`],
      [`Guru Pengampu: ${user?.name || "-"}  |  Tanggal: ${today}`],
      [`Ringkasan Kehadiran: HADIR (${hadirCount}) | SAKIT (${sakitCount}) | IZIN (${izinCount}) | ALPA (${alpaCount})`],
      [""], // Empty spacing row
      [
        "NO",
        "NISN",
        "NAMA LENGKAP SISWA",
        "STATUS KEHADIRAN",
        "WAKTU PRESENSI",
        "METODE PRESENSI",
        "CATATAN GURU",
      ],
    ];

    attendanceRecords.forEach((r, idx) => {
      excelData.push([
        idx + 1,
        r.student_nisn,
        r.student_name,
        r.status.toUpperCase(),
        r.scanned_at ? new Date(r.scanned_at).toLocaleTimeString("id-ID") : "Belum Presensi",
        r.status === "hadir" ? "QR Scan Mandiri" : r.source === "manual_guru" ? "Manual Guru" : "-",
        r.notes || "-",
      ]);
    });

    excelData.push([""]); // Spacing row
    excelData.push([
      "TOTAL TERDAFTAR",
      "",
      "",
      `${attendanceRecords.length} Siswa`,
      `Persentase Hadir: ${Math.round((hadirCount / (attendanceRecords.length || 1)) * 100)}%`,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(excelData);

    ws["!cols"] = [
      { wch: 6 },  // NO
      { wch: 18 }, // NISN
      { wch: 30 }, // NAMA LENGKAP SISWA
      { wch: 20 }, // STATUS KEHADIRAN
      { wch: 18 }, // WAKTU PRESENSI
      { wch: 20 }, // METODE PRESENSI
      { wch: 28 }, // CATATAN GURU
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Presensi Sesi KBM");

    const cleanSubject = activeSession.subject_name.replace(/\s+/g, "_");
    const cleanClass = activeSession.class_name.replace(/\s+/g, "_");
    XLSX.writeFile(wb, `Laporan_Sesi_${cleanSubject}_${cleanClass}.xlsx`);
  };

  // Unduh Laporan Sesi CSV Real
  const handleDownloadSessionCSV = () => {
    if (!activeSession || attendanceRecords.length === 0) return;
    const headers = ["NISN", "Nama Siswa", "Status Kehadiran", "Waktu Presensi", "Metode Presensi", "Catatan"];
    const rows = attendanceRecords.map((r) => [
      r.student_nisn,
      `"${r.student_name}"`,
      r.status.toUpperCase(),
      r.scanned_at ? new Date(r.scanned_at).toLocaleTimeString() : "Belum Presensi",
      r.status === "hadir" ? "QR Scan Mandiri" : r.source === "manual_guru" ? "Manual Guru" : "-",
      `"${r.notes || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Sesi_${activeSession.subject_name.replace(/\s+/g, "_")}_${activeSession.class_name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy QR Token to Clipboard
  const handleCopyToken = () => {
    if (!activeSession?.qr_token) return;
    navigator.clipboard.writeText(activeSession.qr_token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Initials generator
  const getInitials = (name: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Statistics Calculations
  const totalCount = attendanceRecords.length;
  const hadirCount = attendanceRecords.filter((r) => r.status === "hadir").length;
  const izinSakitCount = attendanceRecords.filter((r) => r.status === "sakit" || r.status === "izin").length;
  const alpaCount = attendanceRecords.filter((r) => r.status === "alpa").length;

  const hadirPercent = totalCount > 0 ? Math.round((hadirCount / totalCount) * 100) : 0;
  const izinPercent = totalCount > 0 ? Math.round((izinSakitCount / totalCount) * 100) : 0;
  const alpaPercent = totalCount > 0 ? Math.round((alpaCount / totalCount) * 100) : 0;

  // Filtered Students List
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((r) => {
      const matchSearch =
        r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.student_nisn.includes(searchTerm);

      if (!matchSearch) return false;

      if (filterStatus === "hadir") return r.status === "hadir";
      if (filterStatus === "alpa") return r.status === "alpa";
      if (filterStatus === "izin_sakit") return r.status === "sakit" || r.status === "izin";

      return true;
    });
  }, [attendanceRecords, searchTerm, filterStatus]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 font-semibold text-xs">
        Memuat Portal Guru Pengampu...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      <Navbar user={user} isLiveSession={!!activeSession} />

      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        
        {/* Top Banner Welcome & Session Info Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2.5 py-0.5 rounded-md font-semibold tracking-wider uppercase">
                Portal Guru Pengampu
              </span>
              {activeSession && (
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] px-2.5 py-0.5 rounded-md font-semibold uppercase tracking-wider inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  Sesi KBM Sedang Berlangsung
                </span>
              )}
            </div>
            
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Selamat Mengajar, {user.name}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{activeSession ? activeSession.subject_name : "Sistem Presensi Akademik Real-time"}</span>
              <span>•</span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200">
                {activeSession ? activeSession.class_name : "Kelas 5A"}
              </span>
              <span>•</span>
              <span>Semester Genap 2023/2024</span>
              <span>•</span>
              <span className="text-slate-500 font-mono">07:30 – 09:00 WIB</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowJurnalModal(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Jurnal Guru</span>
            </button>

            <button
              onClick={() => activeSession && fetchAttendanceRecords(activeSession.id)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sinkronisasi Live</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: HADIR */}
          <div className="bg-white border-2 border-emerald-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between transition-all hover:border-emerald-300">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">HADIR</span>
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">{hadirCount}</span>
                <span className="text-xs font-medium text-slate-500">Siswa</span>
              </div>
            </div>
            <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
              {hadirPercent}%
            </div>
          </div>

          {/* Card 2: IZIN / SAKIT */}
          <div className="bg-white border-2 border-amber-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between transition-all hover:border-amber-300">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">IZIN / SAKIT</span>
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">{izinSakitCount}</span>
                <span className="text-xs font-medium text-slate-500">Siswa</span>
              </div>
            </div>
            <div className="bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
              {izinPercent}%
            </div>
          </div>

          {/* Card 3: BELUM PRESENSI / ALPA */}
          <div className="bg-white border-2 border-rose-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between transition-all hover:border-rose-300">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">BELUM PRESENSI / ALPA</span>
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">{alpaCount}</span>
                <span className="text-xs font-medium text-slate-500">Siswa</span>
              </div>
            </div>
            <div className="bg-rose-50 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-200">
              {alpaPercent}%
            </div>
          </div>

          {/* Card 4: TOTAL TERDAFTAR */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">TOTAL TERDAFTAR</span>
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">{totalCount}</span>
                <span className="text-xs font-medium text-slate-500">Siswa</span>
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {activeSession ? activeSession.class_name : "Kelas 5A"}
            </div>
          </div>
        </div>

        {/* jika BELUM ada sesi aktif: Form Buka Sesi */}
        {!activeSession ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs max-w-xl mx-auto space-y-6">
            <div className="border-b border-slate-100 pb-4 text-center sm:text-left">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-3 py-1 rounded-md font-bold uppercase tracking-wider inline-block mb-2">
                Mulai Pembelajaran Baru
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Buka Sesi KBM & Tampilkan QR Code
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pilih mata pelajaran dan kelas bimbingan yang sedang Anda ajar jam ini.
              </p>
            </div>

            <form onSubmit={handleOpenSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Contoh: Matematika Peminatan, Fisika, Bahasa Indonesia"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Pilih Kelas
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors cursor-pointer"
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
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60"
              >
                {creatingSession ? (
                  <span>Membuka Sesi Pembelajaran...</span>
                ) : (
                  <>
                    <span>Buka Sesi & Tampilkan QR Code Proyektor</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          
          /* SESI KBM AKTIF: Grid 2 Kolom Layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: QR Code Display Card (Projector View) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col items-center justify-between text-center space-y-5">
              
              <div className="w-full space-y-2">
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-3 py-1 rounded-md font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  SESI KBM AKTIF
                </span>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">QR Code Presensi Cepat</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Tampilkan di proyektor kelas atau monitor guru agar siswa dapat memindai langsung via ponsel pintar.
                </p>
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[11px] px-3 py-1 rounded-full font-semibold border border-emerald-200">
                  <svg className="w-3.5 h-3.5 text-emerald-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Auto-refresh token: 45 detik</span>
                </div>
              </div>

              {/* Large QR Code with corner brackets overlay */}
              <div className="relative bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-md flex items-center justify-center my-2 group">
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-500"></div>
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-500"></div>
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-500"></div>
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-500"></div>

                <QRCodeSVG value={activeSession.qr_token} size={210} level="H" />
              </div>

              {/* QR Token Box & Copy Button */}
              <div className="w-full space-y-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 flex items-center justify-between px-4">
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">KODE QR TOKEN:</span>
                    <span className="font-extrabold text-blue-600 text-sm tracking-wider">{activeSession.qr_token}</span>
                  </div>
                  <button
                    onClick={handleCopyToken}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    {copiedToken ? "Tersalin" : "Salin Token"}
                  </button>
                </div>

                {/* Projector Fullscreen Action */}
                <button
                  onClick={() => setShowProjectorModal(true)}
                  className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span>Mode Layar Penuh (Proyektor)</span>
                </button>

                {/* Tutup Sesi Primary Button */}
                <button
                  onClick={handleCloseSession}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Tutup Sesi Pembelajaran</span>
                </button>

                <p className="text-[10px] text-slate-400 font-medium">
                  Menutup sesi akan mengunci kehadiran dan mengekspor rekap presensi.
                </p>
              </div>
            </div>

            {/* Right Column: Real-time Attendance List & Monitoring */}
            <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              
              {/* Monitoring Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>Pemantauan Kehadiran Real-time</span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded font-bold">
                      ● Live 3s
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Otomatis diperbarui setiap 3 detik. Guru dapat mengubah status secara manual.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-bold text-blue-800">
                    Hadir: {hadirCount} / {totalCount} Siswa
                  </div>
                  <button
                    onClick={handleDownloadSessionExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
                    title="Export Presensi Sesi ke Excel (.xlsx)"
                  >
                    <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={handleDownloadSessionCSV}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors cursor-pointer text-xs font-bold"
                    title="Unduh Laporan Sesi (CSV)"
                  >
                    CSV
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari nama siswa atau NISN..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setFilterStatus("semua")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      filterStatus === "semua"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Semua ({totalCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus("hadir")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      filterStatus === "hadir"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    Hadir ({hadirCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus("alpa")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      filterStatus === "alpa"
                        ? "bg-rose-600 text-white"
                        : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                    }`}
                  >
                    Alpa ({alpaCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus("izin_sakit")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      filterStatus === "izin_sakit"
                        ? "bg-amber-600 text-white"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                    }`}
                  >
                    Izin/Sakit ({izinSakitCount})
                  </button>
                </div>
              </div>

              {/* Table Component */}
              <div className="overflow-x-auto max-h-[460px] border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">SISWA</th>
                      <th className="p-3">NISN</th>
                      <th className="p-3">STATUS</th>
                      <th className="p-3">WAKTU PRESENSI</th>
                      <th className="p-3">METODE</th>
                      <th className="p-3 text-right">AKSI MANUAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredRecords.map((r, index) => (
                      <tr key={r.student_id} className="hover:bg-slate-50/80 transition-all">
                        
                        {/* Student Name & Avatar */}
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${
                                r.status === "hadir"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : r.status === "sakit"
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : r.status === "izin"
                                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                                  : "bg-rose-100 text-rose-800 border border-rose-300"
                              }`}
                            >
                              {getInitials(r.student_name)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-xs leading-tight">{r.student_name}</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                {activeSession.class_name} • No. Absen {String(index + 1).padStart(2, "0")}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* NISN */}
                        <td className="p-3 font-mono font-semibold text-slate-600">{r.student_nisn}</td>

                        {/* Status Pill */}
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 ${
                              r.status === "hadir"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : r.status === "sakit"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : r.status === "izin"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                r.status === "hadir"
                                  ? "bg-emerald-500"
                                  : r.status === "sakit"
                                  ? "bg-amber-500"
                                  : r.status === "izin"
                                  ? "bg-blue-500"
                                  : "bg-rose-500"
                              }`}
                            ></span>
                            {r.status}
                          </span>
                        </td>

                        {/* Waktu Presensi */}
                        <td className="p-3 font-mono text-slate-500 text-[11px]">
                          {r.scanned_at ? new Date(r.scanned_at).toLocaleTimeString() : "Belum Presensi"}
                        </td>

                        {/* Metode */}
                        <td className="p-3">
                          {r.status === "hadir" ? (
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1">
                              QR Scan
                            </span>
                          ) : r.source === "manual_guru" ? (
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1">
                              Manual
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Aksi Manual */}
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedStudent(r)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
                          >
                            Edit Status
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Table Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-3 gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkAllHadir}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                  >
                    Tandai Semua Hadir
                  </button>
                  <button
                    onClick={handleResetAttendance}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                  >
                    Reset Kehadiran
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 font-medium">
                  Menampilkan <span className="font-bold text-slate-900">{filteredRecords.length}</span> dari <span className="font-bold text-slate-900">{totalCount}</span> total siswa terdaftar
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Jurnal Guru Modal */}
      {showJurnalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Jurnal Kegiatan Mengajar Guru (KBM)</h3>
              <button
                onClick={() => {
                  setShowJurnalModal(false);
                  setJurnalSaved(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {jurnalSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
                Jurnal Kegiatan Mengajar berhasil disimpan!
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Materi / Pokok Bahasan Pelajaran
                </label>
                <textarea
                  rows={3}
                  value={jurnalTopic}
                  onChange={(e) => setJurnalTopic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 text-[11px]">
                <span>Status Jurnal: <strong className="text-emerald-700">Tersinkronisasi KBM</strong></span>
                <span>Tanggal: {new Date().toLocaleDateString()}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowJurnalModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    setJurnalSaved(true);
                    setTimeout(() => setShowJurnalModal(false), 1200);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Jurnal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projector Fullscreen Modal */}
      {showProjectorModal && activeSession && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-6 text-white animate-fade-in">
          <button
            onClick={() => setShowProjectorModal(false)}
            className="absolute top-6 right-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs border border-slate-700 cursor-pointer shadow-lg flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Tutup Layar Penuh</span>
          </button>

          <div className="text-center space-y-4 max-w-xl mx-auto">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-3.5 py-1 rounded-full font-bold uppercase tracking-wider inline-block">
              MODE PROYEKSI KELAS (LIVE)
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{activeSession.subject_name}</h2>
            <p className="text-base text-slate-300 font-semibold">{activeSession.class_name} • Pengampu: {activeSession.teacher_name}</p>

            <div className="bg-white p-8 rounded-3xl border-4 border-emerald-500 shadow-2xl inline-block my-4">
              <QRCodeSVG value={activeSession.qr_token} size={300} level="H" />
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center font-mono">
              <p className="text-xs text-slate-400 font-sans uppercase font-bold tracking-wider">KODE TOKEN MANUAL:</p>
              <p className="text-2xl font-black text-emerald-400 tracking-widest mt-1">{activeSession.qr_token}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Absen Manual Guru */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Edit Status Absensi Siswa</h3>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
              <p className="font-bold text-slate-900 text-sm">{selectedStudent.student_name}</p>
              <p className="font-mono text-slate-500">NISN: {selectedStudent.student_nisn}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                Pilih Status Kehadiran
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["hadir", "sakit", "izin", "alpa"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setManualStatus(st)}
                    className={`py-2 text-xs font-extrabold uppercase rounded-xl transition-all cursor-pointer ${
                      manualStatus === st
                        ? st === "hadir"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : st === "sakit"
                          ? "bg-amber-600 text-white shadow-sm"
                          : st === "izin"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-rose-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                Catatan (Opsional)
              </label>
              <input
                type="text"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Contoh: Ada Surat Dokter"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveManualAttendance}
                disabled={updatingManual}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-60"
              >
                {updatingManual ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center sm:flex sm:justify-between text-[11px] text-slate-500 font-medium">
          <p>© 2026 Sistem Absensi Digital Sekolah Menengah Atas (ABSEN SMA) • All Rights Reserved</p>
          <p className="mt-1 sm:mt-0">Layanan Bantuan Guru & Panduan Pembelajaran SMA</p>
        </div>
      </footer>
    </div>
  );
}
