# 🚀 FinanceAI Pro - Guía de Despliegue DevOps

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Cloudflare    │────▶│     Vercel      │     │    Railway      │
│   (DNS/WAF)     │     │   (Frontend)    │────▶│   (Backend)     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │   PostgreSQL    │
                                               │   (Database)    │
                                               └─────────────────┘
```

---

## Paso 1: Configurar Base de Datos (PostgreSQL)

### Opción A: Railway PostgreSQL (Recomendado para empezar)
1. En Railway, crea un nuevo proyecto.
2. Click en **"New"** → **"Database"** → **PostgreSQL**.
3. Railway genera automáticamente `DATABASE_URL`.
4. Copia esta URL para usarla en el backend.

### Opción B: Base de Datos Externa
Si usas un proveedor externo (Supabase, AWS RDS, etc.):
1. Obtén la URL de conexión.
2. Configura **IP Whitelisting** para permitir conexiones desde Railway.
   - *Nota*: Railway usa IPs dinámicas. Usa autenticación SSL robusta.

---

## Paso 2: Desplegar Backend en Railway

### 2.1 Conectar Repositorio
1. Ve a [railway.app](https://railway.app) y crea cuenta.
2. Click **"New Project"** → **"Deploy from GitHub"**.
3. Selecciona tu repositorio `sistema-financiero`.
4. Railway detectará automáticamente la carpeta `backend/` si la configuras.

### 2.2 Configurar Root Directory
En la configuración del servicio:
```
Root Directory: backend
```

### 2.3 Variables de Entorno (Railway)
En el panel de Railway → Tu servicio → **Variables**:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `PORT` | `3001` | Puerto del servidor |
| `NODE_ENV` | `production` | Entorno |
| `FRONTEND_URL` | `https://tu-app.vercel.app` | URL del frontend (para CORS) |
| `DATABASE_URL` | `postgresql://...` | URL de PostgreSQL |
| `JWT_SECRET` | `<generar-clave-segura>` | Clave para tokens JWT |
| `JWT_EXPIRES_IN` | `7d` | Expiración de tokens |

### 2.4 Generar JWT_SECRET Seguro
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2.5 Verificar Despliegue
Una vez desplegado, accede a:
```
https://tu-backend.railway.app/health
```
Deberías ver: `{"status":"ok",...}`

---

## Paso 3: Desplegar Frontend en Vercel

### 3.1 Conectar Repositorio
1. Ve a [vercel.com](https://vercel.com) y crea cuenta.
2. Click **"New Project"** → Importa desde GitHub.
3. Selecciona tu repositorio `sistema-financiero`.

### 3.2 Configuración del Proyecto
| Campo | Valor |
|-------|-------|
| Framework Preset | Vite |
| Root Directory | `.` (raíz, donde está el frontend) |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### 3.3 Variables de Entorno (Vercel)
En Vercel → Tu proyecto → **Settings** → **Environment Variables**:

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://tu-backend.railway.app` |
| `VITE_GEMINI_API_KEY` | `<tu-api-key>` (si usas Gemini AI) |

### 3.4 Verificar Despliegue
Accede a la URL que Vercel te asigna:
```
https://tu-app.vercel.app
```

---

## Paso 4: Configurar Cloudflare (DNS + Seguridad)

### 4.1 Agregar Dominio a Cloudflare
1. Crea cuenta en [cloudflare.com](https://cloudflare.com).
2. Click **"Add a Site"** → Ingresa tu dominio (ej: `financeai.cl`).
3. Cloudflare escaneará los registros DNS existentes.
4. Actualiza los nameservers en tu registrador de dominio con los de Cloudflare.

### 4.2 Configurar DNS Records

#### Frontend (Vercel)
| Tipo | Nombre | Contenido | Proxy |
|------|--------|-----------|-------|
| CNAME | `@` o `www` | `cname.vercel-dns.com` | ✅ (Proxied) |

*Alternativa*: En Vercel, agrega tu dominio personalizado y Vercel te dará las instrucciones exactas.

#### Backend (Railway)
| Tipo | Nombre | Contenido | Proxy |
|------|--------|-----------|-------|
| CNAME | `api` | `tu-backend.railway.app` | ✅ (Proxied) |

Ahora tu backend será accesible en: `https://api.financeai.cl`

### 4.3 Configuración de Seguridad Recomendada
En Cloudflare Dashboard → **Security**:

1. **SSL/TLS** → **Full (Strict)**: Encripta tráfico end-to-end.
2. **WAF** (Web Application Firewall):
   - Habilitar reglas gestionadas (Managed Rules).
3. **Bot Fight Mode**: Activar para proteger contra bots.
4. **Rate Limiting** (opcional): Limitar requests por IP.

---

## Paso 5: Actualizar URLs en el Código

### Frontend: Actualizar CORS
En `backend/src/index.ts`, asegúrate de que `FRONTEND_URL` incluya tu dominio:
```typescript
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'https://financeai.cl',
    'https://www.financeai.cl'
  ],
  credentials: true
}));
```

### Frontend: Usar Variable de Entorno
En el código React, usa la API URL desde variables de entorno:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

---

## 📋 Checklist de Variables de Entorno Críticas

### Backend (Railway)
| Variable | Obligatoria | Sensible |
|----------|:-----------:|:--------:|
| `DATABASE_URL` | ✅ | 🔐 |
| `JWT_SECRET` | ✅ | 🔐 |
| `FRONTEND_URL` | ✅ | ❌ |
| `PORT` | ✅ | ❌ |
| `NODE_ENV` | ✅ | ❌ |

### Frontend (Vercel)
| Variable | Obligatoria | Sensible |
|----------|:-----------:|:--------:|
| `VITE_API_URL` | ✅ | ❌ |
| `VITE_GEMINI_API_KEY` | ⚠️ Opcional | 🔐 |

---

## 🔒 Mejores Prácticas de Seguridad

1. **Nunca** commitear archivos `.env` a GitHub.
2. Usar **secrets** de Railway/Vercel para variables sensibles.
3. Rotar `JWT_SECRET` periódicamente.
4. Habilitar **2FA** en Railway, Vercel, Cloudflare y GitHub.
5. Revisar logs de Railway para detectar anomalías.

---

## 🧪 Verificación Post-Despliegue

1. **Frontend**: Abrir `https://tu-dominio.com` → Debe cargar la app.
2. **Backend Health**: `curl https://api.tu-dominio.com/health` → `{"status":"ok"}`.
3. **CORS**: Abrir DevTools en el frontend y verificar que no hay errores CORS.
4. **SSL**: Verificar candado verde en el navegador.

---

## 📞 Solución de Problemas Comunes

### Error: CORS
- Verificar que `FRONTEND_URL` en Railway coincide exactamente con la URL de Vercel.
- Incluir `https://` en la URL.

### Error: Build Failed (Railway)
- Verificar que `Root Directory` está configurado como `backend`.
- Revisar logs de build.

### Error: 502 Bad Gateway
- El backend no está respondiendo. Verificar `/health` endpoint.
- Revisar logs en Railway.

---

¡Listo! Tu aplicación está desplegada de forma segura. 🎉
