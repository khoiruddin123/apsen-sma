import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const classes = await query<any>(
      "SELECT id, name, grade, major, sort_order FROM classes ORDER BY sort_order ASC"
    );
    return NextResponse.json({ classes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
