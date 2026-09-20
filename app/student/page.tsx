"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import { Html5Qrcode } from "html5-qrcode";

export default function StudentPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Camera & Scanning States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);

  useEffect(() => {
    fetchUserSession();
    return () => {
      stopCamera();
    };
  }, []);

  const fetchUserSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/");
        return;
      }
      const data = await res.json();
      if (!data.user) {
        router.push("/");
        return;
      }
      setUser(data.user);

      // Hanya auto-start camera jika pengguna adalah Siswa
      if (data.user.role === "siswa") {
        setTimeout(() => {
          startCamera();
        }, 400);
      }
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    // Mencegah panggilan ganda saat kamera sedang dalam transisi inisialisasi
    if (isStartingRef.current) return;
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      setIsCameraActive(true);
      return;
    }

    isStartingRef.current = true;
    setCameraError(null);

    try {
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode("student-qr-reader");
      }

      await html5QrcodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.75);
            return {
              width: Math.min(qrboxSize, 260),
              height: Math.min(qrboxSize, 260),
            };
          },
          aspectRatio: 1.777778,
        },
        (decodedText) => {
          // Success Callback
          stopCamera();
          handleScanSubmit(decodedText);
        },
        () => {
          // Ignore frame decode errors
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      const errStr = String(err?.message || err || "");
      if (errStr.includes("transition") || errStr.includes("already under transition")) {
        // Abaikan error transisi sementara dari library html5-qrcode
        return;
      }
      console.error("Camera Error:", err);
      setCameraError(
        "Kamera belum aktif. Klik 'Buka Kamera HP' di atas jika Anda belum memberikan izin akses kamera HP."
      );
      setIsCameraActive(false);
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
      } catch (err) {
        // Ignore stop transition error
      }
      setIsCameraActive(false);
    }
  };

  const handleScanSubmit = async (qrToken: string) => {
    if (!qrToken || submitting) return;
    setSubmitting(true);
    setScanResult(null);

    try {
      const res = await fetch("/api/student/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        setScanResult({ ok: false, message: data.error || "Presensi gagal." });
      } else {
        setScanResult({ ok: true, message: data.message });
      }
    } catch (err: any) {
      setScanResult({ ok: false, message: err.message || "Gagal memproses." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 font-semibold text-xs">
        Memuat Portal Presensi Siswa...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      <Navbar user={user} isLiveSession={false} />

      <main className="max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1 space-y-5">
        
        {/* Banner Navigasi Khusus jika yang terhubung adalah Guru/Wali Kelas/Admin */}
        {user.role !== "siswa" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-semibold text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div>
                <p className="font-extrabold text-sm">Anda Terhubung Sebagai {user.role === "guru" ? "Guru Pengampu" : user.role === "wali_kelas" ? "Wali Kelas" : "Administrator"}</p>
                <p className="text-amber-800/90 font-medium">
                  Halaman ini untuk siswa memindai QR Code. Untuk mengajar / melihat rekap presensi, silakan buka portal utama Anda.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => router.push(user.role === "guru" ? "/teacher" : "/walikelas")}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
            >
              Buka Portal {user.role === "guru" ? "Guru" : "Wali Kelas"} →
            </button>
          </div>
        )}

        {/* Banner Welcome Header */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2.5 py-0.5 rounded-md font-semibold tracking-wider uppercase">
              Portal Presensi Siswa (Mobile Friendly)
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Halo, {user.name}
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              NISN: <span className="font-mono font-bold text-slate-900">{user.username}</span> • Arahkan kamera HP ke Kode QR pelajaran di layar proyektor kelas.
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
        </div>

        {/* Status Result Notification */}
        {scanResult && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3.5 shadow-sm animate-fade-in ${
              scanResult.ok
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-extrabold ${scanResult.ok ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-rose-100 text-rose-700 border border-rose-300"}`}>
              {scanResult.ok ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-extrabold text-sm sm:text-base">{scanResult.ok ? "PRESENSI BERHASIL DICATAT" : "PRESENSI GAGAL"}</p>
              <p className="text-xs font-medium opacity-90 mt-0.5">{scanResult.message}</p>
            </div>
          </div>
        )}

        {/* Main Scanner Container Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 tracking-tight flex items-center gap-2">
                <span>Kamera Pemindai QR Code HP</span>
                {isCameraActive && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Kamera Aktif
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Arahkan lensa kamera HP tepat ke kotak QR Code di proyektor kelas.
              </p>
            </div>

            {/* Toggle Camera Button */}
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Buka Kamera HP</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Tutup Kamera</span>
              </button>
            )}
          </div>

          {/* Camera Frame Box with Centered Placeholder */}
          <div className="bg-slate-900 rounded-2xl overflow-hidden min-h-[280px] relative border border-slate-800 shadow-inner flex items-center justify-center">
            <div id="student-qr-reader" className="w-full text-white"></div>

            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 z-10 bg-slate-900">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center shadow-inner">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-xs text-slate-300 font-medium max-w-sm mx-auto">
                  {cameraError || "Klik tombol 'Buka Kamera HP' di atas untuk mengaktifkan pemindai kamera."}
                </p>
              </div>
            )}
          </div>

          {/* Manual Input Alternative */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-xs text-slate-700 font-bold">Atau Masukkan Kode QR Token Secara Manual:</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleScanSubmit(manualToken);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Contoh: QR-B01A6311"
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-600 focus:bg-white uppercase tracking-wider transition-colors"
              />
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-md cursor-pointer shrink-0 disabled:opacity-60"
              >
                {submitting ? "Memproses..." : "Kirim Presensi"}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center text-[11px] text-slate-500 font-medium">
          <p>© 2026 Sistem Absensi Digital Sekolah Menengah Atas (ABSEN SMA) • All Rights Reserved</p>
        </div>
      </footer>
    </div>
  );
}
