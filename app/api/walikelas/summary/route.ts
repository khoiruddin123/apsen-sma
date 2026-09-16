import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/auth";
import { getClassSummaryForWaliKelas } from "@/lib/services/recap";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const userSession = await getSessionData();
    if (!userSession || (userSession.role !== "wali_kelas" && userSession.role !== "admin")) {
      return NextResponse.json(
        { error: "Akses khusus Wali Kelas / Admin." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedClassId = searchParams.get("classId");

    const classId = requestedClassId || userSession.classId || "cls-xi-ipa1";

    // Data info kelas
    const classInfoRow = await query<any>(
      "SELECT id, name, grade, major FROM classes WHERE id = ?",
      [classId]
    );

    const summary = await getClassSummaryForWaliKelas(classId);

    return NextResponse.json({
      classInfo: classInfoRow[0] || null,
      summary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
