import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/auth";
import { getSessionAttendanceRecords, updateManualAttendance } from "@/lib/services/attendance";

export async function GET(request: Request) {
  try {
    const userSession = await getSessionData();
    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const records = await getSessionAttendanceRecords(sessionId);
    return NextResponse.json({ records });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userSession = await getSessionData();
    if (!userSession || (userSession.role !== "guru" && userSession.role !== "admin" && userSession.role !== "wali_kelas")) {
      return NextResponse.json(
        { error: "Hanya Guru yang dapat melakukan absensi manual." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sessionId, studentId, status, notes } = body;

    if (!sessionId || !studentId || !status) {
      return NextResponse.json(
        { error: "Data sessionId, studentId, dan status wajib diisi." },
        { status: 400 }
      );
    }

    const success = await updateManualAttendance({
      sessionId,
      studentId,
      status,
      notes,
    });

    return NextResponse.json({ ok: success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
