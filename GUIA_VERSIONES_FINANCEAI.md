# DOCUMENTACIÓN TÉCNICA
## Sistema Financiero - FinanceAI Pro
### Guía de Versiones y Respaldo

---

**Fecha:** Sábado, 07 de Febrero de 2026  
**Autor:** Antigravity AI  
**Versión del Documento:** 1.0

---

## 1. RESUMEN EJECUTIVO

Este documento describe la estructura de versiones del proyecto **FinanceAI Pro**, una aplicación de finanzas personales. Existen dos entornos principales:

1. **Versión Local (Desarrollo)** - Para pruebas y modificaciones sin afectar producción
2. **Versión GitHub (Producción)** - Código fuente oficial desplegado en Vercel

---

## 2. VERSIÓN LOCAL DE RESPALDO

### 2.1 Identificación Completa

| Campo | Valor |
|-------|-------|
| **Nombre** | financeai-local-20260207_122324 |
| **Fecha de Creación** | 07 de Febrero de 2026, 12:23:24 hrs |
| **Ubicación Absoluta** | `/Users/josefernandez/.gemini/antigravity/backups/financeai-local-20260207_122324/` |
| **Total de Archivos** | 138 |
| **Tamaño Total** | ~3.4 MB |
| **Estado** | ✅ Funcional al 100% |

### 2.2 ¿Qué Contiene?

La carpeta de respaldo incluye:

#### Archivos Principales
- `App.tsx` - Componente principal de la aplicación (con DEV_MODE activado)
- `index.tsx` - Punto de entrada (con bypass de autenticación)
- `package.json` - Dependencias del proyecto
- `vite.config.ts` - Configuración del bundler

#### Carpetas de Código Fuente
- `src/` - Código fuente modular
  - `components/` - Componentes de UI
  - `hooks/` - Hooks personalizados (useCredits, useCalendar, etc.)
  - `types/` - Definiciones de tipos TypeScript
  - `lib/` - Utilidades y constantes
  - `contexts/` - Contextos de React (AuthContext)
  - `services/` - Servicios de Supabase

#### Archivos de Datos
- `CuentaCorriente_07FEB26_1007.xls` - Cartola bancaria Febrero 2026
- `CuentaCorriente_15DIC25_1247.xls` - Cartola bancaria Diciembre 2025
- `CuentaCorriente_22DIC25_2247.xls` - Cartola bancaria Diciembre 2025

#### Scripts de Auditoría
- `forensic-audit.cjs` - Script de auditoría forense para conciliación bancaria

#### Documentación
- `SECURITY.md` - Política de seguridad
- `CONTRIBUTING.md` - Guía de contribución
- `INTEGRATION_GUIDE.md` - Guía de integración modular

### 2.3 Características Especiales de la Versión Local

Esta versión incluye modificaciones que permiten ejecutar la aplicación **sin necesidad de autenticación con Gmail**:

| Archivo | Modificación |
|---------|--------------|
| `App.tsx` | `DEV_MODE = true` - Usuario mock para desarrollo |
| `index.tsx` | `DEV_MODE = true` - Bypasea pantalla de login |

**Esto permite:**
- Probar cambios sin afectar datos de producción
- Desarrollar nuevas funcionalidades en aislamiento
- Depurar problemas sin depender de Supabase/Gmail

### 2.4 Cómo Ejecutar la Versión Local

1. Abrir Terminal
2. Navegar a la carpeta:
   ```bash
   cd ~/.gemini/antigravity/backups/financeai-local-20260207_122324
   ```
3. Instalar dependencias (si es necesario):
   ```bash
   npm install
   ```
4. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Abrir en navegador: `http://localhost:3001`

---

## 3. VERSIÓN GITHUB (PRODUCCIÓN)

### 3.1 Identificación del Repositorio

| Campo | Valor |
|-------|-------|
| **Nombre del Repositorio** | sistema-financiero |
| **Propietario** | jifste |
| **URL Completa** | https://github.com/jifste/sistema-financiero |
| **Rama Principal** | main |
| **Último Commit** | 41014c7 (audit: add forensic transaction audit script) |

### 3.2 ¿Cómo se Realizan los Cambios?

El flujo de trabajo para modificar el código de producción es:

```
1. DESARROLLO LOCAL
   ↓
2. git add .
   ↓
3. git commit -m "descripción del cambio"
   ↓
4. git push origin main
   ↓
5. GITHUB RECIBE LOS CAMBIOS
   ↓
6. VERCEL DETECTA Y DESPLIEGA AUTOMÁTICAMENTE
```

### 3.3 Comandos Típicos de Git

```bash
# Ver estado de cambios
git status

# Agregar todos los cambios
git add .

# Crear commit con mensaje descriptivo
git commit -m "feat: descripción de la funcionalidad"

# Subir a GitHub
git push origin main
```

### 3.4 URLs de Producción

| Servicio | URL |
|----------|-----|
| **App Desplegada** | https://sistema-financiero-qwqm.vercel.app/ |
| **Repositorio** | https://github.com/jifste/sistema-financiero |

---

## 4. DIFERENCIAS ENTRE VERSIONES

| Aspecto | Versión Local (Backup) | Versión GitHub |
|---------|------------------------|----------------|
| **Autenticación** | Deshabilitada (DEV_MODE) | Gmail/Supabase activo |
| **Base de Datos** | localStorage mock | Supabase (producción) |
| **Propósito** | Desarrollo y pruebas | Producción |
| **Acceso** | Solo tu computador | Público en Vercel |
| **Datos** | Datos de prueba | Datos reales del usuario |

---

## 5. RECOMENDACIONES

### Para Desarrollo:
1. Siempre trabajar en la versión local primero
2. Probar exhaustivamente antes de subir a GitHub
3. Mantener `DEV_MODE = true` solo en desarrollo
4. Crear backups periódicos de versiones funcionales

### Antes de Subir a Producción:
1. Cambiar `DEV_MODE = false` en `App.tsx` e `index.tsx`
2. Verificar que no haya datos sensibles en el commit
3. Revisar que los archivos `.xls` estén en `.gitignore`

---

## 6. CONTACTO Y SOPORTE

Para asistencia técnica con este proyecto, consultar la documentación en el repositorio o contactar al equipo de desarrollo.

---

*Documento generado automáticamente por Antigravity AI*
