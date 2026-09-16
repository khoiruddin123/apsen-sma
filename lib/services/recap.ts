import { query } from "@/lib/db";

export async function getClassSummaryForWaliKelas(classId: string) {
  // 1. Total Siswa di kelas
  const studentCountRow = await query<any>(
    "SELECT COUNT(*) as count FROM students WHERE class_id = ? AND active = 1",
    [classId]
  );
  const totalStudents = studentCountRow[0]?.count || 0;

  // 2. Total Sesi Pembelajaran yang telah dilaksanakan
  const sessionCountRow = await query<any>(
    "SELECT COUNT(*) as count FROM attendance_sessions WHERE class_id = ?",
    [classId]
  );
  const totalSessions = sessionCountRow[0]?.count || 0;

  // 3. Sesi Aktif saat ini di kelas tersebut
  const activeSessions = await query<any>(
    `SELECT s.id, s.subject_name, s.teacher_name, s.start_time, s.qr_token
     FROM attendance_sessions s
     WHERE s.class_id = ? AND s.status = 'open'
     ORDER BY s.created_at DESC`,
    [classId]
  );

  // 4. Rekapitulasi Presensi Kumulatif per Siswa
  const studentRecap = await query<any>(
    `SELECT s.id as student_id, s.nisn, s.name,
            SUM(CASE WHEN ar.status = 'hadir' THEN 1 ELSE 0 END) as total_hadir,
            SUM(CASE WHEN ar.status = 'sakit' THEN 1 ELSE 0 END) as total_sakit,
            SUM(CASE WHEN ar.status = 'izin' THEN 1 ELSE 0 END) as total_izin,
            SUM(CASE WHEN ar.status = 'alpa' THEN 1 ELSE 0 END) as total_alpa
     FROM students s
     LEFT JOIN attendance_records ar ON s.id = ar.student_id
     WHERE s.class_id = ? AND s.active = 1
     GROUP BY s.id, s.nisn, s.name
     ORDER BY s.name ASC`,
    [classId]
  );

  return {
    totalStudents,
    totalSessions,
    activeSessions,
    studentRecap,
  };
}
