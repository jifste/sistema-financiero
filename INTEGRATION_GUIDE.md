# Guía de Integración: Arquitectura Modular

Esta guía explica cómo usar los nuevos módulos creados durante la refactorización.

## Uso Rápido

### Importar Tipos
```typescript
import { 
  CreditOperation, 
  CalendarTask, 
  SavingsProject,
  ImportedFile,
  MonthlySubscription,
  TabType 
} from './src/types';
```

### Usar Hooks
```typescript
import { useCredits, useCalendar, useSavings, useSubscriptions } from './src/hooks';

// En tu componente:
const credits = useCredits();
const calendar = useCalendar();
const savings = useSavings();
const subscriptions = useSubscriptions();

// Usar las funciones:
credits.addCreditOperation();
calendar.addCalendarTask();
savings.addSavingsProject();
```

### Usar Formatters
```typescript
import { formatCurrency, formatDate, formatMonthLabel } from './src/lib/formatters';

formatCurrency(1500000);  // "$1.500.000"
formatDate('2026-02-07'); // "07 feb 2026"
```

### Usar Constantes
```typescript
import { EXPENSE_CATEGORIES, BUDGET_RATIOS, DEFAULT_INCOME } from './src/lib/constants';

// EXPENSE_CATEGORIES tiene los iconos y colores
// BUDGET_RATIOS = { needs: 0.50, wants: 0.30, savings: 0.20 }
```

## Estructura de Archivos

```
src/
├── components/
│   └── layout/
│       ├── AppShell.tsx    # Orquestador principal
│       └── index.ts
├── hooks/
│   ├── useCredits.ts       # CRUD créditos
│   ├── useCalendar.ts      # CRUD calendario + Google Calendar
│   ├── useSavings.ts       # CRUD proyectos de ahorro
│   ├── useSubscriptions.ts # CRUD suscripciones
│   └── index.ts
├── lib/
│   ├── formatters.ts       # Formateo de moneda/fechas
│   └── constants.ts        # Categorías, ratios
└── types/
    ├── credit.ts
    ├── calendar.ts
    ├── savings.ts
    ├── import.ts
    ├── subscription.ts
    └── index.ts
```

## Próximos Pasos (Opcionales)

Para completar la migración de `App.tsx`:
1. Crear vistas individuales en `src/components/views/`
2. Mover lógica de importación a `src/features/import/`
3. Mover generación de reportes a `src/features/reports/`
4. Reemplazar `App.tsx` con `AppShell`
