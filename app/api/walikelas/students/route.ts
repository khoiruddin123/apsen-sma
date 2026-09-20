import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/auth";
import { query, queryOne, execute } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const userSession = await getSessionData();
    if (!userSession || (userSession.role !== "wali_kelas" && userSession.role !== "admin" && userSession.role !== "guru")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json();
    const { name, nisn, gender, classId, password } = body;

    if (!name || !nisn || !classId) {
      return NextResponse.json(
        { error: "Nama Siswa, NISN, dan Kelas wajib diisi." },
        { status: 400 }
      );
    }

    const existing = await queryOne(
      "SELECT id FROM students WHERE nisn = ?",
      [nisn.trim()]
    );
    if (existing) {
      return NextResponse.json(
        { error: `NISN ${nisn} sudah terdaftar pada sistem.` },
        { status: 400 }
      );
    }

    const studentId = `std-${uuidv4().substring(0, 8)}`;
    const studentPassword = password?.trim() || "123456";
    const studentGender = gender === "P" ? "P" : "L";

    await execute(
      `INSERT INTO students (id, nisn, name, class_id, gender, password, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [studentId, nisn.trim(), name.trim(), classId, studentGender, studentPassword]
    );

    return NextResponse.json({
      ok: true,
      message: "Siswa baru berhasil ditambahkan.",
      student: {
        id: studentId,
        nisn: nisn.trim(),
        name: name.trim(),
        class_id: classId,
        gender: studentGender,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userSession = await getSessionData();
    if (!userSession || (userSession.role !== "wali_kelas" && userSession.role !== "admin" && userSession.role !== "guru")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, nisn, gender, active } = body;

    if (!id || !name || !nisn) {
      return NextResponse.json(
        { error: "ID, Nama Siswa, dan NISN wajib diisi." },
        { status: 400 }
      );
    }

    const studentGender = gender === "P" ? "P" : "L";
    const studentActive = active === false || active === 0 ? 0 : 1;

    await execute(
      `UPDATE students 
       SET name = ?, nisn = ?, gender = ?, active = ? 
       WHERE id = ?`,
      [name.trim(), nisn.trim(), studentGender, studentActive, id]
    );

    return NextResponse.json({
      ok: true,
      message: "Data siswa berhasil diperbarui.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userSession = await getSessionData();
    if (!userSession || (userSession.role !== "wali_kelas" && userSession.role !== "admin" && userSession.role !== "guru")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID Siswa wajib diisi." }, { status: 400 });
    }

    // Hapus data presensi terkait terlebih dahulu agar referensial tetap bersih, kemudian hapus data siswa
    await execute("DELETE FROM attendance_records WHERE student_id = ?", [id]);
    await execute("DELETE FROM students WHERE id = ?", [id]);

    return NextResponse.json({
      ok: true,
      message: "Siswa berhasil dihapus dari sistem.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
