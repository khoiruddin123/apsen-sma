import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/auth";
import { queryOne, execute } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const userSession = await getSessionData();
    if (
      !userSession ||
      (userSession.role !== "wali_kelas" &&
        userSession.role !== "admin" &&
        userSession.role !== "guru")
    ) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json();
    const { classId, students } = body;

    if (!classId || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: "Format data tidak valid atau daftar siswa kosong." },
        { status: 400 }
      );
    }

    let insertedCount = 0;
    let skippedCount = 0;
    const skippedNisns: string[] = [];

    for (const item of students) {
      const nisnStr = String(item.nisn || "").trim();
      const nameStr = String(item.name || "").trim();
      const genderStr = String(item.gender || "L").toUpperCase().trim() === "P" ? "P" : "L";
      const passStr = String(item.password || "123456").trim();

      if (!nisnStr || !nameStr) {
        skippedCount++;
        continue;
      }

      // Cek apakah NISN sudah terdaftar
      const existing = await queryOne("SELECT id FROM students WHERE nisn = ?", [
        nisnStr,
      ]);
      if (existing) {
        skippedCount++;
        skippedNisns.push(nisnStr);
        continue;
      }

      const studentId = `std-${uuidv4().substring(0, 8)}`;
      await execute(
        `INSERT INTO students (id, nisn, name, class_id, gender, password, active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [studentId, nisnStr, nameStr, classId, genderStr, passStr]
      );

      insertedCount++;
    }

    return NextResponse.json({
      ok: true,
      insertedCount,
      skippedCount,
      skippedNisns,
      message: `Berhasil mengimpor ${insertedCount} siswa. (${skippedCount} siswa dilewati karena NISN sudah terdaftar/tidak valid).`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
