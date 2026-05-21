# Tiendanube CSV Import — Design Spec
**Date:** 2026-05-21  
**Status:** Approved

## Problem
The admin panel already has a CSV import UI and backend routes, but the parser is broken for Tiendanube/Nuvemshop exports:
1. Parser uses comma as delimiter; Tiendanube CSV uses semicolons
2. Parser treats each CSV row as a separate product; Tiendanube groups variants (color/size) as multiple rows under the same `Identificador URL`
3. Tiendanube CSV has no image column; parser requires an image to mark a product valid

## Solution

### 1. Parser fix — `backend/src/services/nuvemshop-import.js`

**Delimiter detection:** Inspect the first line of the CSV; count `;` vs `,` occurrences and pick the dominant one.

**Variant grouping:** After parsing all rows, group them by `Identificador URL`. Each group = one product. First row in the group holds name, brand, description, price. All rows contribute to the sizes and colors aggregation.

**Variant aggregation logic:**
- Iterate over `Nome da variação N` columns (1, 2, 3)
- If the header value is `Tamanho` (case-insensitive, normalized), collect `Valor da variação N` from every row as a size
- If the header value is `Cor`, collect `Valor da variação N` from every row as a color
- Deduplicate within each group

**Image validation:** Downgraded from a blocking error to a `importNotes.imageWarning = true` flag. Products without images enter as inactive (`active: false`).

### 2. Image enrichment — `backend/src/services/nuvemshop-import.js`

New exported function `enrichWithStoreImages(products, storeBaseUrl)`:
- Accepts an array of parsed products and the source store URL (e.g. `https://velkor7.lojavirtualnuvem.com.br`)
- Fetches `{storeBaseUrl}/produtos/{product.slug}/` for each product missing an image
- Extracts the first `<meta property="og:image" content="...">` value from the HTML response
- Concurrency: max 5 parallel fetches (Promise pool)
- Per-request timeout: 3 seconds (AbortController)
- Failures are silent: product keeps `image: ''` and `imageWarning: true`

### 3. API endpoint update — `backend/src/routes/admin.js`

`POST /api/admin/products/import/preview`:
- Reads optional `sourceStoreUrl` string from payload
- After calling `parseNuvemshopProductCsv`, if `sourceStoreUrl` is provided, calls `enrichWithStoreImages`
- Returns enriched preview

`POST /api/admin/products/import` (commit):
- Same change: optional `sourceStoreUrl`, enrich before persisting

### 4. Frontend update — `frontend/src/app/admin/AdminPageClient.tsx`

In the import block (products section):
- Add text input "URL da loja de origem (opcional)" below the CSV file picker
- Store in `productImportStoreUrl` state
- Pass as `sourceStoreUrl` in `previewAdminProductImport` and `importAdminProducts` calls
- Show image thumbnail (`<img>`) in the preview row for products that have an image

### Frontend API service — `frontend/src/services/adminApi.ts`
- Update `previewAdminProductImport` and `importAdminProducts` to accept optional `sourceStoreUrl`

## Constraints
- Max 50 products per import batch (existing limit retained)
- Products always enter as `active: false` on import
- Scraping is best-effort: a blocked or missing page leaves the product without an image
- No credentials required: scraping public Tiendanube store pages only

## Files Changed
- `backend/src/services/nuvemshop-import.js` — parser rewrite + image enrichment
- `backend/src/routes/admin.js` — pass sourceStoreUrl through preview and commit
- `frontend/src/services/adminApi.ts` — extend payload types
- `frontend/src/app/admin/AdminPageClient.tsx` — URL input + image thumbnails in preview
