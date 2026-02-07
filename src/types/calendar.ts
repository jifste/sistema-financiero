/**
 * Calendar Types
 * Types related to calendar tasks and reminders
 */

export type CalendarTaskType = 'pago' | 'recordatorio' | 'otro';

export interface CalendarTask {
    id: string;
    date: string; // ISO date string
    description: string;
    type: CalendarTaskType;
    completed: boolean;
}

export interface NewTaskForm {
    description: string;
    type: CalendarTaskType;
}
