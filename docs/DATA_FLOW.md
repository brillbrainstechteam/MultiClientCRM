# How data gets into the database (Prisma data flow)

Prisma is the **bridge** between the app and PostgreSQL. The app never writes raw
SQL — it calls Prisma methods, and Prisma turns them into SQL.

## The chain, end to end
```
Screen (React)  ── fetch() ──►  API route (app/api/crm/<x>/route.ts)
                                     │  prisma.<model>.create / findMany / update
                                     ▼
                                PostgreSQL  (Neon in prod, docker locally)
```

## Prisma's two jobs
1. **Structure (tables): schema + migrations.** `prisma/schema.prisma` defines the
   models. `prisma migrate` **creates/updates the tables**. Design-time.
2. **Rows (data): the Prisma Client.** At run-time, API code calls
   `prisma.<model>.create/findMany/update/delete` to read & write rows.
   `prisma generate` builds the typed client.

Migrations build the empty tables; the client fills them.

## Recipe — add a new data-backed feature
1. **Model** in `prisma/schema.prisma`.
2. `npx prisma migrate dev --name add_<thing>` (local) → creates the table.
3. `npx prisma generate` (usually automatic) → `prisma.<model>` now exists in code.
4. **API route** `app/api/crm/<thing>/route.ts` — `POST` → `prisma.<model>.create`,
   `GET` → `prisma.<model>.findMany({ where: { tenantId } })`.
5. **UI** — screen `fetch()`es that route (POST to save, GET to load).
6. (Embedded prototype) hydrate the live binding at startup so screens show real rows.
7. **Prod**: `npx prisma migrate deploy` (against Neon) once the migration is merged.

## Worked example (real) — "Add catalogue item"
- `crm/modules/catalogue-orders/screens/CommerceRealScreen.tsx` → form →
  `fetch('/api/crm/catalogue', { method:'POST', body: {...} })`.
- `app/api/crm/catalogue/route.ts` →
  `prisma.crmCatalogueItem.create({ data: { tenantId: user.tenantId, title, ... } })`.
- List reloads via `GET` → `prisma.crmCatalogueItem.findMany({ where: { tenantId } })`.

## Always applies
- **Multi-tenant:** every read/write filters/sets `tenantId` (from the session), so
  each business only sees its own data.
- **Session/auth:** routes call `getSessionUser()` first; no session → 401.
- **Migrations to prod** are serialized — one in flight at a time (see WORK_SPLIT.md).

## Handy commands
```bash
npx prisma studio     # visual browser of the DB rows (great for debugging)
npx prisma migrate dev --name <x>   # local: create+apply a migration
npx prisma migrate deploy           # apply pending migrations (reads .env DB URL)
npx prisma generate                 # rebuild the typed client
```
