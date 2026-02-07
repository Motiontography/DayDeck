import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Template } from '../types';
import { loadAllTemplates, saveTemplate, deleteTemplateFromDb } from '../db';
import { generateId } from '../utils';

let _db: SQLiteDatabase | null = null;

function persistTemplate(template: Template) {
  if (_db) saveTemplate(_db, template).catch(console.error);
}

const DEFAULT_TEMPLATES: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Morning Routine',
    icon: '\u{1F305}',
    blocks: [
      { title: 'Wake up & stretch', type: 'break', startHour: 6, startMinute: 0, durationMinutes: 30, color: '#34D399' },
      { title: 'Breakfast', type: 'break', startHour: 6, startMinute: 30, durationMinutes: 30, color: '#34D399' },
      { title: 'Daily planning', type: 'focus', startHour: 7, startMinute: 0, durationMinutes: 30, color: '#FBBF24' },
    ],
  },
  {
    name: 'Deep Work',
    icon: '\u{1F9E0}',
    blocks: [
      { title: 'Focus block 1', type: 'focus', startHour: 9, startMinute: 0, durationMinutes: 90, color: '#FBBF24' },
      { title: 'Short break', type: 'break', startHour: 10, startMinute: 30, durationMinutes: 15, color: '#34D399' },
      { title: 'Focus block 2', type: 'focus', startHour: 10, startMinute: 45, durationMinutes: 75, color: '#FBBF24' },
    ],
  },
  {
    name: 'Afternoon Sprint',
    icon: '\u{26A1}',
    blocks: [
      { title: 'Task block 1', type: 'task', startHour: 13, startMinute: 0, durationMinutes: 90, color: '#818CF8' },
      { title: 'Break', type: 'break', startHour: 14, startMinute: 30, durationMinutes: 15, color: '#34D399' },
      { title: 'Task block 2', type: 'task', startHour: 14, startMinute: 45, durationMinutes: 90, color: '#818CF8' },
      { title: 'Wrap up', type: 'task', startHour: 16, startMinute: 15, durationMinutes: 45, color: '#818CF8' },
    ],
  },
  {
    name: 'Evening Wind Down',
    icon: '\u{1F319}',
    blocks: [
      { title: 'Day review', type: 'task', startHour: 19, startMinute: 0, durationMinutes: 30, color: '#818CF8' },
      { title: 'Light tasks', type: 'task', startHour: 19, startMinute: 30, durationMinutes: 30, color: '#818CF8' },
      { title: 'Relax', type: 'break', startHour: 20, startMinute: 0, durationMinutes: 60, color: '#34D399' },
    ],
  },
];

interface TemplateStoreState {
  templates: Template[];
  hydrated: boolean;

  hydrateFromDb: (db: SQLiteDatabase) => Promise<void>;
  addTemplate: (template: Template) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
}

export const useTemplateStore = create<TemplateStoreState>((set, get) => ({
  templates: [],
  hydrated: false,

  hydrateFromDb: async (db) => {
    _db = db;
    let templates = await loadAllTemplates(db);

    // Seed default templates if none exist
    if (templates.length === 0) {
      const now = new Date().toISOString();
      const defaults: Template[] = DEFAULT_TEMPLATES.map((t) => ({
        ...t,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      }));
      for (const tmpl of defaults) {
        await saveTemplate(db, tmpl);
      }
      templates = defaults;
    }

    set({ templates, hydrated: true });
  },

  addTemplate: (template) => {
    set((state) => ({ templates: [...state.templates, template] }));
    persistTemplate(template);
  },

  updateTemplate: (id, updates) => {
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
      ),
    }));
    const updated = get().templates.find((t) => t.id === id);
    if (updated) persistTemplate(updated);
  },

  deleteTemplate: (id) => {
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
    if (_db) deleteTemplateFromDb(_db, id).catch(console.error);
  },
}));
