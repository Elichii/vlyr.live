"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Building2, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface GoogleLocation {
  name: string // accounts/{account_id}/locations/{location_id}
  title: string
  storefrontAddress?: {
    addressLines?: string[]
    locality?: string
    administrativeArea?: string
    postalCode?: string
  }
  websiteUri?: string
  primaryPhone?: string
  regularHours?: object
}

interface GoogleAccount {
  name: string // accounts/{account_id}
  accountName: string
  type: string
}

interface Props {
  accessToken: string
  onComplete: () => void
  onCancel: () => void
}

export function GoogleLocationPicker({ accessToken, onComplete, onCancel }: Props) {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([])
  const [locations, setLocations] = useState<GoogleLocation[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingLocation, setSavingLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch Google Business accounts on mount
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const res = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error?.message || "Failed to fetch accounts")
        }

        const data = await res.json()
        setAccounts(data.accounts || [])

        // If only one account, auto-select it
        if (data.accounts?.length === 1) {
          setSelectedAccount(data.accounts[0].name)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Google Business accounts")
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [accessToken])

  // Fetch locations when account is selected
  useEffect(() => {
    if (!selectedAccount) return

    async function fetchLocations() {
      setLoading(true)
      setLocations([])
      try {
        const res = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${selectedAccount}/locations?readMask=name,title,storefrontAddress,websiteUri,primaryPhone`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error?.message || "Failed to fetch locations")
        }

        const data = await res.json()
        setLocations(data.locations || [])

        // If only one location, auto-select it
        if (data.locations?.length === 1) {
          setSelectedLocation(data.locations[0].name)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load business locations")
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [selectedAccount, accessToken])

  // Save selected location to database
  async function handleConfirm() {
    if (!selectedLocation || !selectedAccount) return

    setSavingLocation(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const selectedLoc = locations.find((l) => l.name === selectedLocation)
      const selectedAcc = accounts.find((a) => a.name === selectedAccount)

      // Extract location_id from the name (accounts/{account_id}/locations/{location_id})
      const locationId = selectedLocation.split("/").pop()

      const { error: updateError } = await supabase.from("merchants").update({
        google_connected: true,
        google_location_id: locationId,
        google_account_name: selectedAcc?.accountName || selectedAccount,
      }).eq("id", user.id)

      if (updateError) throw updateError

      // Also add Google as a review link if not already present
      const googleReviewUrl = `https://search.google.com/local/writereview?placeid=${locationId}`
      
      const { data: existingGoogle } = await supabase
        .from("review_links")
        .select("id")
        .eq("merchant_id", user.id)
        .eq("platform", "google")
        .maybeSingle()

      if (!existingGoogle) {
        // Check if there are any existing links to determine if this should be primary
        const { count } = await supabase
          .from("review_links")
          .select("id", { count: "exact", head: true })
          .eq("merchant_id", user.id)

        await supabase.from("review_links").insert({
          merchant_id: user.id,
          platform: "google",
          url: googleReviewUrl,
          is_primary: (count || 0) === 0, // Make primary if no other links
          sort_order: 0,
        })
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save location")
    } finally {
      setSavingLocation(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-blue-500/10 to-green-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Building2 size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Select Your Business</h2>
              <p className="text-sm text-muted-foreground">Choose the Google Business Profile to connect</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading && !selectedAccount ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading your Google Business accounts...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <p className="text-sm text-red-400">{error}</p>
              <Button variant="outline" size="sm" onClick={onCancel}>
                Go Back
              </Button>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Building2 size={24} className="text-yellow-400" />
              </div>
              <p className="text-sm text-muted-foreground">No Google Business accounts found.</p>
              <p className="text-xs text-muted-foreground/70">
                Make sure you have a Google Business Profile set up.
              </p>
              <a
                href="https://business.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Create one at business.google.com <ExternalLink size={10} />
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account Selection */}
              {accounts.length > 1 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Select Account
                  </label>
                  <div className="space-y-2">
                    {accounts.map((account) => (
                      <button
                        key={account.name}
                        onClick={() => setSelectedAccount(account.name)}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          selectedAccount === account.name
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-border/80 hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{account.accountName}</span>
                          {selectedAccount === account.name && (
                            <CheckCircle2 size={16} className="text-primary" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{account.type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Location Selection */}
              {selectedAccount && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Select Location
                  </label>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No locations found for this account.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {locations.map((location) => {
                        const address = location.storefrontAddress
                        const addressStr = address
                          ? [
                              ...(address.addressLines || []),
                              address.locality,
                              address.administrativeArea,
                              address.postalCode,
                            ]
                              .filter(Boolean)
                              .join(", ")
                          : null

                        return (
                          <button
                            key={location.name}
                            onClick={() => setSelectedLocation(location.name)}
                            className={`w-full p-4 rounded-lg border text-left transition-all ${
                              selectedLocation === location.name
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-border/80 hover:bg-secondary/50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{location.title}</div>
                                {addressStr && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                    <MapPin size={10} className="shrink-0" />
                                    <span className="truncate">{addressStr}</span>
                                  </div>
                                )}
                                {location.primaryPhone && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {location.primaryPhone}
                                  </div>
                                )}
                              </div>
                              {selectedLocation === location.name && (
                                <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/30 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={savingLocation}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedLocation || savingLocation}
            className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
          >
            {savingLocation ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Connecting...
              </>
            ) : (
              "Connect This Location"
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
