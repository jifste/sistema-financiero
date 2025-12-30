# 💳 Vercel + Supabase Guide (Sin Tarjeta)

Guía para desplegar FinanceAI Pro usando servicios 100% gratuitos y sin necesidad de tarjeta de crédito (Serverless).

## Arquitectura
- **Frontend**: Vercel
- **Backend**: Vercel Serverless Functions (No Docker)
- **Base de Datos**: Supabase (PostgreSQL)

---

## Paso 1: Configurar Base de Datos (Supabase)

1. Ve a [supabase.com](https://supabase.com) y haz clic en **"Start your project"**.
2. Loguéate con GitHub.
3. Crea un nuevo proyecto:
   - **Name**: FinanceAI
   - **Database Password**: Genera una segura y **guárdala**.
   - **Region**: Elige la más cercana (ej: Sao Paulo o US East).
   - **Pricing Plan**: Free ($0/month).
4. Espera unos minutos a que se inicie.
5. Ve a **Project Settings** (engranaje) -> **Database** -> **Connection String**.
6. Copia la URL de "Nodejs" (se ve como: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`).
   - Reemplaza `[password]` con tu contraseña real.

---

## Paso 2: Desplegar en Vercel

Vercel desplegará tanto el Frontend como el Backend en el mismo proyecto.

1. Ve a [vercel.com](https://vercel.com) -> **Add New** -> **Project**.
2. Importa tu repositorio `sistema-financiero`.
3. **Configuración del Proyecto**:
   - **Framework Preset**: Vite (lo detectará solo).
   - **Root Directory**: `.` (Déjalo en la raíz).

4. **Variables de Entorno (Environment Variables)**:
   Agrega las siguientes variables:

   | Variable | Valor |
   |----------|-------|
   | `DATABASE_URL` | Tu URL de Supabase (del Paso 1) |
   | `JWT_SECRET` | Una clave secreta larga (ej: genera una nueva) |
   | `NODE_ENV` | `production` |
   | `VITE_API_URL` | `/api` (Importante: como están en el mismo dominio, usaremos ruta relativa) |

5. Haz clic en **Deploy**.

---

## Paso 3: Verificar

Una vez desplegado:
1. Tu app estará en `https://financeai-pro.vercel.app` (o similar).
2. El frontend cargará.
3. El backend responderá en `https://financeai-pro.vercel.app/api/health`.

### Troubleshooting
Si la API da error 500:
- Revisa los **Logs** en el Dashboard de Vercel -> Pestaña Functions.
- Asegúrate de que `DATABASE_URL` es correcta y la contraseña no contiene caracteres especiales que rompan la URL (si los tiene, usa encoding, ej: `%40` para `@`).
