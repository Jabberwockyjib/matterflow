# Square Payment Integration Guide

Complete Square integration for payment processing and invoice management in MatterFlow.

## Overview

The Square integration provides:

1. **Automatic Invoice Sync** - Invoices created in MatterFlow automatically sync to Square
2. **Payment Links** - Clients receive Square-hosted payment links
3. **Payment Status Sync** - Webhook updates invoice status when payments are made
4. **No Duplicate Invoicing** - Single source of truth in MatterFlow

## How It Works

```
Lawyer creates invoice in MatterFlow
  ↓
Marks invoice as "sent"
  ↓
MatterFlow syncs to Square API
  ↓
Square generates payment link
  ↓
Client receives email with payment link
  ↓
Client pays via Square
  ↓
Square webhook notifies MatterFlow
  ↓
Invoice status updated to "paid"
```

## Quick Start

### 1. Create Square Account

1. Go to [squareup.com](https://squareup.com)
2. Sign up for a Square account
3. Complete business verification

**Cost**: Free to sign up. Square charges 2.9% + $0.30 per transaction.

### 2. Get API Credentials

#### Production Credentials

1. Log into [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Click **"+ Create App"**
3. **App Name**: "MatterFlow"
4. Click **"Save"**
5. Go to **"Credentials"** tab
6. Copy:
   - **Production Access Token** (starts with `EAAA...`)
   - **Production Application ID** (for webhook signature)
7. Go to **"Locations"** tab
8. Copy your **Location ID** (starts with `L...`)

#### Sandbox Credentials (for testing)

1. In the same app, go to **"Credentials"** tab
2. Toggle to **"Sandbox"**
3. Copy:
   - **Sandbox Access Token**
   - **Sandbox Application ID**
4. Use the same location ID (works in both environments)

### 3. Configure Environment Variables

Add to `.env.local`:

```bash
# Square Payment Processing
SQUARE_ACCESS_TOKEN=your-access-token-here
SQUARE_ENVIRONMENT=sandbox  # Change to "production" for live payments
SQUARE_LOCATION_ID=your-location-id-here
SQUARE_WEBHOOK_SIGNATURE_KEY=your-webhook-signature-key-here
```

**Environment Options**:
- `sandbox` - Test mode, no real charges (default)
- `production` - Live payments

### 4. Set Up Webhook

Square needs to notify MatterFlow when payments are made.

1. In Square Developer Dashboard, go to **"Webhooks"** tab
2. Click **"+ Add Endpoint"**
3. **Webhook URL**:
   - Development: `https://your-ngrok-url.ngrok.io/api/webhooks/square`
   - Production: `https://yourapp.com/api/webhooks/square`
4. **API Version**: Select latest (e.g., `2024-12-18`)
5. **Event Types**: Select:
   - `invoice.published`
   - `invoice.paid`
   - `invoice.payment_made`
   - `invoice.canceled`
   - `invoice.updated`
6. Click **"Save"**
7. Copy the **Signature Key** shown
8. Add it to `.env.local` as `SQUARE_WEBHOOK_SIGNATURE_KEY`

**Note**: For local development, use [ngrok](https://ngrok.com) to expose your local server to Square.

### 5. Test the Integration

1. Start your dev server: `pnpm dev`
2. Create a test matter with a client
3. Create an invoice
4. Mark invoice as "sent"
5. Check that:
   - Square invoice appears in [Square Dashboard](https://squareup.com/dashboard/invoices)
   - Client receives email with payment link
   - Payment link works in browser
6. Make a test payment (use Square's test card: `4111 1111 1111 1111`)
7. Verify invoice status updates to "paid" in MatterFlow

## Using the Integration

### Create and Send Invoice

Invoices are created and managed entirely in MatterFlow. Square syncing happens automatically.

**In the UI**:
1. Navigate to **Billing** → **Create Invoice**
2. Select matter and add line items
3. Set due date (optional)
4. Click **"Create Invoice"**
5. Change status to **"sent"**
6. Invoice automatically syncs to Square
7. Client receives email with payment link

**Programmatically**:
```typescript
import { createInvoice, updateInvoiceStatus } from "@/lib/data/actions";

// Create invoice
const formData = new FormData();
formData.append("matterId", "matter-id");
formData.append("amount", "1800"); // $1800
formData.append("status", "draft");
await createInvoice(formData);

// Send invoice (triggers Square sync)
const statusData = new FormData();
statusData.append("id", "invoice-id");
statusData.append("status", "sent");
await updateInvoiceStatus(statusData);
```

### Get Payment Link

Payment links are included in invoice emails automatically. To get a link programmatically:

```typescript
import { getSquarePaymentUrl } from "@/lib/square";

const result = await getSquarePaymentUrl("invoice-id");

if (result.ok) {
  console.log("Payment URL:", result.data.paymentUrl);
  console.log("Status:", result.data.status);
}
```

### Check Configuration

Verify Square is properly configured:

```typescript
import { checkSquareConfiguration } from "@/lib/square";

const result = await checkSquareConfiguration();

if (result.ok) {
  console.log("Square is configured!");
} else {
  console.error("Square not configured:", result.error);
}
```

## Architecture

### File Structure

```
src/lib/square/
├── client.ts          # Square SDK client and configuration
├── types.ts           # TypeScript interfaces
├── invoices.ts        # Core invoice operations (create, get, cancel)
├── actions.ts         # Server actions with Supabase integration
└── index.ts           # Public exports

src/app/api/webhooks/square/
└── route.ts           # Webhook endpoint for payment status updates

src/lib/data/
└── actions.ts         # Updated to integrate Square sync
```

### Data Flow

#### Invoice Creation Flow

```
MatterFlow Invoice Created
  ↓
updateInvoiceStatus("sent") called
  ↓
syncInvoiceToSquare() action
  ↓
Fetch invoice + matter + client data from Supabase
  ↓
createSquareInvoice() with Square SDK
  ↓
Square API creates invoice
  ↓
Square returns invoice ID + payment URL
  ↓
Update Supabase with square_invoice_id
  ↓
Send email to client with payment link
  ↓
Revalidate UI paths
```

#### Payment Status Flow

```
Client pays invoice in Square
  ↓
Square sends webhook to /api/webhooks/square
  ↓
Verify webhook signature (HMAC SHA-256)
  ↓
Parse webhook payload
  ↓
Extract invoice ID and event type
  ↓
syncSquarePaymentStatus() action
  ↓
getSquareInvoice() to fetch current status
  ↓
Map Square status to MatterFlow status
  ↓
Update invoice status in Supabase
  ↓
Revalidate UI paths
```

### Status Mapping

| Square Status | MatterFlow Status | Description |
|---------------|-------------------|-------------|
| PAID | paid | Invoice fully paid |
| PARTIALLY_PAID | partial | Partial payment received |
| UNPAID | sent | Invoice sent but not paid |
| SCHEDULED | sent | Payment scheduled |
| PAYMENT_PENDING | sent | Payment in progress |
| DRAFT | draft | Not yet published |
| CANCELED | draft | Invoice canceled |
| REFUNDED | draft | Payment refunded |
| FAILED | draft | Payment failed |

## API Reference

### Square Client Functions

#### `isSquareConfigured(): boolean`

Check if Square credentials are configured.

```typescript
import { isSquareConfigured } from "@/lib/square";

if (isSquareConfigured()) {
  console.log("Square is ready!");
}
```

#### `createSquareClient(): Client`

Create authenticated Square SDK client.

```typescript
import { createSquareClient } from "@/lib/square";

const client = createSquareClient();
const invoice = await client.invoicesApi.getInvoice("invoice-id");
```

### Invoice Operations

#### `createSquareInvoice(params): Promise<SquareInvoiceResult>`

Create invoice in Square.

```typescript
import { createSquareInvoice } from "@/lib/square";

const result = await createSquareInvoice({
  recipientEmail: "client@example.com",
  recipientName: "Jane Doe",
  lineItems: [
    {
      name: "Legal Consultation",
      quantity: "1",
      basePriceMoney: {
        amount: 150000n, // $1500.00 in cents
        currency: "USD",
      },
    },
  ],
  dueDate: "2024-12-31",
  title: "Invoice for Contract Review",
  description: "Legal services for contract review",
  matterReference: "matter-id",
});

if (result.success) {
  console.log("Invoice created:", result.invoiceId);
  console.log("Payment URL:", result.publicUrl);
}
```

#### `getSquareInvoice(invoiceId): Promise<SquareInvoiceResult>`

Get invoice details from Square.

```typescript
import { getSquareInvoice } from "@/lib/square";

const result = await getSquareInvoice("square-invoice-id");

if (result.success) {
  console.log("Status:", result.status);
  console.log("Payment URL:", result.publicUrl);
}
```

#### `cancelSquareInvoice(invoiceId, version): Promise<Result>`

Cancel a Square invoice.

```typescript
import { cancelSquareInvoice } from "@/lib/square";

const result = await cancelSquareInvoice("invoice-id", 1);
```

### Server Actions

#### `syncInvoiceToSquare(invoiceId): Promise<ActionResult>`

Sync a MatterFlow invoice to Square. Called automatically when invoice status changes to "sent".

```typescript
import { syncInvoiceToSquare } from "@/lib/square";

const result = await syncInvoiceToSquare("matterflow-invoice-id");

if (result.ok) {
  console.log("Synced:", result.data);
}
```

#### `syncSquarePaymentStatus(squareInvoiceId): Promise<SyncSquarePaymentResult>`

Update MatterFlow invoice status from Square. Called automatically by webhook.

```typescript
import { syncSquarePaymentStatus } from "@/lib/square";

const result = await syncSquarePaymentStatus("square-invoice-id");

if (result.ok) {
  console.log("New status:", result.newStatus);
}
```

#### `getSquarePaymentUrl(invoiceId): Promise<ActionResult>`

Get payment URL for a synced invoice.

```typescript
import { getSquarePaymentUrl } from "@/lib/square";

const result = await getSquarePaymentUrl("matterflow-invoice-id");

if (result.ok) {
  console.log("Payment URL:", result.data.paymentUrl);
}
```

## Database Schema

### Existing Schema

The `square_invoice_id` field already exists in the invoices table:

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  matter_id UUID REFERENCES matters(id),
  status TEXT DEFAULT 'draft',
  total_cents INTEGER DEFAULT 0,
  due_date DATE,
  square_invoice_id TEXT,  -- Stores Square invoice ID
  line_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

No migration required - the schema already supports Square integration.

## Security

### Webhook Signature Verification

All webhooks from Square are signed with HMAC SHA-256. MatterFlow automatically verifies signatures:

```typescript
// Automatically handled in /api/webhooks/square/route.ts
function verifyWebhookSignature(
  body: string,
  signature: string,
  signatureKey: string
): boolean {
  const hmac = crypto.createHmac("sha256", signatureKey);
  hmac.update(body);
  const expectedSignature = hmac.digest("base64");
  return signature === expectedSignature;
}
```

**Important**: Set `SQUARE_WEBHOOK_SIGNATURE_KEY` in production to prevent unauthorized webhook calls.

### Access Token Security

- Access tokens are server-side only (never exposed to client)
- Tokens stored in environment variables (not in database)
- Use separate tokens for sandbox and production
- Rotate tokens periodically in Square dashboard

### PCI Compliance

Square handles all payment processing and PCI compliance. MatterFlow never stores:
- Credit card numbers
- CVV codes
- Payment method details

## Troubleshooting

### "Square not configured" error

**Cause**: Environment variables not set.

**Fix**:
1. Check `.env.local` has all required variables
2. Verify `SQUARE_ACCESS_TOKEN` and `SQUARE_LOCATION_ID` are set
3. Restart dev server: `Ctrl+C` then `pnpm dev`

### Invoice not syncing to Square

**Cause**: Missing client email or API error.

**Fix**:
1. Ensure matter has a client assigned
2. Ensure client has a valid email address
3. Check server logs for Square API errors
4. Verify access token is valid (not expired or revoked)

### Webhook not receiving events

**Cause**: Webhook URL not accessible or signature verification failing.

**Fix**:
1. For local development, use ngrok: `ngrok http 3000`
2. Update webhook URL in Square dashboard with ngrok URL
3. Verify `SQUARE_WEBHOOK_SIGNATURE_KEY` matches Square dashboard
4. Check webhook endpoint: `curl https://yourapp.com/api/webhooks/square`

### "Invalid signature" on webhook

**Cause**: Signature key mismatch.

**Fix**:
1. Go to Square Dashboard → Webhooks
2. Copy the signature key shown for your endpoint
3. Update `SQUARE_WEBHOOK_SIGNATURE_KEY` in `.env.local`
4. Restart server

### Payment link doesn't work

**Cause**: Invoice not published or location settings.

**Fix**:
1. Verify invoice status is not "DRAFT"
2. Check Square Dashboard → Invoices to see if invoice exists
3. Ensure location is set up correctly in Square
4. Try manual publish in Square dashboard

## Testing

### Sandbox Mode

Use Square's sandbox environment for testing:

```bash
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=your-sandbox-token
```

### Test Cards

Square provides test credit cards for sandbox:

- **Success**: `4111 1111 1111 1111`
- **Decline**: `4000 0000 0000 0002`
- **CVV**: Any 3 digits
- **Expiry**: Any future date
- **ZIP**: Any 5 digits

### Manual Testing

1. **Create invoice**:
   ```bash
   pnpm dev
   # Navigate to /billing
   # Create and send invoice
   ```

2. **Check Square dashboard**:
   - Log into [Square Dashboard](https://squareup.com/dashboard/invoices)
   - Verify invoice appears

3. **Test payment**:
   - Copy payment link from email
   - Open in browser
   - Enter test card details
   - Complete payment

4. **Verify status update**:
   - Check MatterFlow invoice status changes to "paid"
   - Check webhook logs in server console

### Webhook Testing

Test webhook endpoint locally:

```bash
# Start ngrok
ngrok http 3000

# Update Square webhook URL to ngrok URL
# Trigger test webhook from Square dashboard

# Check server logs
pnpm dev
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] Switch to production access token
- [ ] Set `SQUARE_ENVIRONMENT=production`
- [ ] Update webhook URL to production domain
- [ ] Verify webhook signature key is set
- [ ] Test invoice creation in production
- [ ] Test payment with real card (small amount)
- [ ] Verify webhook receives events
- [ ] Monitor for errors in first 24 hours

### Environment Variables (Production)

```bash
SQUARE_ACCESS_TOKEN=EAAA...  # Production token
SQUARE_ENVIRONMENT=production
SQUARE_LOCATION_ID=L...
SQUARE_WEBHOOK_SIGNATURE_KEY=...
```

### Monitoring

Monitor Square integration health:

1. **Square Dashboard**: Check failed payments and declined cards
2. **Webhook Logs**: Monitor `/api/webhooks/square` endpoint
3. **Database**: Query invoices with `square_invoice_id IS NULL` to find un-synced invoices
4. **Email Logs**: Verify payment links are being sent

## Costs

### Square Fees

- **Online invoices**: 2.9% + $0.30 per transaction
- **ACH bank transfers**: 1% (max $10)
- **No monthly fees** for basic invoice sending

### Example Costs

| Invoice Amount | Square Fee | Net Amount |
|----------------|------------|------------|
| $500 | $14.80 | $485.20 |
| $1,500 | $43.80 | $1,456.20 |
| $5,000 | $145.30 | $4,854.70 |

## FAQ

### Do I need a Square credit card reader?

No. Square invoices work entirely online without any physical hardware.

### Can clients pay without creating a Square account?

Yes. Clients can pay as guests using any credit/debit card.

### What currencies are supported?

Square supports USD, CAD, GBP, EUR, AUD, and JPY. MatterFlow defaults to USD.

### Can I customize invoice appearance?

Invoice appearance is controlled by Square. You can customize your business logo and colors in Square settings.

### What happens if Square is down?

Invoices are created in MatterFlow first. If Square sync fails, the invoice email will be sent without a payment link. You can manually sync later or send payment link separately.

### Can I use multiple Square locations?

Yes. Set `SQUARE_LOCATION_ID` to your primary location. For multiple locations, you'll need to customize the integration.

## Support Resources

- [Square Developer Documentation](https://developer.squareup.com/docs)
- [Square Invoices API Reference](https://developer.squareup.com/reference/square/invoices-api)
- [Square Webhooks Guide](https://developer.squareup.com/docs/webhooks/overview)
- [Square Support](https://squareup.com/help)

## Next Steps

1. ✅ Create Square account
2. ✅ Get API credentials
3. ✅ Configure environment variables
4. ✅ Set up webhook
5. ✅ Test invoice creation
6. ✅ Test payment flow
7. ✅ Deploy to production
8. [ ] Monitor first week of payments
9. [ ] Review Square dashboard analytics

---

**Integration Status**: ✅ Complete and production-ready

**Last Updated**: December 2024
