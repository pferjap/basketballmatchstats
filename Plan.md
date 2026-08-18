# 🗓️ Plan.md — Desarrollo Progresivo por Fases (HoopAnalytics)

Este documento establece la hoja de ruta detallada para la construcción del backend de la plataforma SaaS de baloncesto, desglosando cada etapa en sub-fases manejables.

## Reglas de Implementación y Criterios de Aceptación (DoD)
Para dar por concluida cada fase o sub-fase, se DEBE cumplir estrictamente lo siguiente:
1. **Compilación y Build**: El código debe compilar sin errores en TypeScript (`npm run build`).
2. **Testing**: Deben pasar todos los test unitarios y de integración de la fase (`npm run test`). Cobertura mínima esperada: 80% en lógica de negocio.
3. **Aporte de Valor Real**: La fase debe resolver un problema de negocio utilizable, no solo infraestructura vacía.
4. **YAGNI (You Aren't Gonna Need It)**: No se implementarán funcionalidades futuras antes de tiempo.
5. **No Complejidad Especulativa**: Las abstracciones deben justificarse por las necesidades actuales.
6. **Monolito Modular**: Cero microservicios. Todo reside en un único despliegue con alta cohesión interna.
7. **Revisión Arquitectónica**: Cada sub-fase finaliza con una sesión de Code Review y validación del diseño (DDD, SOLID).
8. **Desplegable**: Cada fase principal representa una *Release* potencialmente desplegable en un entorno *Staging* o *Producción*.

---

## 🏗️ Fase 1: Cimientos, Base de Datos y Entidades Centrales
**Objetivo**: Establecer el *esqueleto* del proyecto, la conexión a datos, y la jerarquía básica de entidades (Club -> Equipo -> Jugador).

### 1.1: Setup del Repositorio y Arquitectura Base
*   Inicialización del proyecto en NestJS.
*   Configuración estricta de TypeScript, ESLint, Prettier y Husky.
*   Implementación de filtros de excepciones (`HttpExceptionFilter`) e interceptores globales (`ResponseInterceptor`).
*   Configuración inicial de Docker (Dockerfile multi-stage y `docker-compose.yml` local).

### 1.2: Modelado de Datos y ORM
*   Instalación y configuración de Prisma ORM.
*   Definición del esquema base en `schema.prisma` (Tablas para Clubs, Teams, Players sin lógica compleja).
*   Ejecución de las primeras migraciones y configuración de Supabase/Postgres local.

### 1.3: Catálogo de Clubs y Equipos (DDD Base)
*   Creación de la estructura DDD (`domain`, `application`, `infrastructure`) para los módulos `Clubs` y `Teams`.
*   Implementación de DTOs con validación (`class-validator`).
*   Desarrollo de los endpoints REST básicos (`GET`, `POST`, `PUT`, `DELETE`).

### 1.4: Catálogo de Jugadores y Testing Core
*   Creación del módulo `Players` y sus relaciones con `Teams`.
*   Implementación de Unit Tests con Jest para los Casos de Uso.
*   Configuración de Testcontainers e implementación del primer E2E Test (`Supertest`) validando el flujo completo de creación.

### 1.5: Logos e Imágenes de Entidades (Clubs, Equipos, Jugadores)
**Objetivo**: Permitir que cada Club, Equipo y Jugador tenga una imagen (logo o foto) asociada, subida como parte de su gestión, con límites de peso, formato y dimensiones optimizados para consumo desde aplicaciones móviles y web.

> **Estado de partida (verificado en código)**: Las entidades `Club`, `Team` y `Player` no poseen ningún campo de imagen. No existe código de subida de archivos, procesamiento de imágenes ni configuración de Multer en el proyecto. La dependencia `@nestjs/platform-express` ya está instalada (soporte base para Multer).

**Estrategia de almacenamiento (contrato desacoplado)**
*   Definición de una interfaz de dominio `IFileStorageService` en `src/common/storage/interfaces/file-storage.interface.ts` con los métodos:
    *   `upload(file: Buffer, path: string): Promise<string>` — persiste el archivo y devuelve la URL/ruta pública.
    *   `delete(path: string): Promise<void>` — elimina un archivo previamente almacenado.
*   Implementación inicial `LocalFileStorageService` en `src/common/storage/local-file-storage.service.ts` que escribe en `uploads/` dentro del directorio de trabajo. Los archivos se sirven como estáticos vía `app.useStaticAssets()` en `main.ts`.
*   Token de DI: `FILE_STORAGE_SERVICE` (Symbol), registrado en un `StorageModule` global. La implementación es intercambiable por S3, Azure Blob o Supabase Storage en fases futuras sin tocar casos de uso ni controladores.
*   Estructura de directorios en disco: `uploads/clubs/<clubId>.<ext>`, `uploads/teams/<teamId>.<ext>`, `uploads/players/<playerId>.<ext>`. Cada entidad tiene como máximo un archivo; subir uno nuevo sobreescribe el anterior.

**Límites de subida (optimización mobile/web)**
*   **Tamaño máximo del archivo original**: 2 MB. Rechazado por Multer antes de llegar al use-case (`PayloadTooLargeException`, HTTP `413`).
*   **Formatos aceptados**: JPEG, PNG y WebP exclusivamente. Validación por MIME type real del buffer (no por extensión) usando `file-type` (npm). Cualquier otro formato → `BadRequestException` con mensaje descriptivo.
*   **Dimensiones máximas de salida**: Toda imagen se redimensiona a un máximo de **512×512 px** manteniendo la relación de aspecto (fit `inside`). Imágenes menores no se amplían.
*   **Formato de salida normalizado**: Todas las imágenes se convierten a **WebP** con calidad 80, independientemente del formato de entrada. Esto reduce el peso medio un ~30% respecto a JPEG equivalente.
*   **Procesamiento**: Se utiliza la librería `sharp` (npm). El pipeline de procesamiento (`ImageProcessingService`) reside en `src/common/storage/image-processing.service.ts`, expone un método `optimize(buffer: Buffer): Promise<Buffer>` y es inyectable con tests unitarios independientes.

**Extensión del esquema Prisma**
*   Nuevas columnas nullable en `schema.prisma`:
    *   `Club`: `logoUrl  String?`
    *   `Team`: `logoUrl  String?`
    *   `Player`: `photoUrl String?`
*   Migración de Prisma: `add-entity-images`. Las columnas son nullable para no romper datos existentes ni el flujo de creación (la imagen se sube opcionalmente tras crear la entidad).

**Extensión de las entidades de dominio**
*   `ClubProperties` y `Club`: nuevo campo `logoUrl: string | null`.
*   `TeamProperties` y `Team`: nuevo campo `logoUrl: string | null`.
*   `PlayerProperties` y `Player`: nuevo campo `photoUrl: string | null`.

**Extensión de las interfaces de repositorio**
*   `IClubRepository`: nuevo método `updateLogoUrl(id: string, logoUrl: string | null): Promise<Club>`.
*   `ITeamRepository`: nuevo método `updateLogoUrl(id: string, logoUrl: string | null): Promise<Team>`.
*   `IPlayerRepository`: nuevo método `updatePhotoUrl(id: string, photoUrl: string | null): Promise<Player>`.
*   Las implementaciones Prisma (`PrismaClubRepository`, etc.) implementan el método con un `prisma.<entity>.update({ where: { id }, data: { logoUrl } })`.

**Extensión de DTOs de respuesta**
*   `ClubResponseDto`: nuevo campo `logoUrl: string | null`.
*   `TeamResponseDto`: nuevo campo `logoUrl: string | null`.
*   `PlayerResponseDto`: nuevo campo `photoUrl: string | null`.
*   Los mappers (`ClubMapper`, `TeamMapper`, `PlayerMapper`) se actualizan para incluir el nuevo campo en `toResponse()`.
*   Los DTOs de creación (`CreateClubDto`, `CreateTeamDto`, `CreatePlayerDto`) **no cambian**: la imagen se sube en un endpoint separado tras la creación.

**Nuevos casos de uso (capa `application/use-cases`)**
*   `UploadClubLogoUseCase`: recibe `(clubId, fileBuffer)`. Verifica que el club existe (→ `ClubNotFoundException`). Invoca `ImageProcessingService.optimize()`, luego `FileStorageService.upload()`, finalmente `ClubRepository.updateLogoUrl()`. Devuelve el `Club` actualizado.
*   `DeleteClubLogoUseCase`: recibe `(clubId)`. Verifica existencia. Invoca `FileStorageService.delete()` y `ClubRepository.updateLogoUrl(id, null)`.
*   `UploadTeamLogoUseCase` / `DeleteTeamLogoUseCase`: análogos para equipos.
*   `UploadPlayerPhotoUseCase` / `DeletePlayerPhotoUseCase`: análogos para jugadores (campo `photoUrl`).

**Nuevos endpoints (capa `infrastructure/controllers`)**

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `POST` | `/clubs/:id/logo` | `SUPER_ADMIN` | Sube/reemplaza el logo del club. Body: `multipart/form-data`, campo `file`. |
| `DELETE` | `/clubs/:id/logo` | `SUPER_ADMIN` | Elimina el logo del club. |
| `POST` | `/teams/:id/logo` | `SUPER_ADMIN`, `CLUB_ADMIN` | Sube/reemplaza el logo del equipo. `@TenantCheck('team')`. |
| `DELETE` | `/teams/:id/logo` | `SUPER_ADMIN`, `CLUB_ADMIN` | Elimina el logo del equipo. `@TenantCheck('team')`. |
| `POST` | `/players/:id/photo` | `SUPER_ADMIN`, `CLUB_ADMIN`, `COACH` | Sube/reemplaza la foto del jugador. `@TenantCheck('player')`. |
| `DELETE` | `/players/:id/photo` | `SUPER_ADMIN`, `CLUB_ADMIN`, `COACH` | Elimina la foto del jugador. `@TenantCheck('player')`. |

*   Los endpoints de subida usan `@UseInterceptors(FileInterceptor('file'))` de `@nestjs/platform-express` con un `MulterOptions` que limita `fileSize: 2 * 1024 * 1024` (2 MB).
*   El decorador `@UploadedFile(new ParseFilePipe({ ... }))` valida presencia del archivo. La validación de MIME type se realiza en el use-case sobre el buffer real (no confiar en el MIME que envía el cliente).
*   Los endpoints de subida devuelven el `<Entity>ResponseDto` actualizado con la nueva URL del logo/foto.
*   Los endpoints de eliminación devuelven `{ id: string }`, coherente con el patrón de DELETE existente.

**Servicio de archivos estáticos**
*   Modificación de `src/main.ts` para registrar `app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' })`, sirviendo los archivos subidos en rutas como `/uploads/clubs/<id>.webp`.
*   La URL almacenada en BD es relativa (`/uploads/clubs/<id>.webp`), de modo que el frontend puede prefijar el host del API para construir la URL absoluta. Esto facilita la migración futura a CDN o almacenamiento en la nube (solo cambia la implementación de `IFileStorageService` y la generación de URLs).

**Configuración de `.gitignore` y Docker**
*   Añadir `uploads/` a `.gitignore` (los archivos subidos no se versionan).
*   Añadir un volumen `uploads` en `docker-compose.yml` para persistir las imágenes entre reinicios del contenedor: `volumes: ["./uploads:/app/uploads"]`.
*   Actualizar `.env.example` con `UPLOAD_MAX_SIZE_MB=2` (documentativo; el límite se aplica en código).

**Dependencias nuevas (npm)**
*   `sharp` — procesamiento y redimensionamiento de imágenes. Sin dependencias nativas problemáticas en la mayoría de plataformas.
*   `file-type` — detección de MIME type real por magic bytes del buffer, evitando confiar en la extensión o en el header `Content-Type` del cliente.

**Testing (DoD de la sub-fase)**
*   **Unit tests** de `ImageProcessingService`: verifica que un buffer PNG/JPEG de 1024×768 se convierte a WebP ≤512×512 y que el tamaño de salida es menor que el original.
*   **Unit tests** de cada use-case (`UploadClubLogoUseCase`, etc.): mock de `IFileStorageService` e `ImageProcessingService`, verificación de que se llama a `optimize()` y `upload()` en el orden correcto, y que `updateLogoUrl` recibe la URL esperada.
*   **Unit tests** de validación de formato: el use-case rechaza un buffer GIF o BMP con `BadRequestException`.
*   **Unit tests** de `DeleteClubLogoUseCase`: verifica que `FileStorageService.delete()` se invoca y el campo se pone a `null`.
*   **E2E tests** (`test/images.e2e-spec.ts`):
    *   Subida exitosa de un logo PNG al club → respuesta incluye `logoUrl` no nulo → `GET /clubs/:id` devuelve la URL → petición HTTP a la URL sirve una imagen WebP válida.
    *   Subida de archivo >2MB → `413 Payload Too Large`.
    *   Subida de archivo con formato no soportado (ej. `.txt`, `.gif`) → `400 Bad Request`.
    *   Subida de logo a equipo por `CLUB_ADMIN` del club correcto → `201`. Intento desde `CLUB_ADMIN` de otro club → `403 Forbidden`.
    *   Eliminación de logo → `logoUrl` se resetea a `null` en el GET posterior.
    *   Subida de nueva imagen sobreescribe la anterior (solo un archivo por entidad).
*   **Cobertura**: ≥80% en `ImageProcessingService`, use-cases de upload/delete y validación de formato.

**Resultado**: Clubs, equipos y jugadores pueden tener un logo o foto asociada, subida de forma segura con validación de tipo y tamaño, optimizada automáticamente a WebP 512×512 para consumo eficiente desde la app móvil. El contrato de almacenamiento (`IFileStorageService`) está preparado para migrar a almacenamiento cloud sin tocar la lógica de negocio.

---

## 🔐 Fase 2: Autenticación, Roles y Multi-tenancy
**Objetivo**: Proteger los endpoints creados en la Fase 1 y asegurar que los usuarios solo vean sus propios datos.

### 2.1: Módulo de Usuarios y Seguridad Base
*   Creación de la entidad `User` y almacenamiento seguro de contraseñas con Bcrypt.
*   Implementación de Passport.js y estrategias JWT (Access Token, Refresh Token).
*   Endpoints de registro y login (`/auth/register`, `/auth/login`).
*   **Modelo de registro**: Self-registration pública (endpoint `@Public()`) crea usuarios con rol `VIEWER` únicamente, sin asociación a ningún club (`clubId = null`). El DTO público de registro NO acepta `role` ni `clubId`.
*   **Asignación de rol y club**: Un `SUPER_ADMIN` o `CLUB_ADMIN` asigna club y eleva el rol del usuario mediante un endpoint protegido (`PATCH /users/:id/role`, `PATCH /users/:id/club`). Esto previene escalamiento de privilegios desde el registro público.

### 2.2: Control de Acceso Basado en Roles (RBAC)
*   Definición de roles (SuperAdmin, ClubAdmin, Coach, Statistician, Viewer).
*   Creación de decoradores personalizados (`@Roles()`, `@CurrentUser()`).
*   Implementación del `RolesGuard` para restringir endpoints HTTP a roles específicos.

### 2.3: Aislamiento Tenancy (El Core de la Seguridad SaaS)
*   Creación del `TenantGuard` para validar que el usuario pertenece al `clubId` del recurso que intenta modificar.
*   Refactorización de los repositorios de la Fase 1 para inyectar filtros automáticos por `tenantId`.
*   Testing de seguridad: asegurar mediante tests que un usuario del Club A recibe `403 Forbidden` al acceder al Club B.

### 2.4: Inicialización del SUPER_ADMIN (Setup Endpoint Auto-desactivable)
*   Creación del módulo `Setup` con estructura DDD (`application/use-cases`, `application/dtos`, `infrastructure/controllers`).
*   Endpoint público `POST /setup/init` que permite al administrador crear el primer usuario `SUPER_ADMIN` con sus propias credenciales (email, password, nombre).
*   **Seguridad por diseño**: El endpoint se auto-desactiva permanentemente una vez que existe un `SUPER_ADMIN` en la base de datos (retorna `409 Conflict`).
*   **Sin secretos en el repositorio ni en variables de entorno**: El administrador define sus credenciales en el momento del primer despliegue.
*   Extensión de `IUserRepository` con método `existsByRole(role)` para verificar existencia de usuarios por rol.
*   Validación fuerte del password (mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número).
*   Tras la creación, el administrador debe autenticarse vía `/auth/login` para obtener tokens JWT.

### 2.5: API de Gestión de Usuarios y Privilegios (Alineada con la App Móvil)
**Objetivo**: Publicar los endpoints del módulo `users` que la Fase 2.1 dejó especificados pero sin implementar, cerrando el bloqueo de las tareas **T-032** (bloque `features/users/`) y **T-034** del `docs/mobileapp/Plan_mobileapp.md` — Fase 9 "Registro de Usuarios y Gestión de Privilegios".

> **Estado de partida (verificado en código)**: `POST /auth/register` ya existe, es `@Public()`, acepta únicamente `email`, `password`, `firstName`, `lastName`, fuerza `role = VIEWER` y `clubId = null` en el servidor, y devuelve `AuthResponseDto` (tokens + usuario), por lo que el alta deja la sesión iniciada sin paso de aprobación. Lo que falta es el lado de administración: el módulo `users` solo tiene entidad y repositorio (`UsersModule` no expone controlador ni casos de uso).

**Modelo de privilegios (contrato de seguridad)**
*   El rol por defecto de todo usuario auto-registrado es `VIEWER`, sin club (`clubId = null`). El cliente **nunca** envía rol ni club en el registro: el `RegisterDto` no los admite y es el servidor quien los impone.
*   La elevación de privilegios se realiza exclusivamente por endpoints protegidos y auditables. Ocultar opciones por rol en la UI móvil es defensa en profundidad, no el control de acceso real.
*   Conceder `SUPER_ADMIN` queda **fuera** de esta API: el primer superadministrador se crea con `POST /setup/init` (§2.4) y el endpoint de cambio de rol rechaza `SUPER_ADMIN` como valor destino (`400 Bad Request`).

**Extensión del dominio**
*   Ampliación de `IUserRepository` con:
    *   `findAll(page, limit, filters?)` → `{ data: User[]; total: number }`, ordenado por `createdAt DESC` (altas más recientes primero), con filtro opcional `search` sobre `firstName`, `lastName` y `email` (case-insensitive), y filtro opcional por `clubId`.
    *   `updateRole(userId, role)` y `updateClub(userId, clubId | null)`.
*   Nuevo índice en `users(createdAt)` en `schema.prisma` para sostener el orden de la lista paginada.
*   Casos de uso en `application/use-cases`: `ListUsersUseCase`, `GetUserUseCase`, `UpdateUserRoleUseCase`, `UpdateUserClubUseCase`.

**Endpoints (contrato acordado con T-032)**
*   `GET /users?page=&limit=&search=` — Lista paginada con el wrapper estándar `PaginatedResult`, más recientes primero. Restringido a `SUPER_ADMIN` (lista global) y `CLUB_ADMIN` (restringido a los usuarios de su propio club vía `TenantGuard`).
*   `GET /users/:id` — Detalle de un usuario. Mismas restricciones de rol y tenancy.
*   `PATCH /users/:id/role` — Body `{ "role": "STATISTICIAN" }`. Restringido a `SUPER_ADMIN` y `CLUB_ADMIN`; un `CLUB_ADMIN` solo puede actuar sobre usuarios de su club y no puede otorgar un rol superior al suyo.
*   `PATCH /users/:id/club` — Body `{ "clubId": "…" }` (acepta `null` para desasociar). Restringido a `SUPER_ADMIN`, ya que mueve usuarios entre tenants. Necesario porque el registro deja `clubId = null` y roles como `STATISTICIAN` o `COACH` carecen de sentido sin club.

**DTOs de salida**
*   `UserResponseDto` expone `id`, `email`, `firstName`, `lastName`, `role`, `clubId`, `clubName`, `createdAt`. **Nunca** serializa `passwordHash` ni `refreshToken` (uso de `@Exclude`/`@Expose` de `class-transformer`).
*   La inclusión de `createdAt` y `clubName` es un requisito explícito de la pantalla de T-034 ("Registrado hace 3 días", chip de club o "Sin club").
*   Todos los campos documentados con `@ApiProperty()`.

**Reglas de negocio y validación**
*   `UpdateUserRoleDto` valida contra el enum `UserRole` con `@IsEnum`, excluyendo `SUPER_ADMIN`.
*   Un usuario no puede modificar su propio rol (`403 Forbidden`), evitando auto-escalado incluso siendo `CLUB_ADMIN`.
*   `UpdateUserClubDto` valida que el `clubId` exista antes de asignarlo (`404 Not Found` en caso contrario).
*   Usuario inexistente → `UserNotFoundException` mapeada a `404 Not Found`.

**Testing (DoD de la sub-fase)**
*   Unit tests de los cuatro casos de uso, cubriendo las reglas de rechazo (auto-modificación, intento de otorgar `SUPER_ADMIN`, club inexistente).
*   E2E (`test/users.e2e-spec.ts`) que cubre el flujo completo: registro público → el usuario nace `VIEWER` sin club → un `SUPER_ADMIN` lo lista, le asigna club y eleva su rol → el usuario obtiene tokens nuevos con el rol actualizado en el siguiente login.
*   Test de seguridad: un `VIEWER` y un `COACH` reciben `403 Forbidden` en los cuatro endpoints; un `CLUB_ADMIN` del Club A recibe `403` al operar sobre un usuario del Club B.

**Resultado**: La app móvil desbloquea el bloque `features/users/` de T-032 y la pantalla "Usuarios registrados" de T-034; el superadministrador puede ver las altas recientes, asignar club y elevar el rol de un usuario registrado.

---

## 🏀 Fase 3: Motor de Partidos y Eventos (El Core)
**Objetivo**: Implementar el corazón de la aplicación: la creación de partidos y el registro inmutable de eventos.

### 3.1: Ciclo de Vida del Partido (`Matches`)
*   Modelado de la entidad `Match` con estados (`SCHEDULED`, `ONGOING`, `FINISHED`).
*   Endpoints para programar partidos, asignar equipos (`homeTeamId`, `awayTeamId`) y arrancar el reloj del partido.

### 3.2: Modelo de Dominio de Eventos (Event Sourcing)
*   Creación de la entidad `Event` y el enum de `EventType` (Puntos, Faltas, Rebotes).
*   Definición del esquema `metadata: JSONB` para relaciones complejas (ej. taponador y jugador taponado).
*   Casos de uso para validar lógicamente un evento antes de persistirlo (ej. ¿Puede pitarse una falta si el partido está en estado SCHEDULED?).

### 3.3: API de Anotación de Alta Velocidad
*   Desarrollo del endpoint `POST /matches/:id/events`.
*   Optimización de la escritura en PostgreSQL mediante Prisma para asegurar tiempos de respuesta `< 100ms`.
*   Endpoints de corrección/anulación (Soft-delete/compensación de eventos erróneos).

---

## ⚡ Fase 4: Sincronización en Tiempo Real (WebSockets)
**Objetivo**: Propagar los eventos de la Fase 3 a múltiples dispositivos con baja latencia.

### 4.1: Infraestructura de Gateways WS
*   Instalación de `@nestjs/platform-socket.io` y configuración del `WebSocketGateway`.
*   Implementación de un middleware o guard para extraer y validar el JWT del handshake de conexión.

### 4.2: Aislamiento por Salas (`Rooms`)
*   Implementación de eventos `joinMatch` y `leaveMatch` desde el cliente.
*   Lógica en el servidor para asignar cada conexión a la sala `match:{id}` correspondiente.

### 4.3: Arquitectura Orientada a Eventos Internos
*   Implementación del módulo `EventEmitter2` nativo de NestJS.
*   Modificación del Caso de Uso de creación de eventos (Fase 3) para disparar un evento interno una vez la transacción en BD es exitosa.
*   El Gateway WS escucha el evento interno y emite el payload `event.created` a la sala específica.
*   Pruebas de carga e integración de latencia.

---

## 📊 Fase 5: Agregación de Estadísticas y Rendimiento
**Objetivo**: Proveer resúmenes estadísticos en tiempo real y post-partido sin saturar la base de datos de eventos, siguiendo la estrategia en dos niveles definida en la arquitectura: **Nivel 1 (Box Score en vivo, Read Model atómico)** y **Nivel 2 (Histórico e integración BI/IA)**.

> **Principio rector**: Está **prohibido** recalcular desde cero con `COUNT(*)` o `SUM()` sobre la tabla `events` en cada petición HTTP. El objetivo de `GET /matches/:id/statistics` es responder en `< 100ms`, lo que exige un Read Model precomputado.

---

### 5.1: Motor de Box Score en Vivo (Nivel 1 — Read Model Atómico)

**Entidad proyectada `MatchScore` / `PlayerMatchStats`**
*   Creación de la tabla `MatchScore` en Prisma: columnas `matchId`, `homeTeamScore`, `awayTeamScore`, `currentPeriod`, `remainingTime`. Actúa como caché estructurado de la situación actual del partido.
*   Creación de la sub-tabla relacionada `PlayerMatchStats`: estadísticas acumuladas por jugador en ese partido (`points`, `fieldGoalsMade`, `fieldGoalsAttempted`, `threesMade`, `threesAttempted`, `freeThrowsMade`, `freeThrowsAttempted`, `offensiveRebounds`, `defensiveRebounds`, `assists`, `steals`, `blocks`, `turnovers`, `personalFouls`).
*   Migración que inicializa una fila en `MatchScore` y una fila en `PlayerMatchStats` por cada jugador activo cuando el partido pasa a estado `ONGOING`.
*   Los porcentajes derivados (`FG%`, `3P%`, `FT%`, `eFG%`, `TS%`) **no se almacenan**: se calculan en el mapper de salida a partir de los contadores crudos, evitando inconsistencias.

**Actualización atómica vía Event-Driven Listener**
*   Implementación de un `MatchStatsListener` anotado con `@OnEvent('match.event.created')`, en el módulo `statistics`, que se dispara tras la transacción persistida en la Fase 3.
*   El listener ejecuta un `UPDATE` atómico en PostgreSQL contra `MatchScore` y `PlayerMatchStats`:
    ```sql
    -- Ejemplo conceptual para un triple anotado
    UPDATE MatchScore SET homeTeamScore = homeTeamScore + 3 WHERE matchId = :id;
    UPDATE PlayerMatchStats
      SET points = points + 3,
          threesMade = threesMade + 1,
          threesAttempted = threesAttempted + 1
    WHERE matchId = :id AND playerId = :playerId;
    ```
*   La lógica de mapeo `EventType → campo(s) afectados` reside en un `BoxScoreMapper` en la capa de dominio, sin dependencias de NestJS, cubierto por tests unitarios exhaustivos (incluyendo todos los tipos del enum `EventType`).
*   Los eventos de **corrección/anulación** (Fase 3.3) disparan un decremento inverso idéntico con los mismos campos, garantizando coherencia sin recalcular desde cero.

**Endpoint de recuperación**
*   Endpoint interno `POST /matches/:id/stats/recalculate` protegido con rol `SUPER_ADMIN`. Recalcula `MatchScore` y `PlayerMatchStats` desde cero iterando sobre todos los `events` del partido. Solo se usa como mecanismo de recuperación ante fallos del listener.

---

### 5.2: API de Agregación y Lectura

**Endpoints**
*   `GET /matches/:id/stats` — Lee directamente de `MatchScore` (1 fila) + `PlayerMatchStats` (12–24 filas). No agrega sobre `events`. Respuesta esperada `< 50ms`.
*   `GET /matches/:id/stats/players/:playerId` — Estadísticas individuales de un jugador en el partido.
*   `GET /players/:id/season-stats` — Agrega dinámicamente via `GROUP BY` en Prisma raw query sobre `PlayerMatchStats` para todos los partidos de una temporada.
*   `GET /teams/:id/season-stats` — Promedios y totales de la temporada por equipo.

**Estructura de DTOs de salida**
*   `MatchBoxScoreDto`: contiene `matchInfo`, `homeTeam: TeamBoxScoreDto`, `awayTeam: TeamBoxScoreDto`.
*   `TeamBoxScoreDto`: `teamTotals: TeamStatsDto`, `players: PlayerBoxScoreDto[]`.
*   `PlayerBoxScoreDto`: todos los contadores crudos de `PlayerMatchStats` más los porcentajes calculados en el mapper (`FG%`, `3P%`, `FT%`, `eFG%`, `TS%`).
*   Uso de `plainToInstance` + `@Exclude`/`@Expose` de `class-transformer` para controlar exactamente los campos serializados.
*   Todos los campos documentados con `@ApiProperty()` de `@nestjs/swagger`.

**Estrategia de caché**
*   Partidos `FINISHED`: la respuesta de `GET /matches/:id/stats` se cachea en memoria (singleton `StatsCache`) con una interfaz definida en dominio, ya que los datos son inmutables al cierre del partido.
*   Partidos `ONGOING`: sin caché adicional; la lectura directa de `MatchScore` / `PlayerMatchStats` es suficientemente rápida al ser consultas por clave primaria.
*   El contrato de `StatsCache` (interfaz de dominio) permite sustituir la implementación en memoria por Redis en fases futuras sin tocar los casos de uso.

**Autorización y tenancy**
*   Todos los endpoints de lectura respetan el `TenantGuard`: solo se puede consultar estadísticas de partidos del propio club del usuario autenticado.

---

### 5.3: Preparación para BI e IA — Nivel 2 (Histórico Post-partido)

> El Nivel 1 cubre el "aquí y ahora". Este nivel atiende consultas históricas complejas: *"Porcentaje de acierto en triples del Jugador X en toda la temporada"*. Aquí opera la tabla `events` como **Fuente Única de Verdad**.

**Optimización de índices en PostgreSQL**
*   Índice compuesto `(matchId, playerId, eventType)` en `events` — cubre las consultas de agregación histórica y el endpoint de recálculo.
*   Índice compuesto `(matchId, playerId)` en `PlayerMatchStats` — cubre lecturas de box score.
*   Índice en `(clubId, scheduledAt)` sobre `matches` — cubre paginación eficiente del historial de temporada.
*   Todas las migraciones de índices son no bloqueantes (`CREATE INDEX CONCURRENTLY`), documentadas en los archivos de migración de Prisma.

**Endpoint de exportación analítica**
*   `GET /clubs/:id/export/season` — Genera un snapshot JSON estructurado (o CSV vía cabecera `Accept: text/csv`) con todos los partidos, eventos y estadísticas de la temporada activa.
*   Soporta filtros por rango de fechas (`from`, `to`) y tipo de evento. Respuesta paginada.
*   Accesible únicamente para roles `CLUB_ADMIN` y `SUPER_ADMIN`.

**Preparación del esquema para Vistas Materializadas y BI**
*   Revisión del campo `metadata: JSONB` de `events` para extraer los campos más consultados (`shotZone`, `assistedBy`, `blockedBy`) como columnas generadas en PostgreSQL, sin romper el contrato JSONB existente.
*   Diseño (sin implementación completa en esta fase) de Vistas Materializadas en PostgreSQL que pre-agreguen estadísticas por jugador/temporada, actualizables bajo demanda tras finalizar un partido.
*   Documentación del contrato de datos (campos, tipos, nullable) como referencia para futuros pipelines de exportación a Power BI, Pandas o modelos de IA.

**Tests de carga y regresión de rendimiento**
*   Script de seed masivo: 50 clubes, 200 equipos, 2 000 jugadores, 5 000 partidos, ~500 000 eventos en la BD de test.
*   Benchmarks con `supertest` midiendo percentil p95 de latencia:
    *   `POST /matches/:id/events` + actualización atómica de stats: objetivo `< 100ms`.
    *   `GET /matches/:id/stats` (lectura Read Model): objetivo `< 50ms`.
*   Los benchmarks se integran en la pipeline CI: si algún percentil supera el umbral, el build falla.

---

## 🧪 Mantenimiento: Aislamiento de la Base de Datos en Tests E2E (Testcontainers)
**Objetivo**: Impedir que la ejecución de los tests E2E contamine la base de datos de desarrollo local (`basketball`), evitando que usuarios `SUPER_ADMIN` residuales bloqueen el flujo de inicialización (`POST /setup/init`).

### Contexto del problema
*   Los specs E2E importan el `AppModule` real, por lo que Prisma se conectaba a la `DATABASE_URL` del `.env` (base de datos de desarrollo `basketball`).
*   Aunque `Testcontainers` figuraba como dependencia, **nunca estuvo cableado**: los tests corrían contra la BD de desarrollo.
*   Los specs (`rbac`, `tenant-isolation`, `matches`, `club-team-player`) crean usuarios `SUPER_ADMIN` en `beforeAll` y solo limpian en `afterAll` mediante una lista fija de emails. Cualquier ejecución interrumpida dejaba usuarios `SUPER_ADMIN` huérfanos.
*   El caso de uso `InitSetupUseCase` invoca `existsByRole(SUPER_ADMIN)` y devuelve `409 Conflict` si existe alguno, bloqueando el setup inicial.

### Limpieza puntual (una sola vez)
*   Eliminación de los usuarios de test residuales (`@test.com`) de la BD local `basketball`, dejando la tabla `users` en 0 filas para desbloquear `POST /setup/init`. Se verificó previamente que ninguna tabla referencia a `users` por FK.

### Aislamiento con Testcontainers (solución permanente)
*   **`test/setup/global-setup.ts`** (`globalSetup` de Jest): levanta un contenedor efímero `postgres:16-alpine` con base de datos `basketball_test`, aplica las migraciones con `prisma migrate deploy` y persiste la URL de conexión.
*   **`test/setup/use-test-db.ts`** (`setupFiles` de Jest): se ejecuta en cada worker antes de importar `AppModule` e inyecta la `DATABASE_URL` efímera en `process.env`.
*   **`test/setup/assert-not-dev-db.ts`**: guarda de seguridad que aborta la ejecución si la `DATABASE_URL` sigue apuntando a la BD de desarrollo `basketball`, fallando rápido en lugar de contaminar datos locales.
*   **`test/setup/global-teardown.ts`** (`globalTeardown` de Jest): detiene el contenedor y elimina el fichero temporal con la URL.
*   **`test/jest-e2e.json`**: registra `globalSetup`, `globalTeardown` y `setupFiles`.

### Criterios de Aceptación (DoD)
*   `npm run test:e2e` levanta el contenedor, aplica migraciones y **pasa las 8 suites / 90 tests**.
*   Tras la ejecución, la BD de desarrollo `basketball` permanece intacta (0 usuarios), el contenedor se destruye y el fichero temporal se elimina.
*   `POST /setup/init` vuelve a funcionar contra la BD local limpia.
*   **Requisito**: Docker debe estar disponible en el entorno de desarrollo y en CI (Testcontainers ya era dependencia del proyecto).

