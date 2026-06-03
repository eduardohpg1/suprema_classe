---
name: suprema-classe-backend
description: Implemented backend stack/decisions for Suprema Classe, and where it diverges from the architect's original design
metadata:
  type: project
---

Backend implementado em `backend/` (standalone, NAO no monorepo `packages/backend` que o architect previu). Node + Express 4 + TS + Prisma 5 + PostgreSQL. Auth JWT + bcrypt. Upload via multer disk storage em `uploads/`. Build via tsc para `dist/`. Sem script de lint (apenas tsc/build como gates). API montada em `/api`, estaticos em `/uploads`.

**Divergencias deliberadas do design do architect (a missao deu schema "exato" que prevaleceu):**
- Dinheiro como `Decimal(10,2)` no schema entregue, NAO Int centavos como o architect recomendou. Conflito real — schema da missao venceu por ser explicito.
- Datas de Rental/Reservation sao `DateTime`, nao `@db.Date`.
- Enums simplificados: RentalStatus = ACTIVE/RETURNED/OVERDUE/CANCELLED (sem PENDING/CONFIRMED/PICKED_UP); ProductStatus = AVAILABLE/RESERVED/RENTED/MAINTENANCE; ReservationStatus = PENDING/CONFIRMED/CANCELLED.
- Reservation aqui e por dia unico (`date`), nao intervalo com `expiresAt`.
- Contract simplificado (so `pdfPath`/`generatedAt`), sem snapshotJson nem contractNumber. PDF era pra ser client-side (jsPDF) — backend so guarda pdfPath.
- Model `User` foi ADICIONADO (a missao nao listou no schema mas exigiu rotas de auth). Minimo: email/password/role.

**Decisao do architect que FOI preservada (correctness):** criacao/update de Rental usa `prisma.$transaction` com `isolationLevel: Serializable` + checagem de overlap dentro da tx (previne double-booking). `availability.ts` tem `checkProductAvailability` + `BLOCKING_RENTAL_STATUSES = [ACTIVE, OVERDUE]`. O endpoint `/availability/check` e so pre-validacao de UX, nao garantia.

**Gotcha Prisma:** enums sao exportados direto de `@prisma/client` (ex.: `RentalStatus.ACTIVE`), NAO via namespace `Prisma.RentalStatus`. `Prisma.TransactionClient`, `Prisma.Decimal`, `Prisma.TransactionIsolationLevel` continuam no namespace.

**How to apply:** Ao estender o backend, use Decimal para dinheiro (consistencia com o schema atual). Preserve a transacao Serializable em qualquer operacao que reserve datas. Se o cliente pedir o design rico do architect (Int centavos, reserva com intervalo), e uma migracao/decisao, nao um bug. See [[suprema-classe-arch]], [[suprema-classe-prisma-models]].
