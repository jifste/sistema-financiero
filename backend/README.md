# FinanceAI Pro - Backend

API Backend para FinanceAI Pro. Desplegado en Railway.

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Ejecutar en modo desarrollo
npm run dev
```

## Build de Producción

```bash
npm run build
npm start
```

## Docker

```bash
# Build
docker build -t financeai-backend .

# Run
docker run -p 3001:3001 --env-file .env financeai-backend
```

## Endpoints

- `GET /health` - Health check
- `GET /api` - API info
- `POST /api/auth/register` - Registro (TODO)
- `POST /api/auth/login` - Login (TODO)
- `GET /api/transactions` - Transacciones (TODO)
