# DayDeck Architecture

## Overview

DayDeck is a mobile-first daily planner that organizes tasks into a visual timeline. It is built as an offline-first React Native app using Expo, with local SQLite storage and Zustand for state management.

## Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | React Native + Expo | 0.81 / SDK 54 | Cross-platform iOS + Android from a single codebase. Expo managed workflow avoids native build complexity. |
| Language | TypeScript | 5.9 | Type safety across the entire codebase. `strict: true` enforced. |
| State Management | Zustand | 5.x | Lightweight (~1KB), no boilerplate, built-in middleware for persistence. Simpler than Redux for a single-user local app. |
| Local Storage | expo-sqlite | 16.x | Relational data model (tasks, subtasks, recurrence rules) maps naturally to SQL. Faster than AsyncStorage for queries. Supports offline-first by design. |
| Navigation | React Navigation | 7.x | Industry standard for RN. Bottom tabs + native stack for day switching, settings. |
| Animation | react-native-reanimated | 4.x | Required for drag/drop/resize on the timeline. Runs animations on the UI thread for 60fps. |
| Gestures | react-native-gesture-handler | 2.28 | Pairs with reanimated for drag-to-reorder and resize handles. |
| Dates | date-fns | 4.x | Tree-shakeable, immutable, timezone-aware. Used for all date arithmetic (carry-over, recurrence). |
| Notifications | expo-notifications | 0.32 | Push and local notifications for task reminders. |
| Calendar | expo-calendar | 15.x | Read-only access to device calendar for overlay view. |

## Folder Structure

```
DayDeck/
  App.tsx                # Root component, navigation container
  index.ts               # Entry point (registerRootComponent)
  babel.config.js        # Babel presets + reanimated plugin
  eslint.config.mjs      # ESLint flat config (TS + React + Prettier)
  .prettierrc            # Prettier formatting rules
  src/
    types/               # TypeScript interfaces and enums
      models.ts          # All domain types: Task, Subtask, TimeBlock, etc.
      index.ts           # Barrel export
    store/               # Zustand stores (in-memory, reactive)
      useTaskStore.ts    # Task CRUD, completion toggling
      useTimeBlockStore.ts # TimeBlock CRUD
      index.ts           # Barrel export
    db/                  # SQLite layer (source of truth)
      schema.ts          # CREATE TABLE statements, migrations
      taskDb.ts          # Task read/write queries
      dayPlanDb.ts       # DayPlan persistence
    screens/             # Top-level screen components
      DayTimelineScreen.tsx
      SettingsScreen.tsx
    components/          # Reusable UI components
      timeline/          # TimeBlock, TimeSlot, HourMarker
      task/              # TaskCard, SubTaskRow, TaskForm
      common/            # Button, Modal, Badge
    hooks/               # Custom React hooks
      useDatabase.ts     # SQLite init and migration
      useCarryOver.ts    # Unfinished task logic
    utils/               # Pure helper functions
      dateHelpers.ts     # Formatting, timezone, recurrence math
      idGenerator.ts     # Unique ID generation
      accessibility.ts   # A11y helpers (announcements, labels)
      index.ts           # Barrel export
    constants/           # App-wide constants
      colors.ts          # Color palette with WCAG contrast ratios
      dimensions.ts      # Touch targets, spacing, timeline dimensions
      config.ts          # App defaults (task duration, DB name)
      index.ts           # Barrel export
```

## Data Flow

```
                  +------------------+
                  |   expo-sqlite    |
                  |  (source of      |
                  |   truth, disk)   |
                  +--------+---------+
                           |
                    hydrate on launch
                    write on mutation
                           |
                  +--------v---------+
                  |   Zustand Store   |
                  |  (in-memory,     |
                  |   reactive)      |
                  +--------+---------+
                           |
                  useStore selectors
                           |
              +------------+-------------+
              |            |             |
        +-----v----+ +----v-----+ +-----v------+
        | Timeline  | | Task     | | Settings   |
        | Screen    | | Form     | | Screen     |
        +-----------+ +----------+ +------------+
```

1. **On app launch**: `useDatabase` hook opens the SQLite database, runs migrations, and hydrates the Zustand stores with today's data.
2. **User actions** (create task, drag to reschedule, mark done): dispatch to Zustand store, which synchronously updates in-memory state (UI reacts immediately) and asynchronously writes to SQLite.
3. **Day switching**: Zustand store loads the target day's DayPlan from SQLite, replacing in-memory state.
4. **Carry-over**: On opening a new day, `useCarryOver` queries SQLite for incomplete tasks from previous days and prompts the user to carry them forward.

## Data Models

### Task

```typescript
interface Task {
  id: string;                    // UUID v4
  title: string;
  notes: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes: number | null;
  scheduledDate: string;         // ISO 8601 date: "2026-02-06"
  startTime: string | null;      // ISO 8601 time: "09:00"
  endTime: string | null;        // ISO 8601 time: "10:30"
  recurrenceRule: RecurrenceRule | null;
  parentTaskId: string | null;   // For subtasks (single nesting level)
  sortOrder: number;             // Position in the day timeline
  createdAt: string;             // ISO 8601 datetime with timezone offset
  updatedAt: string;             // ISO 8601 datetime with timezone offset
  completedAt: string | null;    // ISO 8601 datetime with timezone offset
}
```

### RecurrenceRule

```typescript
interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;              // Every N days/weeks/months
  daysOfWeek: number[];          // 0=Sun..6=Sat (for weekly)
  endDate: string | null;        // ISO 8601 date or null for no end
}
```

### DayPlan

```typescript
interface DayPlan {
  date: string;                  // ISO 8601 date: "2026-02-06"
  wakeTime: string;              // "07:00"
  sleepTime: string;             // "23:00"
  taskIds: string[];             // Ordered list of task IDs for this day
}
```

## Storage Strategy (expo-sqlite)

### Why SQLite over AsyncStorage

- **Relational queries**: "Give me all incomplete tasks from the last 7 days" is a single SQL query vs. manually scanning JSON blobs.
- **Performance**: SQLite handles thousands of records without loading everything into memory.
- **Migrations**: Schema versioning via a `schema_version` table allows safe upgrades.
- **Transactions**: Atomic writes prevent partial state corruption.

### Schema Versioning

A `schema_version` table tracks the current version. On app launch, `useDatabase` compares the stored version against the app's expected version and runs migration functions sequentially. Migrations are idempotent and wrapped in transactions.

### Timezone Handling

All dates stored as ISO 8601 strings. Date-only fields (`scheduledDate`, `endDate`) use `YYYY-MM-DD` format without timezone (they represent "the user's local concept of that day"). Datetime fields (`createdAt`, `updatedAt`, `completedAt`) include timezone offset (e.g., `2026-02-06T09:30:00-05:00`). The app converts between these representations at the boundary using date-fns.

## Key Architectural Decisions

### 1. Single-level subtasks only

Subtasks use `parentTaskId` but cannot themselves have children. This avoids recursive UI complexity and keeps the timeline view flat and readable. If deeper nesting is needed later, the data model supports it (just remove the UI constraint).

### 2. Zustand over Redux

For a single-user offline app with no server sync, Zustand's simplicity wins. No action types, no reducers, no middleware boilerplate. The stores are small enough to be readable in a single file each.

### 3. ISO string dates over Date objects

Storing Date objects in Zustand or SQLite causes serialization headaches. ISO strings are JSON-safe, SQLite-safe, and timezone-explicit. date-fns operates on both Date objects and ISO strings seamlessly.

### 4. Offline-first, no cloud sync (MVP)

The MVP has no server. All data lives in SQLite on the device. This eliminates auth, conflict resolution, and network error handling. Cloud sync can be added later as a separate storage adapter behind the Zustand store.

### 5. Gesture-driven timeline

The timeline is a scrollable FlatList of time slots. Tasks are absolutely positioned within slots based on their startTime/endTime. Drag uses react-native-reanimated shared values for smooth 60fps updates, with gesture-handler for touch tracking.

## Accessibility Considerations

- All interactive elements must meet 44x44pt minimum touch targets (Apple HIG) / 48x48dp (Material Design).
- Color palette must maintain WCAG 2.1 AA contrast ratios (4.5:1 for text, 3:1 for UI components).
- Task status changes must be announced via `accessibilityLiveRegion`.
- Timeline hours must have `accessibilityLabel` with spoken time ("9 AM" not "09:00").
- Drag-and-drop must have a non-gesture alternative (move up/move down buttons) for users who cannot perform drag gestures.
