import { query, queryOne, execute } from "@/lib/db";
import { AttendanceSessionRow } from "@/types/domain";
import { v4 as uuidv4 } from "uuid";

export async function openSession(data: {
  subject_name: string;
  class_id: string;
  teacher_id?: string | null;
  teacher_name: string;
}): Promise<AttendanceSessionRow> {
  const sessionId = `ses-${uuidv4().substring(0, 8)}`;
  const qrToken = `QR-${uuidv4().substring(0, 8).toUpperCase()}`;
  const today = new Date().toISOString().split("T")[0];
  const startTime = new Date().toTimeString().split(" ")[0];

  await execute(
    `INSERT INTO attendance_sessions 
     (id, subject_name, class_id, teacher_id, teacher_name, session_date, start_time, qr_token, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
    [
      sessionId,
      data.subject_name.trim(),
      data.class_id,
      data.teacher_id ?? null,
      data.teacher_name.trim(),
      today,
      startTime,
      qrToken,
    ]
  );

  // Otomatis buatkan record attendance 'alpa' untuk semua siswa di kelas tersebut
  await execute(
    `INSERT IGNORE INTO attendance_records (id, session_id, student_id, status, source)
     SELECT CONCAT('att-', UUID_SHORT()), ?, id, 'alpa', 'qr_scan_siswa'
     FROM students
     WHERE class_id = ? AND active = 1`,
    [sessionId, data.class_id]
  );

  const session = await getSessionById(sessionId);
  if (!session) throw new Error("Gagal membuat sesi KBM.");
  return session;
}

export async function closeSession(sessionId: string): Promise<boolean> {
  const endTime = new Date().toTimeString().split(" ")[0];
  const result = await execute(
    "UPDATE attendance_sessions SET status = 'closed', end_time = ? WHERE id = ?",
    [endTime, sessionId]
  );
  return result.affectedRows > 0;
}

export async function getSessionById(id: string): Promise<AttendanceSessionRow | null> {
  const row = await queryOne<any>(
    `SELECT s.*, c.name as class_name
     FROM attendance_sessions s
     JOIN classes c ON s.class_id = c.id
     WHERE s.id = ?`,
    [id]
  );
  if (!row) return null;
  return row;
}

export async function getSessionByQrToken(qrToken: string): Promise<AttendanceSessionRow | null> {
  const row = await queryOne<any>(
    `SELECT s.*, c.name as class_name
     FROM attendance_sessions s
     JOIN classes c ON s.class_id = c.id
     WHERE s.qr_token = ? AND s.status = 'open'`,
    [qrToken]
  );
  if (!row) return null;
  return row;
}

export async function getActiveSessionByClass(classId: string): Promise<AttendanceSessionRow | null> {
  const row = await queryOne<any>(
    `SELECT s.*, c.name as class_name
     FROM attendance_sessions s
     JOIN classes c ON s.class_id = c.id
     WHERE s.class_id = ? AND s.status = 'open'
     ORDER BY s.created_at DESC LIMIT 1`,
    [classId]
  );
  if (!row) return null;
  return row;
}

export async function getSessionsByTeacher(teacherName: string): Promise<AttendanceSessionRow[]> {
  const rows = await query<any>(
    `SELECT s.*, c.name as class_name
     FROM attendance_sessions s
     JOIN classes c ON s.class_id = c.id
     WHERE s.teacher_name = ?
     ORDER BY s.created_at DESC`,
    [teacherName]
  );
  return rows;
}

export async function getSessionsByClass(classId: string): Promise<AttendanceSessionRow[]> {
  const rows = await query<any>(
    `SELECT s.*, c.name as class_name
     FROM attendance_sessions s
     JOIN classes c ON s.class_id = c.id
     WHERE s.class_id = ?
     ORDER BY s.created_at DESC`,
    [classId]
  );
  return rows;
}
