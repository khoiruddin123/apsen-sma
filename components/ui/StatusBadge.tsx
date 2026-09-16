import type { AttendanceStatus } from "@/types/domain";

const STYLE: Record<AttendanceStatus, string> = {
  hadir: "bg-emerald-600 text-white",
  izin: "bg-blue-600 text-white",
  sakit: "bg-amber-600 text-white",
  alpa: "bg-rose-600 text-white",
};

const LABEL: Record<AttendanceStatus, string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alpa: "Alpa",
};

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  const currentStatus = status || "alpa";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-bold ${STYLE[currentStatus] || STYLE.alpa}`}
    >
      {LABEL[currentStatus] || "Alpa"}
    </span>
  );
}

const CODE_STYLE: Record<string, string> = {
  H: "text-emerald-400",
  I: "text-blue-400",
  S: "text-amber-400",
  A: "text-rose-400",
  "-": "text-slate-600",
  "": "text-slate-600",
};

export function MatrixCell({ code }: { code: string }) {
  return (
    <span className={`font-bold ${CODE_STYLE[code] ?? "text-slate-400"}`}>
      {code === "" ? "•" : code}
    </span>
  );
}
