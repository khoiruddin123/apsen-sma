"use client";

import { useRouter } from "next/navigation";
import { UserRole } from "@/types/domain";

interface NavbarProps {
  user: {
    name: string;
    username: string;
    role: UserRole;
    classId?: string | null;
  };
  isLiveSession?: boolean;
}

export default function Navbar({ user, isLiveSession = true }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const getRoleText = (role: UserRole) => {
    switch (role) {
      case "siswa":
        return "Siswa Terdaftar";
      case "guru":
        return "Guru Pengampu Mapel";
      case "wali_kelas":
        return "Wali Kelas & Pembimbing";
      default:
        return "Administrator Kurikulum";
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "US";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800/80 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Left: Brand & Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-900/30">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <div>
            <h1 className="font-extrabold text-xs sm:text-sm leading-tight tracking-wide text-white flex items-center gap-1.5">
              <span>SISTEM ABSENSI</span>
              <span className="text-emerald-400">AKADEMIK</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono border border-slate-700/80 hidden xs:inline-block">
                v2.0
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate max-w-[180px] sm:max-w-none">
              Portal Absensi Digital Sekolah Menengah Atas (ABSEN SMA)
            </p>
          </div>
        </div>

        {/* Right Controls & User Info */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Live indicator badge */}
          {isLiveSession && (
            <div className="hidden md:flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-[11px] font-semibold px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>KBM Aktif (Live)</span>
            </div>
          )}

          {/* User Avatar & Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center shrink-0 shadow-inner">
              {getInitials(user.name)}
            </div>
            <div className="text-right hidden sm:block leading-tight">
              <p className="text-xs font-bold text-slate-100 max-w-[160px] truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 font-medium">{getRoleText(user.role)}</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700/80 hover:border-rose-500 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
            title="Keluar Akun"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden xs:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
