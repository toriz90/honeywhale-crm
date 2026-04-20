# HoneyWhale CRM — Contexto del Proyecto

## Descripción
CRM especializado en **recuperación de ventas abandonadas** de la tienda WooCommerce de HoneyWhale. Los agentes retoman pedidos no completados, los gestionan en un pipeline Kanban, y los recuperan mediante contacto directo (WhatsApp, llamadas, email).

## Stack Técnico

### Backend
- NestJS + TypeScript (modo strict)
- TypeORM + MySQL 8
- Redis (cache y colas)
- Socket.io (notificaciones en tiempo real)
- JWT + refresh tokens para autenticación
- RBAC con roles: ADMIN, SUPERVISOR, AGENTE

### Frontend
- React 18 + TypeScript
- Tailwind CSS (dark mode por defecto)
- Zustand (state management)
- React Query (data fetching)
- React Hook Form + Zod (formularios y validación)

### Infraestructura
- Docker Compose con servicios: hw_api, hw_frontend, hw_mysql, hw_redis, hw_nginx
- Nginx como proxy inverso en **puerto 8021**
  - ⚠️ IMPORTANTE: no usar el 8020 porque está ocupado por el proyecto INEIN
- Autenticación vía localStorage (mismo patrón que INEIN)

## Estructura de Carpetas

honeywhale-crm/
├── backend/
│   └── src/
│       ├── auth/          # JWT, refresh, guards, RBAC
│       ├── usuarios/      # CRUD usuarios con roles
│       ├── leads/         # Entidad Lead + pipeline
│       ├── dashboard/     # KPIs
│       └── common/        # Decoradores, filtros, pipes compartidos
├── frontend/
│   └── src/
│       ├── pages/         # LoginPage, DashboardPage, LeadsPage
│       ├── components/    # Sidebar, Layout, Kanban, etc.
│       ├── stores/        # Zustand stores
│       ├── hooks/         # React Query hooks
│       └── lib/           # api client, utils
├── docker-compose.yml
├── nginx/
└── CLAUDE.md

## Modelo de Dominio

### Entidad Lead (tabla `leads`)
- id — PK uuid
- nombre — varchar, cliente
- email — varchar
- telefono — varchar
- producto — varchar, producto que intentó comprar
- monto — decimal(10,2), monto del pedido abandonado
- moneda — enum MXN (default) | USD
- orden_woo_id — varchar nullable, ID del pedido en WooCommerce
- etapa — enum NUEVO | CONTACTADO | EN_NEGOCIACION | OFERTA_ENVIADA | RECUPERADO | PERDIDO (default NUEVO)
- motivo_abandono — varchar nullable
- asignado_a_id — FK usuarios, nullable
- notas — text nullable
- created_at, updated_at — timestamps
- deleted_at — timestamp nullable (soft delete)

## Autenticación con Google (OAuth 2.0)
- Las credenciales (google_client_id, google_client_secret_cifrado, google_redirect_uri, google_habilitado) se guardan cifradas en la tabla `configuracion` (singleton id=1) y se leen vía `ConfiguracionService.obtenerDescifrada()`.
- La estrategia `GoogleStrategy` se registra dinámicamente mediante un factory provider en `AuthModule`. Si `google_habilitado=false` o faltan credenciales, la estrategia no se registra (warning en logs) y el backend sigue arrancando.
- Endpoints:
  - GET `/api/auth/google` — inicia el flujo. Si está deshabilitado, responde 404.
  - GET `/api/auth/google/callback` — recibe el code de Google, valida email contra tabla `usuarios`, genera tokens y redirige a `${CORS_ORIGIN}/auth/google/callback?accessToken=...&refreshToken=...`.
  - GET `/api/configuracion/google-habilitado` — **público** (sin JWT). Expone sólo `{ habilitado: boolean }`.
- Sólo se permite login con Google a usuarios ya dados de alta (`usuarios.activo=true`). Si el email no existe, se redirige a `/login?error=google_no_autorizado`.
- El frontend (`GoogleCallbackPage`) decodifica el JWT para extraer `{ sub, email, rol, nombre }` y guardar la sesión en `useAuthStore`.
- El Redirect URI autorizado en Google Cloud debe ser exactamente `https://crm.victortoriz.cc/api/auth/google/callback`.
- El Client Secret sólo vive en DB cifrado; nunca se expone al frontend.

## Roles y Permisos
- ADMIN: acceso total, gestiona usuarios, ve todos los leads.
- SUPERVISOR: ve todos los leads, reasigna, no gestiona usuarios.
- AGENTE: solo ve y gestiona los leads asignados a él.

## Estilo Visual (alineado con INEIN)
Variables CSS globales:
--bg-base: #0d1117;
--bg-elev: #161b22;
--border: #30363d;
--text-primary: #c9d1d9;
--accent: #58a6ff;

El sidebar debe replicar los grupos y estilo del sidebar de INEIN.

## Convenciones de Código
- TypeScript strict en todo el monorepo.
- Naming: snake_case en DB, camelCase en código.
- DTOs con class-validator + class-transformer.
- Mensajes de error y UI en español.
- Commits en español, formato convencional (feat:, fix:, chore:, etc.).

## Comandos Comunes
- docker compose up -d            # levantar entorno
- docker compose logs -f hw_api   # logs backend
- docker compose exec hw_api npm run migration:run
- docker compose exec hw_api npm run test

## Integraciones Futuras (no implementar aún)
- WooCommerce: webhooks order.created y order.abandoned → crea Lead automáticamente.
- n8n: automatizaciones de seguimiento.
- Chatwoot: conversaciones unificadas vinculadas al Lead.

## Reglas para Claude Code
- Siempre usar TypeORM, nunca queries SQL crudos salvo para reportes complejos.
- Proteger todas las rutas con @UseGuards(JwtAuthGuard, RolesGuard).
- Soft deletes siempre con @DeleteDateColumn (columna deleted_at).
- No commitear archivos .env; usar .env.example.
- Preguntar antes de instalar nuevas dependencias pesadas.
