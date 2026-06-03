---
name: suprema-classe-frontend
description: Implemented frontend stack/structure for Suprema Classe and the backend API contract it expects
metadata:
  type: project
---

Frontend implemented in `frontend/` (standalone, mirrors backend's standalone layout — NOT the monorepo `packages/frontend` the architect planned). React 18 + Vite 5 + TS + Tailwind + react-query v3 + react-hook-form + zod + react-router v6. Build gate is `npm run build` (tsc + vite); no lint script. Verified: tsc clean, vite build succeeds (2792 modules).

**API contract the frontend assumes (backend must fulfill these — only utils existed at build time, no routes yet):**
- Base `/api`, static images `/uploads` (Vite proxies both to localhost:3001).
- Paginated endpoints return `{ data, pagination: { page, pageSize, total, totalPages, hasNext, hasPrev } }` — `client.ts` `normalizePaginated()` maps it to the frontend `PaginatedResponse`.
- Endpoints used: `/products` (+ `/:id`, `/:id/photos`, `/:id/availability`, `/:id/availability/check`), `/categories`, `/customers`, `/rentals` (+ `/:id/return`, `/:id/cancel` as PATCH), `/dashboard`, `/reports/{rentals,top-products,monthly-revenue}`, `/search`, `/auth/{login,me}`.
- Money treated as reais (Decimal), matching backend — `formatCurrency` does NOT divide by 100. Consistent with [[suprema-classe-backend]].

**Non-obvious decisions:**
- `useAuth` returns a default ADMIN user when no JWT/`/auth/me` is unavailable, so the UI loads before auth backend exists. Remove the fallback once auth is enforced.
- Contract PDF is generated 100% client-side in `components/ContractPDF.ts` (jsPDF + autotable) with the exact 10 legal clauses + Caçapava/SP foro; auto-downloads. Backend only stores pdfPath.
- `ProductCalendar` is the critical component: month grid, green/yellow/red day status from `/availability`, prev/next nav, hover tooltip, loading skeleton.
- Reports export to PDF (jsPDF) and CSV-for-Excel (BOM + `;` separator for pt-BR Excel).

**Environment gotcha:** see [[suprema-classe-onedrive-npm]] — builds fail on corrupted packages until a clean reinstall.
