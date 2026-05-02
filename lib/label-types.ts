/**
 * Shared label design types -- safe to import from both client and server code.
 */

export interface LabelDesign {
  backgroundColor: string
  borderColor: string
  logoUrl: string | null
  businessName: string
  tagline: string
  labelSize: "2inch" | "3inch" | "4inch"
  shape: "rounded-rect" | "circle" | "square"
}

export interface BatchRecord {
  id: string
  merchant_id: string
  quantity: number
  status: string
  design_json: LabelDesign
  provider_order_id: string | null
  created_at: string
}

export interface LabelInstance {
  id: string
  batch_id: string
  merchant_id: string
  short_code: string
  scan_url: string
}
