import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/auth";
import { studentScanQrCode } from "@/lib/services/attendance";

export async function POST(request: Request) {
  try {
    const userSession = await getSessionData();
    if (!userSession) {
      return NextResponse.json(
        { error: "Sesi tidak ditemukan. Silakan login kembali." },
        { status: 401 }
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

    // Jika yang login siswa, gunakan ID siswa tersebut. Jika admin/guru/walikelas sedang menguji portal siswa, gunakan ID student default (std-001)
    const targetStudentId = userSession.role === "siswa" ? userSession.userId : "std-001";

    const result = await studentScanQrCode(targetStudentId, qrToken);
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
