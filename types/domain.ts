export type Gender = "L" | "P";

export type UserRole = "siswa" | "guru" | "wali_kelas" | "admin";

export type AttendanceStatus = "hadir" | "sakit" | "izin" | "alpa";

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  hadir: "Hadir",
  sakit: "Sakit",
  izin: "Izin",
  alpa: "Alpa",
};

export const ATTENDANCE_STATUS_COLOR: Record<AttendanceStatus, string> = {
  hadir: "bg-emerald-100 text-emerald-800 border-emerald-300",
  sakit: "bg-amber-100 text-amber-800 border-amber-300",
  izin: "bg-blue-100 text-blue-800 border-blue-300",
  alpa: "bg-rose-100 text-rose-800 border-rose-300",
};

export interface ClassRow {
  id: string;
  name: string;
  grade: string;
  major: string;
  sort_order: number;
}

export interface UserRow {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  class_id?: string | null;
  class_name?: string | null;
}

export interface StudentRow {
  id: string;
  nisn: string;
  name: string;
  class_id: string;
  gender: Gender;
  active: boolean;
  created_at?: string;
}

export interface StudentWithClass extends StudentRow {
  class_name: string;
}

export interface AttendanceSessionRow {
  id: string;
  subject_name: string;
  class_id: string;
  class_name?: string;
  teacher_id: string | null;
  teacher_name: string;
  session_date: string;
  start_time: string;
  end_time?: string | null;
  qr_token: string;
  status: "open" | "closed";
  created_at?: string;
}

export interface AttendanceRecordRow {
  id: string;
  session_id: string;
  student_id: string;
  student_name?: string;
  student_nisn?: string;
  status: AttendanceStatus;
  scanned_at: string | null;
  source: "qr_scan_siswa" | "manual_guru";
  notes?: string | null;
}

export interface ScanResult {
  ok: boolean;
  message: string;
  studentName?: string;
  subjectName?: string;
  status?: AttendanceStatus;
}

export interface AuthSessionData {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  classId?: string | null;
}
