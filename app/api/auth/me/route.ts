import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/auth";

export async function GET() {
  const data = await getSessionData();
  if (!data) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user: data });
}
