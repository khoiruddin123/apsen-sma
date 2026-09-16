import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/auth";
import { openSession, closeSession, getActiveSessionByClass, getSessionById } from "@/lib/services/sessions";

export async function GET(request: Request) {
  try {
    const userSession = await getSessionData();
    if (!userSession || (userSession.role !== "guru" && userSession.role !== "admin")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const session = await getSessionById(sessionId);
      return NextResponse.json({ session });
    }

    if (classId) {
      const activeSession = await getActiveSessionByClass(classId);
      return NextResponse.json({ session: activeSession });
    }

    return NextResponse.json({ session: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userSession = await getSessionData();
    if (!userSession || (userSession.role !== "guru" && userSession.role !== "admin")) {
      return NextResponse.json(
        { error: "Hanya Guru Mata Pelajaran yang dapat membuka sesi KBM." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { subject_name, class_id } = body;

    if (!subject_name || !class_id) {
      return NextResponse.json(
        { error: "Nama Mata Pelajaran dan Kelas wajib diisi." },
        { status: 400 }
      );
    }

    const session = await openSession({
      subject_name,
      class_id,
      teacher_id: userSession.userId,
      teacher_name: userSession.name,
    });

    return NextResponse.json({ ok: true, session });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userSession = await getSessionData();
    if (!userSession || (userSession.role !== "guru" && userSession.role !== "admin")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId wajib diisi." }, { status: 400 });
    }

    const success = await closeSession(sessionId);
    return NextResponse.json({ ok: success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
