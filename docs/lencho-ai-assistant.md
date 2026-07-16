# Lencho Admin AI Assistant

Phase 1 is read-only and admin-only.

## What It Can Answer

- Dashboard summary: orders, revenue, GST, products, customers, low stock.
- Orders by status.
- Orders by state from saved order addresses.
- Low stock and out-of-stock products.
- Best selling products.
- Inventory value at selling price and MRP.
- Collection product counts for woollen, jewellery, or all stores.
- Website health snapshot.

## What It Cannot Do Yet

- Delete products, collections, users, inquiries, or orders.
- Refund, cancel, ship, publish, unpublish, or edit anything.
- Export customer data.
- Run raw database queries.
- Use voice mode or wake phrase.

Those write actions should be added later behind confirmation tokens and audit logs.

## Security

- Frontend never receives `OPENAI_API_KEY`.
- `/api/admin/ai/*` uses the existing `requireAdmin` middleware.
- Every AI read query is recorded in `AdminAction` with tool name, provider, filters, and prompt length.
- Full prompt text is not stored in the audit log.

## Render Env

Add these only in Render/local `.env`, never in Git:

```env
LENCHO_AI_ENABLED=true
OPENAI_API_KEY=sk-...
OPENAI_TEXT_MODEL=gpt-4.1-mini
OPENAI_REALTIME_MODEL=gpt-realtime
```

If `OPENAI_API_KEY` is missing, the panel still works with local backend summaries.

## Next Phases

1. Push-to-talk voice with server-minted realtime ephemeral tokens.
2. Product draft assistant that prepares drafts only.
3. Finance/profit analytics after adding cost fields.
4. Confirmed write tools with one-time confirmation tokens.
