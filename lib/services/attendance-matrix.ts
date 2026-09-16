import "server-only";
import { query } from "@/lib/db";
import type { AttendanceStatus, Gender } from "@/types/domain";

export interface MatrixSessionColumn {
  sessionId: string;
  date: string;
  subjectName: string;
}

export interface MatrixStudentRow {
  studentId: string;
  nisn: string;
  name: string;
  className: string;
  gender: Gender;
  cells: Record<string, "H" | "I" | "S" | "A" | "-">;
}

export async function buildAttendanceMatrix(params: {
  classId: string;
  month?: string;
}): Promise<{ sessions: MatrixSessionColumn[]; rows: MatrixStudentRow[] }> {
  const sessionRows = await query<any>(
    `SELECT id, session_date, subject_name
     FROM attendance_sessions
     WHERE class_id = ?
     ORDER BY created_at ASC`,
    [params.classId]
  );

  const sessions: MatrixSessionColumn[] = sessionRows.map((s: any) => ({
    sessionId: s.id,
    date: s.session_date,
    subjectName: s.subject_name,
  }));

  const studentRows = await query<any>(
    `SELECT s.id, s.nisn, s.name, s.gender, c.name as class_name
     FROM students s
     JOIN classes c ON s.class_id = c.id
     WHERE s.class_id = ? AND s.active = 1
     ORDER BY s.name ASC`,
    [params.classId]
  );

  if (studentRows.length === 0 || sessions.length === 0) {
    return { sessions, rows: [] };
  }

  const sessionIds = sessions.map((s) => s.sessionId);
  const studentIds = studentRows.map((s) => s.id);

  const recordRows = await query<any>(
    `SELECT session_id, student_id, status FROM attendance_records WHERE session_id IN (?) AND student_id IN (?)`,
    [sessionIds, studentIds]
  );

  const recordMap = new Map<string, AttendanceStatus>();
  recordRows.forEach((r: any) => {
    recordMap.set(`${r.session_id}__${r.student_id}`, r.status as AttendanceStatus);
  });

  const statusCode: Record<AttendanceStatus, "H" | "I" | "S" | "A"> = {
    hadir: "H",
    izin: "I",
    sakit: "S",
    alpa: "A",
  };

  const rows: MatrixStudentRow[] = studentRows.map((s: any) => {
    const cells: Record<string, "H" | "I" | "S" | "A" | "-"> = {};
    for (const session of sessions) {
      const status = recordMap.get(`${session.sessionId}__${s.id}`);
      cells[session.sessionId] = status ? statusCode[status] : "A";
    }
    return {
      studentId: s.id,
      nisn: s.nisn,
      name: s.name,
      className: s.class_name,
      gender: s.gender as Gender,
      cells,
    };
  });

  return { sessions, rows };
}
