"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import * as XLSX from "xlsx";

export default function WaliKelasPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<"rekap_umum" | "rekap_mapel" | "kelola_siswa">("rekap_umum");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Import States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Form States - Add
  const [addName, setAddName] = useState("");
  const [addNisn, setAddNisn] = useState("");
  const [addGender, setAddGender] = useState<"L" | "P">("L");
  const [addPassword, setAddPassword] = useState("123456");

  // Form States - Edit & Delete
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editNisn, setEditNisn] = useState("");
  const [editGender, setEditGender] = useState<"L" | "P">("L");
  const [editActive, setEditActive] = useState<boolean>(true);

  const [deletingStudent, setDeletingStudent] = useState<any>(null);

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
      if (!data.user || (data.user.role !== "wali_kelas" && data.user.role !== "admin" && data.user.role !== "guru")) {
        router.push("/");
        return;
      }
      setUser(data.user);
      const initialClass = data.user.classId || "cls-xi-ipa1";
      setSelectedClassId(initialClass);
      fetchSummary(initialClass, "all", "all");
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

  const fetchSummary = async (
    classId: string = selectedClassId,
    month: string = selectedMonth,
    subject: string = selectedSubject
  ) => {
    try {
      const res = await fetch(
        `/api/walikelas/summary?classId=${classId}&month=${month}&subject=${encodeURIComponent(subject)}`
      );
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

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    fetchSummary(classId, selectedMonth, selectedSubject);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    fetchSummary(selectedClassId, month, selectedSubject);
  };

  const handleSubjectChange = (subject: string) => {
    setSelectedSubject(subject);
    fetchSummary(selectedClassId, selectedMonth, subject);
  };

  const handleExportExcel = () => {
    if (!summary || !summary.studentRecap) return;

    const monthLabel = selectedMonth === "all" ? "Semua Periode (Kumulatif)" : `Bulan ${selectedMonth}`;
    const subjectLabel = selectedSubject === "all" ? "Semua Mata Pelajaran" : `Mata Pelajaran ${selectedSubject}`;
    const today = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let totalHadirAll = 0;
    let totalSakitAll = 0;
    let totalIzinAll = 0;
    let totalAlpaAll = 0;

    summary.studentRecap.forEach((s: any) => {
      totalHadirAll += Number(s.total_hadir || 0);
      totalSakitAll += Number(s.total_sakit || 0);
      totalIzinAll += Number(s.total_izin || 0);
      totalAlpaAll += Number(s.total_alpa || 0);
    });

    const totalSessionsCount = summary.totalSessions || 1;

    // Header Title Banner & Rows
    const excelData: any[][] = [
      ["LAPORAN REKAPITULASI PRESENSI SISWA"],
      [`Kelas: ${classInfo?.name || "-"} (${classInfo?.major || "-"})`],
      [`Mata Pelajaran: ${subjectLabel}`],
      [`Periode Presensi: ${monthLabel}`],
      [`Total Sesi KBM: ${summary.totalSessions || 0} Sesi  |  Tanggal Cetak: ${today}`],
      [""], // Empty spacing row
      [
        "NO",
        "NISN",
        "NAMA LENGKAP SISWA",
        "L/P",
        "STATUS AKUN",
        "HADIR",
        "SAKIT",
        "IZIN",
        "ALPA",
        "TOTAL ABSENSI",
        "PERSENTASE KEHADIRAN",
      ],
    ];

    // Data Rows
    summary.studentRecap.forEach((s: any, idx: number) => {
      const hadir = Number(s.total_hadir || 0);
      const sakit = Number(s.total_sakit || 0);
      const izin = Number(s.total_izin || 0);
      const alpa = Number(s.total_alpa || 0);
      const totalRecord = hadir + sakit + izin + alpa;
      const pct = totalSessionsCount > 0 ? Math.min(100, Math.round((hadir / totalSessionsCount) * 100)) : 0;

      excelData.push([
        idx + 1,
        s.nisn,
        s.name,
        s.gender === "P" ? "Perempuan" : "Laki-laki",
        s.active === 1 || s.active === true ? "Aktif" : "Non-Aktif",
        hadir,
        sakit,
        izin,
        alpa,
        totalRecord,
        `${pct}%`,
      ]);
    });

    // Summary Footer Row
    const grandTotalRecord = totalHadirAll + totalSakitAll + totalIzinAll + totalAlpaAll;
    const avgPct =
      summary.studentRecap.length > 0 && totalSessionsCount > 0
        ? Math.round((totalHadirAll / (summary.studentRecap.length * totalSessionsCount)) * 100)
        : 0;

    excelData.push([""]); // Spacing row
    excelData.push([
      "TOTAL REKAPITULASI KELAS",
      "",
      "",
      "",
      "",
      totalHadirAll,
      totalSakitAll,
      totalIzinAll,
      totalAlpaAll,
      grandTotalRecord,
      `Rata-rata: ${Math.min(100, avgPct)}%`,
    ]);

    // Create Worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Auto-fit column widths
    ws["!cols"] = [
      { wch: 6 },  // NO
      { wch: 18 }, // NISN
      { wch: 32 }, // NAMA LENGKAP SISWA
      { wch: 14 }, // L/P
      { wch: 15 }, // STATUS AKUN
      { wch: 10 }, // HADIR
      { wch: 10 }, // SAKIT
      { wch: 10 }, // IZIN
      { wch: 10 }, // ALPA
      { wch: 16 }, // TOTAL ABSENSI
      { wch: 24 }, // PERSENTASE KEHADIRAN
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Presensi");

    const cleanClassName = (classInfo?.name || "Kelas").replace(/\s+/g, "_");
    const cleanSubject = selectedSubject === "all" ? "Semua_Mapel" : selectedSubject.replace(/\s+/g, "_");
    const cleanMonth = selectedMonth === "all" ? "Semua_Periode" : selectedMonth;
    XLSX.writeFile(wb, `Rekap_Presensi_${cleanClassName}_${cleanSubject}_${cleanMonth}.xlsx`);
  };

  const handleExportCSV = () => {
    if (!summary || !summary.studentRecap) return;
    const monthLabel = selectedMonth === "all" ? "Semua_Periode" : `Bulan_${selectedMonth}`;
    const subjectLabel = selectedSubject === "all" ? "Semua_Mapel" : selectedSubject.replace(/\s+/g, "_");
    const headers = ["NISN", "Nama Siswa", "L/P", "Status Akun", "Total Hadir", "Total Sakit", "Total Izin", "Total Alpa"];
    const rows = summary.studentRecap.map((s: any) => [
      s.nisn,
      `"${s.name}"`,
      s.gender === "P" ? "Perempuan" : "Laki-laki",
      s.active ? "Aktif" : "Non-Aktif",
      s.total_hadir,
      s.total_sakit,
      s.total_izin,
      s.total_alpa,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Presensi_${classInfo?.name || "Kelas"}_${subjectLabel}_${monthLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 0. IMPORT BULK SISWA VIA EXCEL
  const handleDownloadTemplateExcel = () => {
    const templateData = [
      ["NISN", "NAMA SISWA", "JENIS KELAMIN (L/P)", "PASSWORD"],
      ["0012345601", "Ahmad Fauzi", "L", "123456"],
      ["0012345602", "Siti Nurhaliza", "P", "123456"],
      ["0012345603", "Budi Santoso", "L", "123456"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws["!cols"] = [
      { wch: 18 }, // NISN
      { wch: 30 }, // NAMA SISWA
      { wch: 22 }, // JENIS KELAMIN (L/P)
      { wch: 16 }, // PASSWORD
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
    XLSX.writeFile(wb, "Template_Import_Siswa_AbsenSMA.xlsx");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setActionError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rawData.length < 2) {
          setActionError("File Excel kosong atau tidak memiliki baris data.");
          return;
        }

        const parsedStudents: any[] = [];
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;
          const nisn = String(row[0] || "").trim();
          const name = String(row[1] || "").trim();
          const gender = String(row[2] || "L").toUpperCase().trim() === "P" ? "P" : "L";
          const password = String(row[3] || "123456").trim();

          if (nisn && name) {
            parsedStudents.push({ nisn, name, gender, password });
          }
        }

        if (parsedStudents.length === 0) {
          setActionError("Tidak ditemukan data siswa yang valid pada file Excel.");
        } else {
          setImportPreviewData(parsedStudents);
        }
      } catch (err: any) {
        setActionError("Gagal membaca file Excel: " + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleBulkImportSubmit = async () => {
    if (importPreviewData.length === 0 || !selectedClassId) return;
    setImporting(true);
    setActionError(null);

    try {
      const res = await fetch("/api/walikelas/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          students: importPreviewData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Gagal mengimpor data siswa.");
      } else {
        alert(data.message);
        setShowImportModal(false);
        setImportPreviewData([]);
        setImportFile(null);
        fetchSummary(selectedClassId, selectedMonth, selectedSubject);
      }
    } catch (err: any) {
      setActionError(err.message || "Terjadi kesalahan.");
    } finally {
      setImporting(false);
    }
  };

  // 1. TAMBAH SISWA
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/walikelas/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName,
          nisn: addNisn,
          gender: addGender,
          classId: selectedClassId,
          password: addPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Gagal menambahkan siswa.");
      } else {
        setShowAddModal(false);
        setAddName("");
        setAddNisn("");
        setAddPassword("123456");
        fetchSummary(selectedClassId, selectedMonth);
      }
    } catch (err: any) {
      setActionError(err.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. EDIT SISWA
  const openEditModal = (student: any) => {
    setActionError(null);
    setEditingStudent(student);
    setEditName(student.name);
    setEditNisn(student.nisn);
    setEditGender(student.gender || "L");
    setEditActive(student.active === 1 || student.active === true);
    setShowEditModal(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setActionError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/walikelas/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingStudent.student_id,
          name: editName,
          nisn: editNisn,
          gender: editGender,
          active: editActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Gagal memperbarui data siswa.");
      } else {
        setShowEditModal(false);
        setEditingStudent(null);
        fetchSummary(selectedClassId, selectedMonth);
      }
    } catch (err: any) {
      setActionError(err.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. HAPUS SISWA
  const openDeleteModal = (student: any) => {
    setActionError(null);
    setDeletingStudent(student);
    setShowDeleteModal(true);
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    setActionError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/walikelas/students?id=${deletingStudent.student_id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Gagal menghapus siswa.");
      } else {
        setShowDeleteModal(false);
        setDeletingStudent(null);
        fetchSummary(selectedClassId, selectedMonth);
      }
    } catch (err: any) {
      setActionError(err.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    if (!summary || !summary.studentRecap) return [];
    return summary.studentRecap.filter((s: any) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nisn.includes(searchTerm)
    );
  }, [summary, searchTerm]);

  // Initials generator
  const getInitials = (name: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 font-semibold text-xs">
        Memuat Portal Wali Kelas & Rekapitulasi Presensi...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      <Navbar user={user} isLiveSession={false} />

      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        
        {/* Banner Welcome Header */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2.5 py-0.5 rounded-md font-semibold tracking-wider uppercase">
              Portal Wali Kelas & Rekapitulasi Presensi 1 Bulan
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Selamat Datang, {user.name}
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Sistem Pemantauan Kegiatan Belajar Mengajar & Rekapitulasi Presensi Bulanan Kelas {classInfo?.name || ""}.
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>

        {/* Navigation Tabs (Pisahkan Tampilan Rekap Umum, Rekap Mapel, Kelola Siswa) */}
        <div className="flex border-b border-slate-200 gap-2 bg-slate-100/90 p-1.5 rounded-2xl shadow-inner">
          <button
            onClick={() => setActiveTab("rekap_umum")}
            className={`flex-1 py-3 px-3 sm:px-4 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "rekap_umum"
                ? "bg-white text-emerald-800 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6finalM9 19H5a2 2 0 01-2-2V5a2 2 0 012-2h4a2 2 0 012 2v14ptM9 19h6m-6 0h6" />
            </svg>
            <span className="hidden sm:inline">Rekapitulasi Presensi Kelas</span>
            <span className="sm:hidden">Rekap Kelas</span>
          </button>

          <button
            onClick={() => setActiveTab("rekap_mapel")}
            className={`flex-1 py-3 px-3 sm:px-4 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "rekap_mapel"
                ? "bg-white text-blue-800 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="hidden sm:inline">Rekap & Unduh Per Mata Pelajaran</span>
            <span className="sm:hidden">Rekap Mapel</span>
          </button>

          <button
            onClick={() => setActiveTab("kelola_siswa")}
            className={`flex-1 py-3 px-3 sm:px-4 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "kelola_siswa"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="hidden sm:inline">Kelola Siswa & Import Excel</span>
            <span className="sm:hidden">Kelola Siswa</span>
          </button>
        </div>

        {/* Filter Bar (Kelas & Periode) */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Select Kelas */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Kelas:</span>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.major})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Periode Presensi */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Periode:</span>
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600 cursor-pointer shadow-2xs"
              >
                <option value="all">Semua Periode (Kumulatif)</option>
                <option value="2026-09">September 2026 (Bulan Ini)</option>
                <option value="2026-08">Agustus 2026</option>
                <option value="2026-07">Juli 2026</option>
                <option value="2026-06">Juni 2026</option>
                <option value="2026-05">Mei 2026</option>
                <option value="2026-04">April 2026</option>
                <option value="2026-03">Maret 2026</option>
                <option value="2026-02">Februari 2026</option>
                <option value="2026-01">Januari 2026</option>
              </select>
            </div>
          </div>

          {/* Download Buttons for Current View */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer uppercase tracking-wider"
            >
              <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-slate-800 hover:bg-slate-900 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1 shadow-2xs cursor-pointer uppercase tracking-wider"
            >
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Summary Statistic Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border-2 border-emerald-100 rounded-2xl p-5 shadow-2xs flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-inner">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa Terdaftar</p>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{summary.totalStudents} Siswa</h3>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0 shadow-inner">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sesi KBM Periode Ini</p>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{summary.totalSessions} Sesi</h3>
              </div>
            </div>

            <div className="bg-white border-2 border-blue-100 rounded-2xl p-5 shadow-2xs flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0 shadow-inner">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sesi KBM Berlangsung</p>
                <h3 className="text-xl font-extrabold text-blue-700 mt-0.5">
                  {summary.activeSessions.length} Sesi Aktif
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 1: REKAPITULASI UMUM PRESENSI ================= */}
        {activeTab === "rekap_umum" && (
          <div className="space-y-6">
            {/* Section 1: Monitoring Sesi Pembelajaran Guru */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                <div className="w-2 h-5 bg-emerald-600 rounded-full"></div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Monitoring Aktivitas Pembelajaran Guru</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daftar guru mata pelajaran yang sedang menyelenggarakan sesi KBM di kelas {classInfo?.name || ""}.
                  </p>
                </div>
              </div>

              {summary && summary.activeSessions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {summary.activeSessions.map((s: any) => (
                    <div
                      key={s.id}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-2.5 py-0.5 rounded font-extrabold uppercase tracking-wider">
                          Sedang Mengajar
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1.5">{s.subject_name}</h4>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">Pengampu: {s.teacher_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 font-mono">Mulai: {s.start_time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/80 text-center text-xs text-slate-500 font-semibold">
                  Saat ini tidak ada sesi jam pelajaran yang sedang berlangsung di kelas ini.
                </div>
              )}
            </div>

            {/* Section 2: Rekapitulasi Presensi Keseluruhan */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>Rekapitulasi Presensi Seluruh Mata Pelajaran</span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                      {selectedMonth === "all" ? "Semua Periode" : `Bulan ${selectedMonth}`}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Akumulasi jumlah kehadiran siswa dari seluruh sesi jam pelajaran di kelas {classInfo?.name || ""}.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari nama atau NISN..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">NAMA SISWA</th>
                      <th className="p-3">NISN</th>
                      <th className="p-3">L/P</th>
                      <th className="p-3 text-center">STATUS AKUN</th>
                      <th className="p-3 text-emerald-700 text-center">HADIR</th>
                      <th className="p-3 text-amber-700 text-center">SAKIT</th>
                      <th className="p-3 text-blue-700 text-center">IZIN</th>
                      <th className="p-3 text-rose-700 text-center">ALPA</th>
                      <th className="p-3 text-center">PERSENTASE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredStudents.map((s: any) => {
                      const totalSesi = summary?.totalSessions || 1;
                      const hadir = Number(s.total_hadir || 0);
                      const pct = totalSesi > 0 ? Math.min(100, Math.round((hadir / totalSesi) * 100)) : 0;
                      return (
                        <tr key={s.student_id} className="hover:bg-slate-50/80 transition-all">
                          <td className="p-3 font-bold text-slate-900">{s.name}</td>
                          <td className="p-3 font-mono text-slate-600">{s.nisn}</td>
                          <td className="p-3 font-bold text-slate-600">{s.gender === "P" ? "P" : "L"}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {s.active ? "Aktif" : "Non-Aktif"}
                            </span>
                          </td>
                          <td className="p-3 text-center font-extrabold text-emerald-700">{s.total_hadir}</td>
                          <td className="p-3 text-center font-extrabold text-amber-700">{s.total_sakit}</td>
                          <td className="p-3 text-center font-extrabold text-blue-700">{s.total_izin}</td>
                          <td className="p-3 text-center font-extrabold text-rose-700">{s.total_alpa}</td>
                          <td className="p-3 text-center font-extrabold text-slate-900">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: REKAP PRESENSI PER MATA PELAJARAN ================= */}
        {activeTab === "rekap_mapel" && (
          <div className="space-y-6">
            {/* Header Control Khusus Mapel */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2">
                <span className="bg-blue-800/80 text-blue-200 border border-blue-700 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                  Khusus Rekap Mata Pelajaran
                </span>
                <h3 className="text-xl font-extrabold flex items-center gap-2">
                  <span>Pilih Mata Pelajaran:</span>
                </h3>
                
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <select
                    value={selectedSubject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="bg-white text-slate-900 text-sm font-extrabold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-lg"
                  >
                    <option value="all">Semua Mata Pelajaran (Gabungan)</option>
                    {summary?.subjectsList?.map((subj: string) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <button
                  onClick={handleExportExcel}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer uppercase tracking-wider"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Unduh Rekap Excel Mapel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Rekap Tabel Presensi Per Mapel */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>Laporan Kehadiran Mata Pelajaran: {selectedSubject === "all" ? "Semua Mata Pelajaran" : selectedSubject}</span>
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2.5 py-0.5 rounded font-bold uppercase">
                      {summary?.totalSessions || 0} Sesi Jam Pelajaran
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Detail presensi per siswa khusus {selectedSubject === "all" ? "seluruh mata pelajaran" : `mata pelajaran ${selectedSubject}`} di kelas {classInfo?.name || ""}.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari nama atau NISN..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">NAMA SISWA</th>
                      <th className="p-3">NISN</th>
                      <th className="p-3 text-emerald-700 text-center">HADIR</th>
                      <th className="p-3 text-amber-700 text-center">SAKIT</th>
                      <th className="p-3 text-blue-700 text-center">IZIN</th>
                      <th className="p-3 text-rose-700 text-center">ALPA</th>
                      <th className="p-3 text-center">PERSENTASE MAPEL INI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredStudents.map((s: any) => {
                      const totalSesi = summary?.totalSessions || 1;
                      const hadir = Number(s.total_hadir || 0);
                      const pct = totalSesi > 0 ? Math.min(100, Math.round((hadir / totalSesi) * 100)) : 0;
                      return (
                        <tr key={s.student_id} className="hover:bg-blue-50/50 transition-all">
                          <td className="p-3 font-bold text-slate-900">{s.name}</td>
                          <td className="p-3 font-mono text-slate-600">{s.nisn}</td>
                          <td className="p-3 text-center font-extrabold text-emerald-700">{s.total_hadir}</td>
                          <td className="p-3 text-center font-extrabold text-amber-700">{s.total_sakit}</td>
                          <td className="p-3 text-center font-extrabold text-blue-700">{s.total_izin}</td>
                          <td className="p-3 text-center font-extrabold text-rose-700">{s.total_alpa}</td>
                          <td className="p-3 text-center font-extrabold text-blue-800">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: KELOLA SISWA & IMPORT EXCEL ================= */}
        {activeTab === "kelola_siswa" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Manajemen Anggota Siswa Kelas {classInfo?.name || ""}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola data anggota siswa, tambah manual, ubah status aktif, atau mengimpor sekaligus dari file Excel (.xlsx).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setActionError(null);
                      setImportFile(null);
                      setImportPreviewData([]);
                      setShowImportModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-2xs cursor-pointer uppercase tracking-wider"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Import Siswa dari Excel</span>
                  </button>

                  <button
                    onClick={() => {
                      setActionError(null);
                      setShowAddModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer uppercase tracking-wider"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Tambah Manual</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72 pb-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama atau NISN..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium"
                />
              </div>

              {/* Tabel Kelola Siswa */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">NAMA SISWA</th>
                      <th className="p-3">NISN</th>
                      <th className="p-3">L/P</th>
                      <th className="p-3 text-center">STATUS AKUN</th>
                      <th className="p-3 text-right">AKSI KELOLA DATA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredStudents.map((s: any) => (
                      <tr key={s.student_id} className="hover:bg-slate-50/80 transition-all">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitials(s.name)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{s.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono font-semibold text-slate-600">{s.nisn}</td>
                        <td className="p-3 font-bold text-slate-600">{s.gender === "P" ? "P" : "L"}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              s.active === 1 || s.active === true
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500 border border-slate-300"
                            }`}
                          >
                            {s.active === 1 || s.active === true ? "Aktif" : "Non-Aktif"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(s)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-700 border border-slate-300 rounded-md text-[11px] font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => openDeleteModal(s)}
                              className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 rounded-md text-[11px] font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 0. MODAL IMPORT EXCEL BULK SISWA */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Import Data Siswa dari File Excel</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {actionError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Langkah 1: Unduh Template Excel */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-blue-900">Langkah 1: Gunakan Template Excel Resmi</p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Unduh format Excel standar (NISN, Nama Siswa, Jenis Kelamin, Password).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplateExcel}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-2 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Unduh Template (.xlsx)</span>
                </button>
              </div>

              {/* Langkah 2: Choose File */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Langkah 2: Pilih File Excel Hasil Pengisian (.xlsx / .xls / .csv)
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileSelect}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-2.5 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                />
              </div>

              {/* Langkah 3: Data Preview Table */}
              {importPreviewData.length > 0 && (
                <div className="space-y-2">
                  <p className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Preview Data Siswa Terbaca:</span>
                    <span className="text-emerald-700 font-extrabold">{importPreviewData.length} Siswa Siap Diimpor</span>
                  </p>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-[11px] text-slate-700">
                      <thead className="bg-slate-100 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-2">NO</th>
                          <th className="p-2">NISN</th>
                          <th className="p-2">NAMA SISWA</th>
                          <th className="p-2">L/P</th>
                          <th className="p-2">PASSWORD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {importPreviewData.slice(0, 10).map((st: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-bold">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-900">{st.nisn}</td>
                            <td className="p-2 font-sans font-bold text-slate-800">{st.name}</td>
                            <td className="p-2 font-bold">{st.gender}</td>
                            <td className="p-2 text-slate-500">{st.password}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importPreviewData.length > 10 && (
                    <p className="text-[10px] text-slate-500 italic">
                      ... dan {importPreviewData.length - 10} siswa lainnya.
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleBulkImportSubmit}
                  disabled={importing || importPreviewData.length === 0}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {importing ? "Mengimpor Data..." : `Proses Import ${importPreviewData.length} Siswa`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. MODAL TAMBAH SISWA */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Tambah Siswa Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {actionError}
              </div>
            )}

            <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Contoh: Muhammad Bintang Ramadhan"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  NISN (Nomor Induk Siswa Nasional)
                </label>
                <input
                  type="text"
                  required
                  value={addNisn}
                  onChange={(e) => setAddNisn(e.target.value)}
                  placeholder="Contoh: 1006"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Jenis Kelamin
                  </label>
                  <select
                    value={addGender}
                    onChange={(e) => setAddGender(e.target.value as "L" | "P")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white cursor-pointer font-bold"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Password Default
                  </label>
                  <input
                    type="text"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer disabled:opacity-60"
                >
                  {submitting ? "Simpan..." : "Simpan Siswa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL EDIT SISWA */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Edit Data & Status Siswa</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {actionError}
              </div>
            )}

            <form onSubmit={handleUpdateStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  NISN
                </label>
                <input
                  type="text"
                  required
                  value={editNisn}
                  onChange={(e) => setEditNisn(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Jenis Kelamin
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as "L" | "P")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white cursor-pointer font-bold"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Status Akun Siswa
                  </label>
                  <select
                    value={editActive ? "1" : "0"}
                    onChange={(e) => setEditActive(e.target.value === "1")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white cursor-pointer font-bold"
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Non-Aktif</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer disabled:opacity-60"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL KONFIRMASI HAPUS SISWA */}
      {showDeleteModal && deletingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-fade-in text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">Hapus Data Siswa?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Apakah Anda yakin ingin menghapus <span className="font-bold text-slate-900">{deletingStudent.name}</span> (NISN: {deletingStudent.nisn})? Data presensi terkait akan ikut dibersihkan.
              </p>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold text-left">
                {actionError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                disabled={submitting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-60"
              >
                {submitting ? "Menghapus..." : "Ya, Hapus Data"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center sm:flex sm:justify-between text-[11px] text-slate-500 font-medium">
          <p>© 2026 Sistem Absensi Digital Sekolah Menengah Atas (ABSEN SMA) • All Rights Reserved</p>
          <p className="mt-1 sm:mt-0">Layanan Bantuan & Dukungan Kurikulum SMA</p>
        </div>
      </footer>
    </div>
  );
}
