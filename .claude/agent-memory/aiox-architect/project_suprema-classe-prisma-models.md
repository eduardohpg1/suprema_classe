---
name: suprema-classe-prisma-models
description: Prisma data model inventory for Suprema Classe and key relation/cascade decisions
metadata:
  type: project
---

Suprema Classe Prisma models (schema at `packages/backend/prisma/schema.prisma`).

**Models:** User, Category, Product, Photo, Customer, Rental, Reservation, Contract.
**Enums:** UserRole, ProductStatus (AVAILABLE/RENTED/MAINTENANCE/RETIRED), RentalStatus (PENDING/CONFIRMED/PICKED_UP/RETURNED/CANCELLED/OVERDUE), ReservationStatus (HELD/CONVERTED/EXPIRED/CANCELLED), ContractStatus (DRAFT/GENERATED/SIGNED/ARCHIVED).

**Key relation/cascade decisions (non-obvious):**
- IDs are `cuid()` (not UUID/autoincrement) — ordered, no count leakage. Human-facing numbers via separate `@unique @default(autoincrement())` fields: Rental.rentalNumber, Contract.contractNumber.
- `onDelete: Restrict` on Product/Customer inside Rental/Reservation — protects historical integrity (can't delete entities with rentals).
- `onDelete: Cascade` on Photo and Contract — they depend on their parent.
- Reservation is SEPARATE from Rental: temporary HELD state with `expiresAt` (frees the date if not converted). Supports Airbnb-style date hold before closing a rental.
- Critical composite indexes for conflict checks: `[productId, startDate, endDate]` on both Rental and Reservation.
- Active-blocking rental statuses for overlap queries: CONFIRMED, PICKED_UP, OVERDUE.

**How to apply:** When querying availability, filter rentals by those 3 active statuses + non-expired HELD reservations. See [[suprema-classe-arch]].
