import { useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { initDatabase } from '../db/schema';
import { Config } from '../constants';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function setup() {
      try {
        if (!dbInstance) {
          dbInstance = await SQLite.openDatabaseAsync(Config.dbName);
          await initDatabase(dbInstance);
        }
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }
    setup();
  }, []);

  return { db: dbInstance, isReady, error };
}
