# HoneyWhale CRM

CRM especializado en **recuperación de ventas abandonadas** de la tienda WooCommerce de HoneyWhale. Los agentes retoman pedidos no completados, los gestionan en un pipeline Kanban y los recuperan por WhatsApp, llamadas o email.

Para el contexto completo del dominio, stack y convenciones, ver [`CLAUDE.md`](./CLAUDE.md).

## Arquitectura de red

El stack corre sobre dos redes Docker:

- **`hw_network`** (bridge interna del proyecto): conecta los servicios entre sí — `hw_api`, `hw_frontend`, `hw_mysql`, `hw_redis`, `hw_nginx`.
- **`traefik-public`** (overlay externa, compartida a nivel de servidor): solo `hw_nginx` está conectado a esta red, para ser alcanzable por `cloudflared` / otros routers del servidor.

La red `traefik-public` **no** se crea en este proyecto; se asume que ya existe en el host de producción y se declara como `external: true` en los compose.

## Desarrollo local (PC)

Levanta solo el compose base:

```bash
docker compose up -d
```

`hw_nginx` expone el puerto `${NGINX_PORT:-8021}` del host. Acceso:

- App: <http://localhost:8021>
- API (vía nginx): <http://localhost:8021/api>

> ⚠️ El puerto `8020` está ocupado por el proyecto INEIN. Usar `8021` (valor por defecto de `NGINX_PORT`).

En local, la red `traefik-public` también debe existir. Si no está creada:

```bash
docker network create traefik-public
```

## Producción (NAS / servidor)

El acceso público **no** pasa por el puerto del host. El flujo es:

```
Internet → Cloudflare → cloudflared → (red traefik-public) → hw_nginx:80 → hw_api / hw_frontend
```

Comando de despliegue:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

El override `docker-compose.prod.yml`:

- Construye `hw_api` con `target: production` y sin volúmenes de código.
- Resetea la lista de `ports` de `hw_nginx` (vía `!reset []`, Compose v2.24+), de modo que nginx queda accesible solo a través de la red `traefik-public`.
- Si en algún momento se necesita acceso LAN directo al NAS (sin pasar por Cloudflare), basta con descomentar el bloque `ports` en el archivo de producción.

La red `traefik-public` ya existe en el servidor; ambos compose la referencian con `external: true`, por lo que no se recrea ni se destruye con este stack.

## Acceso en producción

| Entorno | URL | Ruta del tráfico |
| --- | --- | --- |
| Desarrollo local (PC) | <http://localhost:8021> | host → `hw_nginx:80` |
| Producción (NAS) | <https://crm.victortoriz.cc> | Cloudflare Tunnel → red `traefik-public` → `hw_nginx:80` |

En producción no hay puerto publicado al host: `cloudflared` resuelve `hw_nginx` por DNS interno dentro de la red `traefik-public`.

## Variables de entorno

Copiar `.env.example` a `.env` y ajustar. Ver ese archivo para el listado completo (MySQL, Redis, JWT, puerto de nginx, integraciones).

## Comandos útiles

```bash
docker compose up -d                           # levantar entorno local
docker compose logs -f hw_api                  # logs del backend
docker compose exec hw_api npm run migration:run
docker compose exec hw_api npm run test
```
