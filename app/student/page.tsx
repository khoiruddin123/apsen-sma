"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function StudentPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [manualToken, setManualToken] = useState("");
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUserSession();
  }, []);

  const fetchUserSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/");
        return;
      }
      const data = await res.json();
      if (!data.user || data.user.role !== "siswa") {
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

  useEffect(() => {
    if (!user) return;

    const scanner = new Html5QrcodeScanner(
      "student-qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        handleScanSubmit(decodedText);
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [user]);

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
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-semibold">
        Memuat Portal Murid...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-6">
        {/* Banner Welcome Murid */}
        <div className="blue-gradient rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              📱 Portal Presensi Murid
            </span>
            <h2 className="text-2xl font-black mt-2">Halo, {user.name}! 👋</h2>
            <p className="text-sm text-blue-100 mt-1">
              NISN: <span className="font-mono font-bold">{user.username}</span> | Siapkan HP Anda untuk scan QR Code pelajaran dari guru.
            </p>
          </div>
          <div className="text-5xl">📱</div>
        </div>

        {/* Scan Status Alert */}
        {scanResult && (
          <div
            className={`p-4 rounded-xl border text-sm font-bold flex items-center gap-3 animate-fade-in ${
              scanResult.ok
                ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                : "bg-rose-950/80 border-rose-500 text-rose-300"
            }`}
          >
            <span className="text-2xl">{scanResult.ok ? "✅" : "⚠️"}</span>
            <div>
              <p className="font-extrabold">{scanResult.ok ? "BERHASIL PRESENSI!" : "GAGAL PRESENSI"}</p>
              <p className="text-xs font-normal opacity-90">{scanResult.message}</p>
            </div>
          </div>
        )}

        {/* Card Camera QR Code Scanner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <span>📷 Kamera Scanner QR Code Pelajaran</span>
              </h3>
              <p className="text-xs text-slate-400">
                Arahkan kamera HP Anda ke QR Code yang ditampilkan oleh Guru di proyektor/layar depan kelas.
              </p>
            </div>
          </div>

          {/* Container Camera Scanner */}
          <div className="bg-slate-950 rounded-xl p-2 border border-slate-800 overflow-hidden">
            <div id="student-qr-reader" className="w-full text-slate-300"></div>
          </div>

          {/* Alternative Manual Token Input */}
          <div className="pt-2">
            <p className="text-xs text-slate-400 font-semibold mb-2">Atau masukkan Kode QR Token secara manual:</p>
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
                placeholder="Contoh: QR-A1B2C3D4"
                className="flex-1 bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 font-mono focus:ring-2 focus:ring-blue-500 uppercase"
              />
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
              >
                Kirim Presensi
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
