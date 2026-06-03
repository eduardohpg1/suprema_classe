---
name: suprema-classe-arch
description: Core architectural decisions for the Suprema Classe dress-rental web system (greenfield monorepo)
metadata:
  type: project
---

Suprema Classe is a greenfield dress-rental management system. Architecture authored 2026-06-03.

**Stack:** npm-workspaces monorepo with `packages/{frontend,backend,shared}`. Frontend React 18 + Vite + TS. Backend Node + Express 4 + TS, feature-based modules. PostgreSQL 16 + Prisma 5. Auth via JWT + bcrypt. Uploads via multer disk storage (local, NO Cloudinary — explicit requirement). PDF generated client-side with jsPDF 4.2.1 + jspdf-autotable 5.0.8 (NOT backend PDFKit — explicit requirement).

**Why these matter (non-obvious decisions):**
- Money stored as `Int` (centavos) everywhere, never float — irreversible once data exists.
- Rental/Reservation dates use `@db.Date` (day-granularity blocking, not datetime).
- `Contract.snapshotJson` freezes client/product/values at generation time for legal immutability.
- Double-booking prevention REQUIRES `prisma.$transaction` with `isolationLevel: 'Serializable'` — check-then-insert without a transaction is a race condition. Availability `/check` endpoint is UX pre-validation only, not the guarantee.
- Recommended v1.1 hardening: PostgreSQL `EXCLUDE` constraint via btree_gist (raw SQL migration) for overlap protection at DB level — Prisma can't model this natively.

**How to apply:** When implementing rental creation, the transaction is the source of truth. When adding new money fields, use Int centavos. Preserve snapshotJson immutability. See [[suprema-classe-prisma-models]].
