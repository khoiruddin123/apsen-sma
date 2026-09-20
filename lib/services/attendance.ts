import { query, queryOne, execute } from "@/lib/db";
import { AttendanceRecordRow, AttendanceStatus, ScanResult } from "@/types/domain";
import { getSessionByQrToken, getSessionById } from "@/lib/services/sessions";

export async function studentScanQrCode(
  studentId: string,
  qrToken: string
): Promise<ScanResult> {
  const session = await getSessionByQrToken(qrToken.trim());
  if (!session) {
    return { ok: false, message: "QR Code Sesi tidak valid atau Sesi KBM telah ditutup." };
  }

  // Cek apakah siswa terdaftar di kelas sesi tersebut
  const student = await queryOne<any>(
    `SELECT s.id, s.name, s.class_id, c.name as class_name
     FROM students s
     JOIN classes c ON s.class_id = c.id
     WHERE s.id = ? AND s.active = 1`,
    [studentId]
  );

  if (!student) {
    return { ok: false, message: "Data siswa tidak ditemukan." };
  }

  if (student.class_id !== session.class_id) {
    return {
      ok: false,
      message: `Maaf, Anda (${student.name}) terdaftar di kelas ${student.class_name}, sedangkan Sesi ini dibuka untuk kelas ${session.class_name}.`,
    };
  }

  const nowTime = new Date().toISOString().replace("T", " ").substring(0, 19);

  // Update status presensi siswa menjadi 'hadir'
  await execute(
    `INSERT INTO attendance_records (id, session_id, student_id, status, scanned_at, source)
     VALUES (CONCAT('att-', UUID_SHORT()), ?, ?, 'hadir', ?, 'qr_scan_siswa')
     ON DUPLICATE KEY UPDATE status = 'hadir', scanned_at = ?, source = 'qr_scan_siswa'`,
    [session.id, student.id, nowTime, nowTime]
  );

  return {
    ok: true,
    message: `Presensi Berhasil! Selamat mengikuti pelajaran ${session.subject_name}.`,
    studentName: student.name,
    subjectName: session.subject_name,
    status: "hadir",
  };
}

export async function updateManualAttendance(data: {
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}): Promise<boolean> {
  const session = await getSessionById(data.sessionId);
  if (!session) return false;

  const nowTime = new Date().toISOString().replace("T", " ").substring(0, 19);

  const result = await execute(
    `INSERT INTO attendance_records (id, session_id, student_id, status, scanned_at, source, notes)
     VALUES (CONCAT('att-', UUID_SHORT()), ?, ?, ?, ?, 'manual_guru', ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), source = 'manual_guru', notes = VALUES(notes)`,
    [data.sessionId, data.studentId, data.status, nowTime, data.notes || null]
  );

  return result.affectedRows > 0;
}

export async function getSessionAttendanceRecords(
  sessionId: string
): Promise<AttendanceRecordRow[]> {
  const rows = await query<any>(
    `SELECT ar.id, ar.session_id, ar.student_id, ar.status, ar.scanned_at, ar.source, ar.notes,
            s.name as student_name, s.nisn as student_nisn
     FROM students s
     JOIN attendance_sessions ses ON s.class_id = ses.class_id
     LEFT JOIN attendance_records ar ON ar.session_id = ses.id AND ar.student_id = s.id
     WHERE ses.id = ? AND s.active = 1
     ORDER BY s.name ASC`,
    [sessionId]
  );

  return rows.map((r) => ({
    id: r.id || `temp-${r.student_id}`,
    session_id: sessionId,
    student_id: r.student_id,
    student_name: r.student_name,
    student_nisn: r.student_nisn,
    status: (r.status as AttendanceStatus) || "alpa",
    scanned_at: r.scanned_at,
    source: r.source || "qr_scan_siswa",
    notes: r.notes,
  }));
}

export async function getStudentAttendanceHistory(
  studentId: string
): Promise<any[]> {
  const rows = await query<any>(
    `SELECT ar.status, ar.scanned_at, ar.source,
            s.subject_name, s.teacher_name, s.session_date, c.name as class_name
     FROM attendance_records ar
     JOIN attendance_sessions s ON ar.session_id = s.id
     JOIN classes c ON s.class_id = c.id
     WHERE ar.student_id = ?
     ORDER BY s.created_at DESC`,
    [studentId]
  );
  return rows;
}
