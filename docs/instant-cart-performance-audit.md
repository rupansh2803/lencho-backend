# Lencho Instant Cart Performance Audit

Date: 2026-07-17
Branch: feature/instant-cart-and-combo-builder

## Current Cart Architecture

- Frontend is static JavaScript in `public/js/app.js` and `public/js/pages.js`.
- Guest cart uses `localStorage` key `lencho_cart_local_v1`.
- Logged-in cart syncs through `/api/cart`, `/api/cart/add`, `/api/cart/update`, and `/api/cart/:productId`.
- Cart badge is updated by `updateCartCount()`.
- Cart page rendering is handled by `renderCart()`.
- Backend cart data is stored in MongoDB `Cart` with `userId` and `items[]`.

## Root Causes Found

| Action | Observed From Code | Root Cause | Fix Applied |
| --- | --- | --- | --- |
| Add to Cart | UI waited for `/api/products/:id` before changing cart | Stock check happened before visual feedback | Product snapshots are cached from cards/detail pages, so known valid products update immediately and backend sync follows |
| Rapid Add to Cart | Same product could be clicked repeatedly while request was pending | No per-product pending guard | Added per-product/variant pending guard and button state |
| Quantity + / - | UI updated, but each click sent a separate API request | No debounce or stale-response guard | Added per-line debounce, versioning, and latest-response-wins |
| Quantity 1 to 0 | User had to pass a confirmation prompt | Modal blocked instant removal | Zero quantity removes visible line immediately |
| Cart fetch | MongoDB branch queried product once per cart line | N+1 product queries | `/api/cart` now fetches all needed products in one query |
| Cart response size | Product payload could include more fields than the cart needs | Heavy cart JSON | Cart product payload is now lightweight |

## API And MongoDB Notes

- MongoDB connection is reused by Mongoose; no per-request connection creation was found.
- Cart has unique `userId`; added an item lookup index for `userId + items.productId + items.variantId`.
- `/api/cart` DB path now uses one `$in` product query with selected fields.
- Cart mutations still validate product existence, variant, status, and stock on the backend.

## Timing Evidence

Local live timing could not be completed in this workspace because no `.env`/MongoDB connection file is present. The server requires MongoDB Atlas and blocks JSON fallback when `MONGODB_URI` is missing.

Validated locally:

- JavaScript syntax checks.
- Server syntax checks.
- Code-path audit for cart operations.
- Diff/whitespace check.
- Existing QA script was run and correctly failed because this workspace has no `.env`, no `MONGODB_URI`, and no `QA_ADMIN_TOKEN`/`QA_ADMIN_COOKIE`.

Blocked locally:

- Live backend health check.
- Direct MongoDB record verification.
- Browser add-to-cart timing against real product data.

Expected UX improvement:

- Button state changes immediately after click.
- Cart badge updates immediately.
- Quantity updates render immediately.
- Rapid quantity clicks send one final debounced update instead of one request per click.
- `/api/cart` warm response should improve because product lookup count is reduced from N cart-line queries to one query.

## Combo Product Support

Existing combo/bundle support was not found in the current codebase. Fixed Combo Product Builder should be implemented only after this instant cart flow is verified on staging/prod with real MongoDB.

Recommended next combo phase:

1. Add `ComboProduct` schema.
2. Add admin fixed-combo create/edit/list APIs.
3. Add admin UI section.
4. Add combo stock calculation from component stock.
5. Add combo cart line and order snapshot support.
6. Test with draft QA combo before publishing.

## Rollback

Rollback by reverting the commit that contains this file and the cart performance changes.
