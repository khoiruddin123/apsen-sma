import { query } from "@/lib/db";

export async function getClassSummaryForWaliKelas(
  classId: string,
  monthYear?: string,
  subjectName?: string
) {
  // Ambil daftar unik mata pelajaran yang pernah diajarkan di kelas ini
  const subjectsRows = await query<any>(
    `SELECT DISTINCT subject_name 
     FROM attendance_sessions 
     WHERE class_id = ? AND subject_name IS NOT NULL AND subject_name != ''
     ORDER BY subject_name ASC`,
    [classId]
  );
  const subjectsList = subjectsRows.map((r: any) => r.subject_name);

  // Buat kondisi filter untuk sesi & record presensi
  const sessionConditions: string[] = ["class_id = ?"];
  const paramsSession: any[] = [classId];
  const recordConditions: string[] = [];

  if (monthYear && monthYear !== "all") {
    sessionConditions.push("DATE_FORMAT(session_date, '%Y-%m') = ?");
    paramsSession.push(monthYear);
    recordConditions.push(`DATE_FORMAT(ses.session_date, '%Y-%m') = '${monthYear}'`);
  }

  if (subjectName && subjectName !== "all") {
    sessionConditions.push("subject_name = ?");
    paramsSession.push(subjectName);
    recordConditions.push(`ses.subject_name = '${subjectName.replace(/'/g, "''")}'`);
  }

  const sessionCondition = "WHERE " + sessionConditions.join(" AND ");

  let recordJoinCondition = "LEFT JOIN attendance_records ar ON s.id = ar.student_id";
  if (recordConditions.length > 0) {
    const recordWhereClause = "WHERE " + recordConditions.join(" AND ");
    recordJoinCondition = `LEFT JOIN (
      SELECT ar_inner.* 
      FROM attendance_records ar_inner
      JOIN attendance_sessions ses ON ar_inner.session_id = ses.id
      ${recordWhereClause}
    ) ar ON s.id = ar.student_id`;
  }

  // 1. Total Siswa di kelas
  const studentCountRow = await query<any>(
    "SELECT COUNT(*) as count FROM students WHERE class_id = ?",
    [classId]
  );
  const totalStudents = studentCountRow[0]?.count || 0;

  // 2. Total Sesi Pembelajaran pada filter terpilih
  const sessionCountRow = await query<any>(
    `SELECT COUNT(*) as count FROM attendance_sessions ${sessionCondition}`,
    paramsSession
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

  // 4. Rekapitulasi Presensi per Siswa (Filtered by Month & Subject)
  const studentRecap = await query<any>(
    `SELECT s.id as student_id, s.nisn, s.name, s.gender, s.active,
            SUM(CASE WHEN ar.status = 'hadir' THEN 1 ELSE 0 END) as total_hadir,
            SUM(CASE WHEN ar.status = 'sakit' THEN 1 ELSE 0 END) as total_sakit,
            SUM(CASE WHEN ar.status = 'izin' THEN 1 ELSE 0 END) as total_izin,
            SUM(CASE WHEN ar.status = 'alpa' THEN 1 ELSE 0 END) as total_alpa
     FROM students s
     ${recordJoinCondition}
     WHERE s.class_id = ?
     GROUP BY s.id, s.nisn, s.name, s.gender, s.active
     ORDER BY s.name ASC`,
    [classId]
  );

  return {
    totalStudents,
    totalSessions,
    activeSessions,
    studentRecap,
    subjectsList,
  };
}
