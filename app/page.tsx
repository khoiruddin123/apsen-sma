"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"siswa" | "guru" | "wali_kelas">("siswa");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickFill = (role: "siswa" | "guru" | "wali_kelas" | "admin") => {
    setError(null);
    if (role === "siswa") {
      setActiveTab("siswa");
      setUsername("1001");
      setPassword("123456");
    } else if (role === "guru") {
      setActiveTab("guru");
      setUsername("guru");
      setPassword("guru");
    } else if (role === "wali_kelas") {
      setActiveTab("wali_kelas");
      setUsername("walikelas");
      setPassword("walikelas");
    } else {
      setUsername("admin");
      setPassword("admin");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal login.");
      }

      // Redirect sesuai role
      if (data.user.role === "siswa") {
        router.push("/student");
      } else if (data.user.role === "guru") {
        router.push("/teacher");
      } else if (data.user.role === "wali_kelas" || data.user.role === "admin") {
        router.push("/walikelas");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen navy-gradient flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Dynamic Background Ornaments */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white text-3xl font-black shadow-lg shadow-blue-500/40 mb-3">
            🎓
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">APSEN SMA</h1>
          <p className="text-sm text-slate-300 font-medium mt-1">Sistem Presensi KBM Sekolah Menengah Atas</p>
        </div>

        {/* Tab Selector 3 Aktor */}
        <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1.5 rounded-xl mb-6 border border-slate-700">
          <button
            type="button"
            onClick={() => {
              setActiveTab("siswa");
              setUsername("");
              setPassword("");
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "siswa"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            👦 Murid
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("guru");
              setUsername("");
              setPassword("");
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "guru"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            👨‍🏫 Guru Mapel
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("wali_kelas");
              setUsername("");
              setPassword("");
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "wali_kelas"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            👨‍💼 Wali Kelas
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold text-center">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              {activeTab === "siswa" ? "NISN Siswa" : "Username / NIP"}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={activeTab === "siswa" ? "Masukkan NISN (Contoh: 1001)" : "Masukkan Username"}
              className="w-full bg-slate-800/90 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-800/90 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Memproses...</span>
            ) : (
              <>
                <span>Masuk Portal {activeTab === "siswa" ? "Murid" : activeTab === "guru" ? "Guru" : "Wali Kelas"}</span>
                <span>➔</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Login Preset Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs font-semibold text-slate-400 mb-3">⚡ Uji Coba Cepat 3 Aktor (Demo Login):</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => handleQuickFill("siswa")}
              className="px-2.5 py-1.5 bg-emerald-950/60 border border-emerald-700/50 hover:bg-emerald-900 text-emerald-300 text-xs rounded-lg font-medium transition-all"
            >
              👦 Login Murid (1001)
            </button>
            <button
              onClick={() => handleQuickFill("guru")}
              className="px-2.5 py-1.5 bg-blue-950/60 border border-blue-700/50 hover:bg-blue-900 text-blue-300 text-xs rounded-lg font-medium transition-all"
            >
              👨‍🏫 Login Guru
            </button>
            <button
              onClick={() => handleQuickFill("wali_kelas")}
              className="px-2.5 py-1.5 bg-purple-950/60 border border-purple-700/50 hover:bg-purple-900 text-purple-300 text-xs rounded-lg font-medium transition-all"
            >
              👨‍💼 Login Wali Kelas
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
