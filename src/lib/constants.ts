/**
 * Constants
 * Application-wide constants and configurations
 */

import {
    ShoppingCart,
    Heart,
    Car,
    Plane,
    Smartphone,
    Shirt,
    Home,
    GraduationCap,
    Utensils,
    Gift,
    Sparkles,
    Package,
    MoreHorizontal
} from 'lucide-react';

/**
 * Default monthly income for calculations
 */
export const DEFAULT_INCOME = 6137000;

/**
 * Expense categories for transaction classification
 */
export const EXPENSE_CATEGORIES = [
    { id: 'alimentacion', name: 'Alimentación', icon: ShoppingCart, color: 'bg-green-500' },
    { id: 'salud', name: 'Salud', icon: Heart, color: 'bg-red-500' },
    { id: 'entretencion', name: 'Entretención', icon: Sparkles, color: 'bg-purple-500' },
    { id: 'transporte', name: 'Transporte', icon: Car, color: 'bg-blue-500' },
    { id: 'viajes', name: 'Viajes', icon: Plane, color: 'bg-cyan-500' },
    { id: 'tecnologia', name: 'Tecnología', icon: Smartphone, color: 'bg-indigo-500' },
    { id: 'ropa', name: 'Ropa', icon: Shirt, color: 'bg-pink-500' },
    { id: 'calzado', name: 'Calzado', icon: Package, color: 'bg-orange-500' },
    { id: 'aseo', name: 'Artículos de Aseo', icon: Sparkles, color: 'bg-teal-500' },
    { id: 'hogar', name: 'Hogar', icon: Home, color: 'bg-amber-500' },
    { id: 'educacion', name: 'Educación', icon: GraduationCap, color: 'bg-violet-500' },
    { id: 'restaurantes', name: 'Restaurantes', icon: Utensils, color: 'bg-rose-500' },
    { id: 'regalos', name: 'Regalos', icon: Gift, color: 'bg-fuchsia-500' },
    { id: 'otros', name: 'Otros', icon: MoreHorizontal, color: 'bg-slate-500' },
] as const;

/**
 * Budget ratios (50/30/20 rule)
 */
export const BUDGET_RATIOS = {
    needs: 0.50,
    wants: 0.30,
    savings: 0.20
} as const;

/**
 * Sync debounce delay in milliseconds
 */
export const SYNC_DEBOUNCE_MS = 2000;
