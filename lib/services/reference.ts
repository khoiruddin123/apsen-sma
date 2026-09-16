import "server-only";
import { query } from "@/lib/db";
import type { ClassRow } from "@/types/domain";

export async function listClasses(): Promise<ClassRow[]> {
  const rows = await query<ClassRow>(
    "SELECT id, name, grade, major, sort_order FROM classes ORDER BY sort_order ASC"
  );
  return rows;
}
