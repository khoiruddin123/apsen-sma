import { NextResponse } from "next/server";
import { verifyUserCredentials, createSession, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username/NISN dan Password wajib diisi." },
        { status: 400 }
      );
    }

    const userData = await verifyUserCredentials(username, password);
    if (!userData) {
      return NextResponse.json(
        { error: "Username/NISN atau Password tidak sesuai." },
        { status: 401 }
      );
    }

    const token = await createSession(userData);
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: userData,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}
