/**
 * useCalendar Hook
 * Encapsulates all calendar tasks state and logic
 */

import { useState, useCallback } from 'react';
import { CalendarTask, CalendarTaskType, NewTaskForm } from '../types/calendar';

export interface UseCalendarReturn {
    calendarTasks: CalendarTask[];
    setCalendarTasks: React.Dispatch<React.SetStateAction<CalendarTask[]>>;
    currentMonth: Date;
    setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
    selectedDate: string | null;
    setSelectedDate: React.Dispatch<React.SetStateAction<string | null>>;
    newTask: NewTaskForm;
    setNewTask: React.Dispatch<React.SetStateAction<NewTaskForm>>;
    addCalendarTask: () => void;
    deleteCalendarTask: (id: string) => void;
    toggleTaskCompleted: (id: string) => void;
    exportToGoogleCalendar: () => void;
    generateGoogleCalendarUrl: (task: CalendarTask) => string;
    addToGoogleCalendar: (task: CalendarTask) => void;
}

const initialNewTask: NewTaskForm = {
    description: '',
    type: 'pago'
};

export function useCalendar(initialTasks: CalendarTask[] = []): UseCalendarReturn {
    const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>(initialTasks);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [newTask, setNewTask] = useState<NewTaskForm>(initialNewTask);

    const addCalendarTask = useCallback(() => {
        if (!selectedDate || !newTask.description.trim()) return;

        const task: CalendarTask = {
            id: `task-${Date.now()}`,
            date: selectedDate,
            description: newTask.description.trim(),
            type: newTask.type,
            completed: false
        };

        setCalendarTasks(prev => [...prev, task]);
        setNewTask(initialNewTask);
        setSelectedDate(null);
    }, [selectedDate, newTask]);

    const deleteCalendarTask = useCallback((id: string) => {
        setCalendarTasks(prev => prev.filter(t => t.id !== id));
    }, []);

    const toggleTaskCompleted = useCallback((id: string) => {
        setCalendarTasks(prev => prev.map(t =>
            t.id === id ? { ...t, completed: !t.completed } : t
        ));
    }, []);

    const exportToGoogleCalendar = useCallback(() => {
        if (calendarTasks.length === 0) {
            alert('No hay tareas para exportar');
            return;
        }

        const lines: string[] = [];
        lines.push('BEGIN:VCALENDAR');
        lines.push('VERSION:2.0');
        lines.push('PRODID:-//FinanceAI Pro//ES');
        lines.push('CALSCALE:GREGORIAN');
        lines.push('METHOD:PUBLISH');

        calendarTasks.forEach(task => {
            const dateStr = task.date.replace(/-/g, '');
            const uid = task.id + '@financeai.local';
            const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const cleanDesc = task.description.replace(/[,;]/g, ' ');
            const typeLabel = task.type === 'pago' ? 'PAGO' : task.type === 'recordatorio' ? 'RECORDATORIO' : 'TAREA';

            lines.push('BEGIN:VEVENT');
            lines.push('UID:' + uid);
            lines.push('DTSTAMP:' + now);
            lines.push('DTSTART;VALUE=DATE:' + dateStr);
            lines.push('SUMMARY:' + typeLabel + ' - ' + cleanDesc);
            lines.push('DESCRIPTION:' + cleanDesc);
            lines.push('STATUS:CONFIRMED');
            lines.push('BEGIN:VALARM');
            lines.push('TRIGGER:-P1D');
            lines.push('ACTION:DISPLAY');
            lines.push('DESCRIPTION:Recordatorio');
            lines.push('END:VALARM');
            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');

        const icsContent = lines.join('\r\n');
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'financeai_pagos.ics';
        a.click();
        URL.revokeObjectURL(url);
    }, [calendarTasks]);

    const generateGoogleCalendarUrl = useCallback((task: CalendarTask): string => {
        const dateStr = task.date.replace(/-/g, '');
        const typeLabel = task.type === 'pago' ? '💳 PAGO' : task.type === 'recordatorio' ? '🔔 RECORDATORIO' : '📌 TAREA';
        const title = encodeURIComponent(`${typeLabel}: ${task.description}`);
        const details = encodeURIComponent(`Creado desde FinanceAI Pro\nTipo: ${task.type}\nDescripción: ${task.description}`);

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${details}`;
    }, []);

    const addToGoogleCalendar = useCallback((task: CalendarTask) => {
        const url = generateGoogleCalendarUrl(task);
        window.open(url, '_blank');
    }, [generateGoogleCalendarUrl]);

    return {
        calendarTasks,
        setCalendarTasks,
        currentMonth,
        setCurrentMonth,
        selectedDate,
        setSelectedDate,
        newTask,
        setNewTask,
        addCalendarTask,
        deleteCalendarTask,
        toggleTaskCompleted,
        exportToGoogleCalendar,
        generateGoogleCalendarUrl,
        addToGoogleCalendar
    };
}
