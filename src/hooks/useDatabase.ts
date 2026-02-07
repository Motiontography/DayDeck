import { useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { initDatabase } from '../db/schema';
import { Config } from '../constants';
import { useTaskStore, useTimeBlockStore, useSettingsStore, useTemplateStore } from '../store';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hydrateTasksFromDb = useTaskStore((s) => s.hydrateFromDb);
  const hydrateTimeBlocksFromDb = useTimeBlockStore((s) => s.hydrateFromDb);
  const hydrateSettingsFromDb = useSettingsStore((s) => s.hydrateFromDb);
  const hydrateTemplatesFromDb = useTemplateStore((s) => s.hydrateFromDb);

  useEffect(() => {
    async function setup() {
      try {
        if (!dbInstance) {
          dbInstance = await SQLite.openDatabaseAsync(Config.dbName);
          await initDatabase(dbInstance);
        }
        await Promise.all([
          hydrateTasksFromDb(dbInstance),
          hydrateTimeBlocksFromDb(dbInstance),
          hydrateSettingsFromDb(dbInstance),
          hydrateTemplatesFromDb(dbInstance),
        ]);
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }
    setup();
  }, [hydrateTasksFromDb, hydrateTimeBlocksFromDb, hydrateSettingsFromDb, hydrateTemplatesFromDb]);

  return { db: dbInstance, isReady, error };
}
