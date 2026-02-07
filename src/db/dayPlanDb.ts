import type { SQLiteDatabase } from 'expo-sqlite';
import type { DayPlan } from '../types';
import { Defaults } from '../constants';

interface DayPlanRow {
  date: string;
  wake_time: string;
  sleep_time: string;
  task_ids_json: string;
  time_block_ids_json: string;
}

function rowToDayPlan(row: DayPlanRow): DayPlan {
  return {
    date: row.date,
    wakeTime: row.wake_time,
    sleepTime: row.sleep_time,
    taskIds: JSON.parse(row.task_ids_json) as string[],
    timeBlockIds: JSON.parse(row.time_block_ids_json) as string[],
  };
}

function createDefaultDayPlan(date: string): DayPlan {
  return {
    date,
    wakeTime: Defaults.quietHoursEnd, // "07:00"
    sleepTime: Defaults.quietHoursStart, // "22:00"
    taskIds: [],
    timeBlockIds: [],
  };
}

/**
 * Load a day plan from SQLite by date.
 * If no plan exists for the given date, creates and persists a default one.
 */
export async function loadDayPlan(db: SQLiteDatabase, date: string): Promise<DayPlan> {
  const row = await db.getFirstAsync<DayPlanRow>(
    'SELECT * FROM day_plans WHERE date = ?',
    [date],
  );

  if (row) {
    return rowToDayPlan(row);
  }

  // No plan exists for this date -- create a default and persist it
  const plan = createDefaultDayPlan(date);
  await saveDayPlan(db, plan);
  return plan;
}

/**
 * Upsert a day plan into SQLite.
 */
export async function saveDayPlan(db: SQLiteDatabase, plan: DayPlan): Promise<void> {
  await db.runAsync(
    `INSERT INTO day_plans (date, wake_time, sleep_time, task_ids_json, time_block_ids_json)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       wake_time = excluded.wake_time,
       sleep_time = excluded.sleep_time,
       task_ids_json = excluded.task_ids_json,
       time_block_ids_json = excluded.time_block_ids_json`,
    [
      plan.date,
      plan.wakeTime,
      plan.sleepTime,
      JSON.stringify(plan.taskIds),
      JSON.stringify(plan.timeBlockIds),
    ],
  );
}
