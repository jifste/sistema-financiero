/**
 * AppShell Component
 * 
 * Main orchestrator component that replaces the monolithic App.tsx
 * This component:
 * - Manages navigation state (activeTab)
 * - Integrates all custom hooks
 * - Renders the appropriate view based on active tab
 * - Handles sidebar and mobile responsiveness
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    LayoutDashboard,
    CreditCard,
    PieChart as PieChartIcon,
    Calendar,
    Target,
    History,
    Settings,
    LogOut,
    Menu,
    X,
    MessageSquare,
    Upload
} from 'lucide-react';

// Hooks
import { useCredits } from '../../hooks/useCredits';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { useCalendar } from '../../hooks/useCalendar';
import { useSavings } from '../../hooks/useSavings';

// Types
import { TabType } from '../../types';

// Auth
import { useAuth } from '../../contexts/AuthContext';

interface AppShellProps {
    children?: React.ReactNode;
}

// Navigation items configuration
const NAV_ITEMS: { id: TabType; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'resumen', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'movimientos', label: 'Movimientos', icon: History },
    { id: 'presupuesto', label: 'Presupuesto', icon: PieChartIcon },
    { id: 'creditos', label: 'Créditos', icon: CreditCard },
    { id: 'calendario', label: 'Calendario', icon: Calendar },
    { id: 'proyectos', label: 'Proyectos', icon: Target },
    { id: 'mis_datos', label: 'Mis Datos', icon: Settings },
];

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
    // Auth
    const { user, logout } = useAuth();

    // Navigation state
    const [activeTab, setActiveTab] = useState<TabType>('resumen');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // File import ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize hooks with empty arrays (will be populated from cloud/localStorage)
    const credits = useCredits();
    const subscriptions = useSubscriptions();
    const calendar = useCalendar();
    const savings = useSavings();

    // Handle tab change
    const handleTabChange = useCallback((tab: TabType) => {
        setActiveTab(tab);
        setIsMobileSidebarOpen(false);
    }, []);

    // Handle logout
    const handleLogout = useCallback(async () => {
        if (window.confirm('¿Seguro que deseas cerrar sesión?')) {
            await logout();
        }
    }, [logout]);

    // Toggle mobile sidebar
    const toggleMobileSidebar = useCallback(() => {
        setIsMobileSidebarOpen(prev => !prev);
    }, []);

    return (
        <div className="app-shell flex h-screen bg-slate-900 text-white overflow-hidden">
            {/* Mobile overlay */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-slate-800 border-r border-slate-700
          transform transition-transform duration-300 ease-in-out
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
                    <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        FinanceAI Pro
                    </span>
                    <button
                        className="lg:hidden p-2 hover:bg-slate-700 rounded"
                        onClick={() => setIsMobileSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => handleTabChange(id)}
                            className={`
                w-full flex items-center gap-3 px-4 py-3 text-left
                transition-colors duration-200
                ${activeTab === id
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'}
              `}
                        >
                            <Icon size={20} />
                            <span>{label}</span>
                        </button>
                    ))}

                    {/* AI Chat button */}
                    <button
                        onClick={() => handleTabChange('sugerencias')}
                        className={`
              w-full flex items-center gap-3 px-4 py-3 text-left mt-4
              border-t border-slate-700 pt-4
              ${activeTab === 'sugerencias'
                                ? 'bg-emerald-600 text-white'
                                : 'text-slate-300 hover:bg-slate-700 hover:text-white'}
            `}
                    >
                        <MessageSquare size={20} />
                        <span>Chat AI</span>
                    </button>
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-slate-700">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {user?.email || 'Usuario'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 
                       bg-slate-700 hover:bg-red-600 rounded-lg transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <header className="h-16 flex items-center justify-between px-4 bg-slate-800 border-b border-slate-700">
                    <button
                        className="lg:hidden p-2 hover:bg-slate-700 rounded"
                        onClick={toggleMobileSidebar}
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex items-center gap-4">
                        {/* Import button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                        >
                            <Upload size={18} />
                            <span className="hidden sm:inline">Importar</span>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xls,.xlsx,.pdf"
                            className="hidden"
                        // onChange={handleFileImport} -- Will be connected later
                        />
                    </div>
                </header>

                {/* Content area */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                    {/* Tab content will be rendered here */}
                    {children || (
                        <div className="text-center text-slate-400 py-20">
                            <p className="text-2xl font-bold mb-2">Tab: {activeTab}</p>
                            <p>Content for this tab will be rendered here.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AppShell;
