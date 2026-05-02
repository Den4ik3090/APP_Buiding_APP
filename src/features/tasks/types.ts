// Single source of truth is model.ts — re-export for backward compatibility
export type {
  TaskStatus,
  TaskPriority,
  Task,
  TaskResolution,
  TaskInsert,
  TaskUpdate,
  ResolutionInsert,
} from './model';
