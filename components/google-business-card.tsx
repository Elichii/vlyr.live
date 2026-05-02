"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, CheckCircle2, Loader2, ExternalLink, Lock, AlertTriangle, Building2 } from "lucide-react"

interface GoogleBusinessCardProps {
  isConnected: boolean
  accountName: string | null | undefined
  locationId: string | null | undefined
  businessName: string
  onConnect: () => void
  onDisconnect: () => void
}

export function GoogleBusinessCard({ 
  isConnected, 
  accountName, 
  locationId,
  onConnect, 
  onDisconnect 
}: GoogleBusinessCardProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check URL params for OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleConnected = params.get("google_connected")
    const googleError = params.get("google_error")

    if (googleError) {
      setError(googleError.replace(/_/g, " "))
      setIsConnecting(false)
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname)
    } else if (googleConnected === "true") {
      // Successfully connected
      setIsConnecting(false)
      onConnect()
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [onConnect])

  const handleConnectGoogle = () => {
    setIsConnecting(true)
    setError(null)
    
    // Open OAuth in popup window (required for iframe environments)
    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    
    const popup = window.open(
      "/api/google/auth?state=profile_" + Date.now(),
      "google-oauth",
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    )
    
    // Listen for OAuth completion message from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "google-oauth-success") {
        onConnect()
        setIsConnecting(false)
        window.removeEventListener("message", handleMessage)
        popup?.close()
      } else if (event.data?.type === "google-oauth-error") {
        setError(event.data.error?.replace(/_/g, " ") || "Google sign-in failed")
        setIsConnecting(false)
        window.removeEventListener("message", handleMessage)
        popup?.close()
      }
    }
    
    window.addEventListener("message", handleMessage)
    
    // Check if popup was blocked
    if (!popup) {
      setError("Popup blocked. Please allow popups and try again.")
      setIsConnecting(false)
      window.removeEventListener("message", handleMessage)
    }
    
    // Check if popup closes without completing
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed)
        setIsConnecting(false)
        window.removeEventListener("message", handleMessage)
      }
    }, 500)
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#FFE100]" />
          <h2 className="text-sm font-semibold text-foreground">Business Ownership Verification</h2>
        </div>
        {isConnected && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
            Verified Owner
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Sign in with Google to prove you own or manage this business. Only verified owners can use VLYR.
      </p>

      {isConnected ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-500/5 to-green-500/5 border border-green-500/10">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500/20 to-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{accountName || "Your Business"}</p>
              <p className="text-[11px] text-muted-foreground">Ownership verified via Google</p>
            </div>
            {locationId && (
              <a
                href={`https://business.google.com`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ExternalLink size={14} className="text-muted-foreground" />
              </a>
            )}
          </div>
          
          {/* Security Note */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <Lock size={12} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground">
              Your business is protected. No one else can claim it without your Google account.
            </p>
          </div>

          <button
            onClick={onDisconnect}
            className="text-xs text-muted-foreground hover:text-red-400 hover:underline underline-offset-4 w-fit transition-colors"
          >
            Disconnect verification
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-red-400">{error}</p>
                    {error.includes("No Google Business") && (
                      <a
                        href="https://business.google.com/create"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-[10px] text-[#FFE100] hover:underline"
                      >
                        Create a Google Business Profile <ExternalLink size={8} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Why Google Sign-In */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-secondary/50 border border-border">
            <Lock size={14} className="text-[#FFE100] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground mb-0.5">Secure Verification</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Google confirms you're an owner or manager of the business. This prevents unauthorized access.
              </p>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleConnectGoogle}
            disabled={isConnecting}
            className="flex items-center justify-center gap-2.5 w-full h-12 rounded-xl bg-white hover:bg-gray-50 text-gray-900 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 shadow-sm"
          >
            {isConnecting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          {/* Note */}
          <p className="text-[10px] text-muted-foreground text-center">
            Use the Google account that manages your{" "}
            <a 
              href="https://business.google.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#FFE100] hover:underline"
            >
              Google Business Profile
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
