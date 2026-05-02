"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

function GoogleOAuthSuccessContent() {
  const searchParams = useSearchParams()
  
  const success = searchParams.get("success") === "true"
  const email = searchParams.get("email")
  const name = searchParams.get("name")
  const error = searchParams.get("error")
  const managedBusinesses = searchParams.get("managedBusinesses")
  const debugInfo = searchParams.get("debugInfo")
  const businessCount = searchParams.get("businessCount")
  const accessToken = searchParams.get("accessToken")
  const refreshToken = searchParams.get("refreshToken")

  useEffect(() => {
    // Use localStorage as a bridge to communicate with parent window
    // This bypasses COOP restrictions
    if (success && email) {
      const data = {
        type: "google-oauth-success",
        email: email,
        name: name || null,
        managedBusinesses: managedBusinesses || "[]",
        debugInfo: debugInfo || "{}",
        businessCount: businessCount || "0",
        accessToken: accessToken || null,
        refreshToken: refreshToken || null,
        timestamp: Date.now()
      }
      localStorage.setItem("google-oauth-result", JSON.stringify(data))
    } else if (error) {
      const data = {
        type: "google-oauth-error",
        error: error || "Authentication failed",
        debugInfo: debugInfo || "{}",
        timestamp: Date.now()
      }
      localStorage.setItem("google-oauth-result", JSON.stringify(data))
    }
    
    // Also try postMessage for non-COOP environments
    if (window.opener) {
      try {
        if (success && email) {
          window.opener.postMessage({
            type: "google-oauth-success",
            email: email,
            name: name || null,
            managedBusinesses: managedBusinesses || "[]",
            debugInfo: debugInfo || "{}",
            businessCount: businessCount || "0",
            accessToken: accessToken || null,
            refreshToken: refreshToken || null
          }, "*")
        } else {
          window.opener.postMessage({
            type: "google-oauth-error",
            error: error || "Authentication failed",
            debugInfo: debugInfo || "{}"
          }, "*")
        }
      } catch {
        // COOP blocked, localStorage will be used instead
      }
    }
    
    // Close this window after a short delay
    setTimeout(() => {
      try {
        window.close()
      } catch {
        // Window might not close due to COOP, show message
      }
    }, 1500)
  }, [success, email, name, error, managedBusinesses, debugInfo, businessCount, accessToken, refreshToken])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        {success ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Google Sign-In Successful
            </h1>
            <p className="text-muted-foreground mb-4">
              Signed in as {email}
            </p>
            <p className="text-sm text-muted-foreground">
              This window will close automatically...
            </p>
          </>
        ) : error ? (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Sign-In Failed
            </h1>
            <p className="text-muted-foreground mb-4">
              {error.replace(/_/g, " ")}
            </p>
            <p className="text-sm text-muted-foreground">
              This window will close automatically...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Processing...
            </h1>
          </>
        )}
      </div>
    </div>
  )
}

export default function GoogleOAuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
      </div>
    }>
      <GoogleOAuthSuccessContent />
    </Suspense>
  )
}
