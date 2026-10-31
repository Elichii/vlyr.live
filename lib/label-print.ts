/**
 * Print-at-home label batches.
 *
 * A batch is a run of numbered labels (No. 0001, 0002, ...) for one merchant.
 * Numbers keep counting up across batches, so every sticker a merchant
 * ever prints has its own number and its own QR code.
 *
 * Server-only: uses the service-role Supabase client.
 */
import { createAdminClient } from "@/lib/supabase/admin"
import { generateShortCodes, buildScanUrl } from "@/lib/short-code"
import type { LabelDesign } from "@/lib/label-types"
import { FREE_STICKER_LIMIT, isFreePlan } from "@/lib/onboarding-types"
import { getSetupState, isSetupComplete } from "@/lib/ownership"
import { DEFAULT_TAGLINE, isPlaceholderName, type PaperSize, type SheetLabel } from "@/lib/label-sheet"

export const MAX_LABELS_PER_BATCH = 500

export interface LabelAllowance {
  plan: string
  /** null = no limit (paid plan with confirmed payment) */
  limit: number | null
  used: number
  remaining: number | null
  /** Why the limit applies: free plan, or a paid plan whose payment isn't confirmed yet */
  reason: "free" | "unpaid" | null
}

/** Thrown when a trial merchant asks for more stickers than they have left. */
export class LabelLimitError extends Error {}

/**
 * How many stickers the merchant has printed and may still print.
 *
 * Unlimited printing needs a paid plan AND a confirmed payment
 * (`merchants.is_provisioned`, set by the payment webhook or by the VLYR
 * team when upgrading someone by hand). Everyone else gets the free
 * 15-sticker trial, so picking a paid plan without paying unlocks nothing.
 */
export async function getLabelAllowance(merchantId: string): Promise<LabelAllowance> {
  const supabase = createAdminClient()
  const [{ data: merchant }, { count }] = await Promise.all([
    supabase.from("merchants").select("package_id, is_provisioned").eq("id", merchantId).maybeSingle(),
    supabase.from("label_instances").select("id", { count: "exact", head: true }).eq("merchant_id", merchantId),
  ])
  const plan = (merchant?.package_id as string) || "free"
  const used = count ?? 0
  const paidAndConfirmed = !isFreePlan(plan) && merchant?.is_provisioned === true
  if (paidAndConfirmed) return { plan, limit: null, used, remaining: null, reason: null }
  return {
    plan,
    limit: FREE_STICKER_LIMIT,
    used,
    remaining: Math.max(0, FREE_STICKER_LIMIT - used),
    reason: isFreePlan(plan) ? "free" : "unpaid",
  }
}

export interface SelfPrintBatch {
  id: string
  quantity: number
  first_seq: number
  last_seq: number
  paper: PaperSize
  ink_saver: boolean
  design_json: LabelDesign
  download_count: number
  created_at: string
  /** Stickers in this sheet nobody has rated yet (filled by listSelfPrintBatches) */
  unused_count?: number
}

const BATCH_COLUMNS = "id, quantity, first_seq, last_seq, paper, ink_saver, design_json, download_count, created_at"

/** Trial stickers can't be customised: they always use the standard VLYR design. */
export const designLocked = (allowance: LabelAllowance) => allowance.limit !== null

/** The standard VLYR sticker (the approved design): "YOUR LOGO" shows the business name. */
export async function trialDesign(merchantId: string): Promise<LabelDesign> {
  const { data } = await createAdminClient().from("merchants").select("business_name").eq("id", merchantId).maybeSingle()
  return {
    labelSize: "vlyr",
    shape: "rounded-rect",
    businessName: (data?.business_name as string | null)?.trim() || "",
    logoUrl: null,
    backgroundColor: "#FFFFFF",
    borderColor: "#D2D2D6",
    tagline: "",
  }
}

/** The merchant's business name (used when a design still has a placeholder). */
export async function merchantBusinessName(merchantId: string): Promise<string> {
  const { data } = await createAdminClient().from("merchants").select("business_name").eq("id", merchantId).maybeSingle()
  return (data?.business_name as string | null)?.trim() || ""
}

/** The reward printed on stickers, if the business has one switched on. */
export async function activeRewardOffer(merchantId: string): Promise<string | null> {
  const { data } = await createAdminClient().from("merchants").select("reward_enabled, reward_offer").eq("id", merchantId).maybeSingle()
  const offer = (data?.reward_offer as string | null)?.trim()
  return data?.reward_enabled && offer ? offer : null
}

/** Fill in the real business name if the design still says "Your Business". */
export async function withBusinessName(merchantId: string, design: LabelDesign): Promise<LabelDesign> {
  if (!isPlaceholderName(design.businessName)) return design
  const name = await merchantBusinessName(merchantId)
  return name ? { ...design, businessName: name } : design
}

/** Clean up a design sent from the browser before storing or printing it. */
export function sanitizeDesign(input: unknown, merchantId?: string): LabelDesign {
  const d = (input ?? {}) as Partial<LabelDesign>
  const hex = (v: unknown, fallback: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback)
  const text = (v: unknown, fallback: string, max = 60) => (typeof v === "string" ? v.replace(/\s+/g, " ").slice(0, max) : fallback)
  const modern = d.labelSize === "1x2" || d.labelSize === "2x1" || d.labelSize === "vlyr"
  const base: LabelDesign = {
    backgroundColor: hex(d.backgroundColor, modern ? "#FFFFFF" : "#0A0A0A"),
    borderColor: hex(d.borderColor, modern ? "#D2D2D6" : "#FFE100"),
    logoUrl: null,
    businessName: text(d.businessName, ""),
    tagline: text(d.tagline, DEFAULT_TAGLINE),
    labelSize: modern || d.labelSize === "2inch" || d.labelSize === "4inch" ? d.labelSize! : "3inch",
    shape: d.shape === "circle" || d.shape === "square" ? d.shape : "rounded-rect",
  }
  if (!modern) return base
  return {
    ...base,
    shape: "rounded-rect",
    // Only the merchant's own logo from our storage
    logoUrl: merchantId && isOwnLogoUrl(d.logoUrl, merchantId) ? d.logoUrl! : null,
    headline: text(d.headline, "", 40),
    subline: text(d.subline, "", 60),
    cta: text(d.cta, "", 24),
    textColor: hex(d.textColor, "#1D1D1F"),
    qrColor: hex(d.qrColor, "#000000"),
    eyeColor: hex(d.eyeColor, hex(d.qrColor, "#000000")),
    dotStyle: d.dotStyle === "rounded" || d.dotStyle === "dots" ? d.dotStyle : "square",
    eyeStyle: d.eyeStyle === "rounded" || d.eyeStyle === "circle" ? d.eyeStyle : "square",
    qrCenterLogo: d.qrCenterLogo === true,
    showBorder: d.showBorder !== false,
  }
}

const LOGO_PREFIX = () => `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1/object/public/logos/`

/** True for a public logo URL inside this merchant's own storage folder. */
function isOwnLogoUrl(url: unknown, merchantId: string) {
  if (typeof url !== "string" || url.length > 500) return false
  const prefix = LOGO_PREFIX()
  if (!url.startsWith(prefix)) return false
  const rest = url.slice(prefix.length).split("?")[0]
  return rest.startsWith(`${merchantId}/`) && !rest.includes("..")
}

/**
 * The logo bytes for a modern sticker (PNG or JPG), read straight from our
 * storage. Never fetches arbitrary URLs.
 */
export async function loadStickerLogo(merchantId: string, design: LabelDesign): Promise<Uint8Array | null> {
  if (!design.logoUrl || !isOwnLogoUrl(design.logoUrl, merchantId)) return null
  const path = decodeURIComponent(design.logoUrl.slice(LOGO_PREFIX().length).split("?")[0])
  const { data, error } = await createAdminClient().storage.from("logos").download(path)
  if (error || !data || data.size > 5_000_000) return null
  const bytes = new Uint8Array(await data.arrayBuffer())
  const png = bytes[0] === 0x89 && bytes[1] === 0x50
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8
  return png || jpg ? bytes : null
}

export function parsePaper(v: unknown): PaperSize {
  return v === "a4" ? "a4" : "letter"
}

/**
 * Create a batch of numbered labels. Numbering continues from the
 * merchant's highest label number so far.
 */
export async function createSelfPrintBatch(opts: {
  merchantId: string
  quantity: number
  design: LabelDesign
  paper: PaperSize
  inkSaver: boolean
}): Promise<SelfPrintBatch> {
  const supabase = createAdminClient()
  const quantity = Math.floor(opts.quantity)
  if (!(quantity >= 1 && quantity <= MAX_LABELS_PER_BATCH)) {
    throw new Error(`Choose between 1 and ${MAX_LABELS_PER_BATCH} labels.`)
  }

  // Stickers only for businesses whose ownership Google has confirmed
  if (!isSetupComplete(await getSetupState(opts.merchantId))) {
    throw new Error("Verify your business with Google before printing stickers.")
  }

  const allowance = await getLabelAllowance(opts.merchantId)
  // Free trial: always the standard VLYR sticker (customising is a paid feature)
  const design = designLocked(allowance) ? await trialDesign(opts.merchantId) : await withBusinessName(opts.merchantId, opts.design)
  if (allowance.remaining !== null && quantity > allowance.remaining) {
    const why = allowance.reason === "unpaid"
      ? "Your plan isn't active until payment is confirmed, so the trial limit applies."
      : "Upgrade to print more."
    throw new LabelLimitError(
      allowance.remaining === 0
        ? `The trial includes ${allowance.limit} stickers and you've used them all. ${why}`
        : `You have ${allowance.remaining} trial sticker${allowance.remaining === 1 ? "" : "s"} left. ${why}`,
    )
  }

  // Two batches created at the same moment could pick the same numbers.
  // The unique (merchant_id, seq) index rejects the second one, so retry.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: last, error: lastErr } = await supabase
      .from("label_instances")
      .select("seq")
      .eq("merchant_id", opts.merchantId)
      .not("seq", "is", null)
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lastErr) throw new Error(`Could not read label numbers: ${lastErr.message}`)

    const firstSeq = (last?.seq ?? 0) + 1
    const lastSeq = firstSeq + quantity - 1

    const { data: batch, error: batchErr } = await supabase
      .from("label_batches")
      .insert({
        merchant_id: opts.merchantId,
        quantity,
        // The PDF is handed over immediately. (The table only allows
        // pending / generating / printing / shipped / delivered.)
        status: "delivered",
        fulfillment: "self_print",
        design_json: design,
        first_seq: firstSeq,
        last_seq: lastSeq,
        paper: opts.paper,
        ink_saver: opts.inkSaver,
      })
      .select(BATCH_COLUMNS)
      .single()
    if (batchErr || !batch) throw new Error(`Could not create label batch: ${batchErr?.message}`)

    const codes = generateShortCodes(quantity)
    const rows = codes.map((short_code, i) => ({
      batch_id: batch.id,
      merchant_id: opts.merchantId,
      short_code,
      seq: firstSeq + i,
    }))

    const { error: insertErr } = await supabase.from("label_instances").insert(rows)
    if (!insertErr) return batch as SelfPrintBatch

    // Clean up the empty batch before retrying or giving up
    await supabase.from("label_batches").delete().eq("id", batch.id)
    if (insertErr.code !== "23505") throw new Error(`Could not create labels: ${insertErr.message}`)
  }
  throw new Error("Could not reserve label numbers. Please try again.")
}

export async function listSelfPrintBatches(merchantId: string): Promise<SelfPrintBatch[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("label_batches")
    .select(BATCH_COLUMNS)
    .eq("merchant_id", merchantId)
    .eq("fulfillment", "self_print")
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  const batches = (data ?? []) as SelfPrintBatch[]
  if (!batches.length) return batches

  // How many stickers in each sheet are still unused (not rated yet)
  const { data: unused } = await supabase
    .from("label_instances")
    .select("batch_id")
    .eq("merchant_id", merchantId)
    .is("used_at", null)
  const counts = new Map<string, number>()
  for (const r of unused ?? []) counts.set(r.batch_id as string, (counts.get(r.batch_id as string) ?? 0) + 1)
  return batches.map((b) => ({ ...b, unused_count: counts.get(b.id) ?? 0 }))
}

/** Load a batch and its labels, only if it belongs to the merchant. */
export async function getBatchForPrint(merchantId: string, batchId: string, opts: { unusedOnly?: boolean } = {}) {
  const supabase = createAdminClient()
  const { data: batch } = await supabase
    .from("label_batches")
    .select(BATCH_COLUMNS)
    .eq("id", batchId)
    .eq("merchant_id", merchantId)
    .eq("fulfillment", "self_print")
    .maybeSingle()
  if (!batch) return null

  const { data: rows, error } = await supabase
    .from("label_instances")
    .select("seq, short_code, used_at")
    .eq("batch_id", batchId)
    .order("seq", { ascending: true })
    .limit(MAX_LABELS_PER_BATCH)
  if (error) throw new Error(error.message)

  // Reprint only stickers nobody has rated yet (same codes, nothing new)
  const picked = opts.unusedOnly ? (rows ?? []).filter((r) => !r.used_at) : rows ?? []
  const labels: SheetLabel[] = picked.map((r) => ({
    seq: r.seq as number,
    shortCode: r.short_code as string,
    scanUrl: buildScanUrl(r.short_code as string),
  }))

  // Count downloads (best effort)
  await supabase
    .from("label_batches")
    .update({ download_count: ((batch as SelfPrintBatch).download_count ?? 0) + 1 })
    .eq("id", batchId)

  return { batch: batch as SelfPrintBatch, labels }
}
