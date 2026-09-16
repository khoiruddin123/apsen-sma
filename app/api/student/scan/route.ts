import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/auth";
import { studentScanQrCode } from "@/lib/services/attendance";

export async function POST(request: Request) {
  try {
    const userSession = await getSessionData();
    if (!userSession || userSession.role !== "siswa") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya akun Murid / Siswa yang bisa melakukan scan." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { qrToken } = body;

    if (!qrToken) {
      return NextResponse.json(
        { error: "QR Token tidak ditemukan." },
        { status: 400 }
      );
    }

    const result = await studentScanQrCode(userSession.userId, qrToken);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Gagal memproses presensi." },
      { status: 500 }
    );
  }
}
