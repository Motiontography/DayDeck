import type { SQLiteDatabase } from 'expo-sqlite';
import type { Template, TemplateBlock } from '../types';

interface TemplateRow {
  id: string;
  name: string;
  icon: string;
  blocks_json: string;
  created_at: string;
  updated_at: string;
}

function rowToTemplate(row: TemplateRow): Template {
  let blocks: TemplateBlock[] = [];
  try {
    blocks = JSON.parse(row.blocks_json) as TemplateBlock[];
  } catch {
    blocks = [];
  }
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    blocks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadAllTemplates(db: SQLiteDatabase): Promise<Template[]> {
  const rows = await db.getAllAsync<TemplateRow>(
    'SELECT * FROM templates ORDER BY created_at ASC',
  );
  return rows.map(rowToTemplate);
}

export async function saveTemplate(db: SQLiteDatabase, template: Template): Promise<void> {
  await db.runAsync(
    `INSERT INTO templates (id, name, icon, blocks_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       icon = excluded.icon,
       blocks_json = excluded.blocks_json,
       updated_at = excluded.updated_at`,
    [
      template.id,
      template.name,
      template.icon,
      JSON.stringify(template.blocks),
      template.createdAt,
      template.updatedAt,
    ],
  );
}

export async function deleteTemplateFromDb(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM templates WHERE id = ?', [id]);
}
