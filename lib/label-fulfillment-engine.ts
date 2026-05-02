/**
 * VLYR Label Fulfillment Engine
 *
 * Orchestrates the full lifecycle of a label batch:
 *   1. createBatch()        – Create a batch row with design config
 *   2. generateLabels()     – Generate short codes + QR data URIs
 *   3. processPaidOrder()   – Called by Square webhook after payment
 *   4. submitToPrinter()    – Send to print provider (Sticker Mule / StickerGiant)
 *   5. updateShipment()     – Mark shipped with tracking
 *
 * Printer Adapter Interface:
 *   Each adapter implements { submitOrder, getStatus } so we can
 *   swap between StickerMule, StickerGiant, or a mock provider.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { generateShortCodes, buildScanUrl } from "@/lib/short-code"
import type { LabelDesign, BatchRecord, LabelInstance } from "@/lib/label-types"

// Re-export types for consumers that already import from this file
export type { LabelDesign, BatchRecord, LabelInstance }

// ─── Printer Adapter Interface ───────────────────────────────────────
export interface PrinterAdapter {
  name: string
  submitOrder(batch: BatchRecord, labels: LabelInstance[]): Promise<{ providerOrderId: string }>
  getStatus(providerOrderId: string): Promise<{ status: string; trackingUrl?: string }>
}

// ─── Mock Printer (Development) ──────────────────────────────────────
export const MockPrinter: PrinterAdapter = {
  name: "MockPrinter",
  async submitOrder(batch) {
    console.log(`[MockPrinter] Submitting ${batch.quantity} labels for batch ${batch.id}`)
    return { providerOrderId: `MOCK-${Date.now()}` }
  },
  async getStatus(providerOrderId) {
    return { status: "printing", trackingUrl: `https://mock-tracking.test/${providerOrderId}` }
  },
}

// ─── StickerMule Adapter (placeholder for real API) ──────────────────
export const StickerMuleAdapter: PrinterAdapter = {
  name: "StickerMule",
  async submitOrder(batch) {
    // In production, this would call the StickerMule API:
    // POST https://api.stickermule.com/v3/orders
    // with the PDF artwork and quantity
    console.log(`[StickerMule] Would submit ${batch.quantity} labels for batch ${batch.id}`)
    return { providerOrderId: `SM-${Date.now()}` }
  },
  async getStatus(providerOrderId) {
    console.log(`[StickerMule] Checking status for ${providerOrderId}`)
    return { status: "processing" }
  },
}

// ─── StickerGiant Adapter (placeholder for real API) ─────────────────
export const StickerGiantAdapter: PrinterAdapter = {
  name: "StickerGiant",
  async submitOrder(batch) {
    console.log(`[StickerGiant] Would submit ${batch.quantity} labels for batch ${batch.id}`)
    return { providerOrderId: `SG-${Date.now()}` }
  },
  async getStatus(providerOrderId) {
    console.log(`[StickerGiant] Checking status for ${providerOrderId}`)
    return { status: "processing" }
  },
}

// ─── Get active printer adapter ──────────────────────────────────────
function getPrinter(): PrinterAdapter {
  const provider = process.env.LABEL_PRINT_PROVIDER ?? "mock"
  switch (provider) {
    case "stickermule":
      return StickerMuleAdapter
    case "stickergiant":
      return StickerGiantAdapter
    default:
      return MockPrinter
  }
}

// ─── Core Engine Functions ───────────────────────────────────────────

/**
 * Step 1: Create a batch record with the merchant's design config.
 */
export async function createBatch(
  merchantId: string,
  quantity: number,
  design: LabelDesign,
): Promise<BatchRecord> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("label_batches")
    .insert({
      merchant_id: merchantId,
      quantity,
      status: "pending",
      design_json: design,
    })
    .select()
    .single()

  if (error) throw new Error(`createBatch failed: ${error.message}`)
  return data as BatchRecord
}

/**
 * Step 2: Generate short codes + label instances for the batch.
 * Returns the label instances with their scan URLs (for QR encoding).
 */
export async function generateLabels(
  batchId: string,
  merchantId: string,
  quantity: number,
): Promise<LabelInstance[]> {
  const supabase = createAdminClient()

  // Update batch status
  await supabase
    .from("label_batches")
    .update({ status: "generating" })
    .eq("id", batchId)

  // Generate unique short codes
  const codes = generateShortCodes(quantity)

  // Insert all label instances
  const rows = codes.map((code) => ({
    batch_id: batchId,
    merchant_id: merchantId,
    short_code: code,
  }))

  // Insert in chunks of 500 to avoid payload limits
  const chunkSize = 500
  const allLabels: LabelInstance[] = []

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from("label_instances")
      .insert(chunk)
      .select()

    if (error) throw new Error(`generateLabels insert failed: ${error.message}`)

    const withUrls = (data ?? []).map((row: Record<string, string>) => ({
      ...row,
      scan_url: buildScanUrl(row.short_code),
    })) as LabelInstance[]

    allLabels.push(...withUrls)
  }

  return allLabels
}

/**
 * Step 3: Called by the Square webhook after invoice.payment_made.
 * Creates the batch, generates labels, and submits to the printer.
 */
export async function processPaidOrder(
  merchantId: string,
  quantity: number,
  design: LabelDesign,
): Promise<{ batchId: string; providerOrderId: string }> {
  // 1. Create batch
  const batch = await createBatch(merchantId, quantity, design)

  // 2. Generate labels
  const labels = await generateLabels(batch.id, merchantId, quantity)

  // 3. Submit to printer
  const printer = getPrinter()
  const { providerOrderId } = await printer.submitOrder(batch, labels)

  // 4. Update batch with provider order ID and status
  const supabase = createAdminClient()
  await supabase
    .from("label_batches")
    .update({
      status: "printing",
      provider_order_id: providerOrderId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", batch.id)

  return { batchId: batch.id, providerOrderId }
}

/**
 * Step 4: Check printer status and update batch accordingly.
 */
export async function syncBatchStatus(batchId: string): Promise<string> {
  const supabase = createAdminClient()

  const { data: batch } = await supabase
    .from("label_batches")
    .select("*")
    .eq("id", batchId)
    .single()

  if (!batch?.provider_order_id) return batch?.status ?? "unknown"

  const printer = getPrinter()
  const { status, trackingUrl } = await printer.getStatus(batch.provider_order_id)

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  await supabase.from("label_batches").update(updates).eq("id", batchId)

  return status
}
