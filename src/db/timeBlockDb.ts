import type { SQLiteDatabase } from 'expo-sqlite';
import type { TimeBlock, TimeBlockType } from '../types';

interface TimeBlockRow {
  id: string;
  task_id: string | null;
  title: string;
  start_time: string;
  end_time: string;
  color: string;
  type: string;
}

function rowToTimeBlock(row: TimeBlockRow): TimeBlock {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    startTime: row.start_time,
    endTime: row.end_time,
    color: row.color,
    type: row.type as TimeBlockType,
  };
}

export async function loadAllTimeBlocks(db: SQLiteDatabase): Promise<TimeBlock[]> {
  const rows = await db.getAllAsync<TimeBlockRow>(
    'SELECT * FROM time_blocks ORDER BY start_time ASC',
  );
  return rows.map(rowToTimeBlock);
}

export async function saveTimeBlock(db: SQLiteDatabase, block: TimeBlock): Promise<void> {
  await db.runAsync(
    `INSERT INTO time_blocks (id, task_id, title, start_time, end_time, color, type)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       task_id = excluded.task_id,
       title = excluded.title,
       start_time = excluded.start_time,
       end_time = excluded.end_time,
       color = excluded.color,
       type = excluded.type`,
    [block.id, block.taskId, block.title, block.startTime, block.endTime, block.color, block.type],
  );
}

export async function deleteTimeBlockFromDb(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM time_blocks WHERE id = ?', [id]);
}
