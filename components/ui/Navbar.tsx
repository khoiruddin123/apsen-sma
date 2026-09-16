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
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "siswa":
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-1 rounded-full font-semibold">👦 Murid / Siswa</span>;
      case "guru":
        return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs px-2.5 py-1 rounded-full font-semibold">👨‍🏫 Guru Mapel</span>;
      case "wali_kelas":
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs px-2.5 py-1 rounded-full font-semibold">👨‍💼 Wali Kelas</span>;
      default:
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-1 rounded-full font-semibold">⚡ Admin</span>;
    }
  };

  return (
    <header className="navy-gradient text-white shadow-md border-b border-slate-700/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/30">
            🎓
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-2">
              APSEN SMA
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">v2.0</span>
            </h1>
            <p className="text-xs text-slate-300 font-medium">Sistem Presensi KBM SMA (3 Aktor)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <div className="mt-0.5">{getRoleBadge(user.role)}</div>
          </div>

          <button
            onClick={handleLogout}
            className="bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all border border-rose-500/50 flex items-center gap-1.5"
          >
            <span>🚪</span>
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
