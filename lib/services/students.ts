import { query, queryOne, execute } from "@/lib/db";
import { StudentWithClass, StudentRow } from "@/types/domain";
import { v4 as uuidv4 } from "uuid";

export async function getAllStudents(): Promise<StudentWithClass[]> {
  const rows = await query<any>(`
    SELECT s.id, s.nisn, s.name, s.class_id, s.gender, s.active, s.created_at,
           c.name as class_name
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.active = 1
    ORDER BY c.sort_order ASC, s.name ASC
  `);
  return rows.map((r) => ({
    ...r,
    gender: r.gender as "L" | "P",
    active: Boolean(r.active),
  }));
}

export async function getStudentsByClass(classId: string): Promise<StudentWithClass[]> {
  const rows = await query<any>(`
    SELECT s.id, s.nisn, s.name, s.class_id, s.gender, s.active, s.created_at,
           c.name as class_name
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.class_id = ? AND s.active = 1
    ORDER BY s.name ASC
  `, [classId]);
  return rows.map((r) => ({
    ...r,
    gender: r.gender as "L" | "P",
    active: Boolean(r.active),
  }));
}

export async function getStudentById(id: string): Promise<StudentWithClass | null> {
  const row = await queryOne<any>(`
    SELECT s.id, s.nisn, s.name, s.class_id, s.gender, s.active, s.created_at,
           c.name as class_name
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = ?
  `, [id]);
  if (!row) return null;
  return {
    ...row,
    gender: row.gender as "L" | "P",
    active: Boolean(row.active),
  };
}

export async function getStudentByNisn(nisn: string): Promise<StudentWithClass | null> {
  const row = await queryOne<any>(`
    SELECT s.id, s.nisn, s.name, s.class_id, s.gender, s.active, s.created_at,
           c.name as class_name
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.nisn = ?
  `, [nisn]);
  if (!row) return null;
  return {
    ...row,
    gender: row.gender as "L" | "P",
    active: Boolean(row.active),
  };
}

export async function createStudent(data: {
  nisn: string;
  name: string;
  class_id: string;
  gender: "L" | "P";
  password?: string;
}): Promise<string> {
  const id = `std-${uuidv4().substring(0, 8)}`;
  const password = data.password || "123456";
  await execute(
    "INSERT INTO students (id, nisn, name, class_id, gender, password) VALUES (?, ?, ?, ?, ?, ?)",
    [id, data.nisn.trim(), data.name.trim(), data.class_id, data.gender, password]
  );
  return id;
}

export async function updateStudent(
  id: string,
  data: { nisn?: string; name?: string; class_id?: string; gender?: "L" | "P" }
): Promise<boolean> {
  const fields: string[] = [];
  const params: any[] = [];

  if (data.nisn) {
    fields.push("nisn = ?");
    params.push(data.nisn.trim());
  }
  if (data.name) {
    fields.push("name = ?");
    params.push(data.name.trim());
  }
  if (data.class_id) {
    fields.push("class_id = ?");
    params.push(data.class_id);
  }
  if (data.gender) {
    fields.push("gender = ?");
    params.push(data.gender);
  }

  if (fields.length === 0) return false;

  params.push(id);
  const result = await execute(
    `UPDATE students SET ${fields.join(", ")} WHERE id = ?`,
    params
  );
  return result.affectedRows > 0;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const result = await execute("UPDATE students SET active = 0 WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
