import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { AuthSessionData, UserRole } from "@/types/domain";
import { query, queryOne } from "@/lib/db";

const COOKIE_NAME = "apsen_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12 jam

function getAuthSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "apsen_sma_secret_key_2026_super_secure";
  return new TextEncoder().encode(secret);
}

export async function verifyUserCredentials(
  usernameInput: string,
  passwordInput: string
): Promise<AuthSessionData | null> {
  const cleanUsername = usernameInput.trim();
  const cleanPassword = passwordInput.trim();

  // 1. Cek dari tabel Users (Guru, Wali Kelas, Admin)
  const user = await queryOne<{
    id: string;
    username: string;
    name: string;
    role: UserRole;
    class_id: string | null;
    password: string;
  }>(
    "SELECT id, username, name, role, class_id, password FROM users WHERE username = ?",
    [cleanUsername]
  );

  if (user && user.password === cleanPassword) {
    return {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      classId: user.class_id,
    };
  }

  // 2. Cek dari tabel Students (Murid / Siswa)
  const student = await queryOne<{
    id: string;
    nisn: string;
    name: string;
    class_id: string;
    password: string;
  }>(
    "SELECT id, nisn, name, class_id, password FROM students WHERE nisn = ? AND active = 1",
    [cleanUsername]
  );

  if (student && student.password === cleanPassword) {
    return {
      userId: student.id,
      username: student.nisn,
      name: student.name,
      role: "siswa",
      classId: student.class_id,
    };
  }

  // 3. Fallback Admin dari .env
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "admin";
  if (cleanUsername === adminUser && cleanPassword === adminPass) {
    return {
      userId: "admin-env",
      username: adminUser,
      name: "Administrator Kurikulum",
      role: "admin",
      classId: null,
    };
  }

  return null;
}

export async function createSession(data: AuthSessionData): Promise<string> {
  const token = await new SignJWT({
    sub: data.userId,
    username: data.username,
    name: data.name,
    role: data.role,
    classId: data.classId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getAuthSecretKey());

  return token;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionData(): Promise<AuthSessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    return {
      userId: (payload.sub as string) || "",
      username: (payload.username as string) || "",
      name: (payload.name as string) || "",
      role: (payload.role as UserRole) || "siswa",
      classId: (payload.classId as string) || null,
    };
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const data = await getSessionData();
  return data !== null;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
