import type { SQLiteDatabase } from 'expo-sqlite';

const CURRENT_VERSION = 1;

const migrations: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      scheduled_date TEXT NOT NULL,
      estimated_minutes INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      recurrence_json TEXT,
      notifications_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      parent_task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS time_blocks (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      color TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'task',
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS day_plans (
      date TEXT PRIMARY KEY,
      wake_time TEXT NOT NULL DEFAULT '07:00',
      sleep_time TEXT NOT NULL DEFAULT '23:00',
      task_ids_json TEXT NOT NULL DEFAULT '[]',
      time_block_ids_json TEXT NOT NULL DEFAULT '[]'
    )`,
    `CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    )`,
    `INSERT INTO schema_version (version) VALUES (${CURRENT_VERSION})`,
  ],
};

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version LIMIT 1',
  ).catch(() => null);

  const currentVersion = result?.version ?? 0;

  for (let v = currentVersion + 1; v <= CURRENT_VERSION; v++) {
    const statements = migrations[v];
    if (statements) {
      await db.execAsync('BEGIN TRANSACTION');
      try {
        for (const sql of statements) {
          await db.execAsync(sql);
        }
        if (v > 1) {
          await db.execAsync(`UPDATE schema_version SET version = ${v}`);
        }
        await db.execAsync('COMMIT');
      } catch (error) {
        await db.execAsync('ROLLBACK');
        throw error;
      }
    }
  }
}

export { CURRENT_VERSION };
