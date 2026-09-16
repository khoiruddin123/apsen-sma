import { query, queryOne } from "@/lib/db";
import { UserRow } from "@/types/domain";

export async function getAllUsers(): Promise<UserRow[]> {
  const rows = await query<any>(`
    SELECT u.id, u.username, u.name, u.role, u.class_id, c.name as class_name
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    ORDER BY u.role DESC, u.name ASC
  `);
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    name: r.name,
    role: r.role,
    class_id: r.class_id,
    class_name: r.class_name,
  }));
}

export async function getUserByUsername(username: string): Promise<UserRow | null> {
  const row = await queryOne<any>(`
    SELECT u.id, u.username, u.name, u.role, u.class_id, c.name as class_name
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    WHERE u.username = ?
  `, [username]);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    class_id: row.class_id,
    class_name: row.class_name,
  };
}

export async function getWaliKelasByClass(classId: string): Promise<UserRow | null> {
  const row = await queryOne<any>(`
    SELECT u.id, u.username, u.name, u.role, u.class_id, c.name as class_name
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    WHERE u.class_id = ? AND u.role = 'wali_kelas'
  `, [classId]);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    class_id: row.class_id,
    class_name: row.class_name,
  };
}
