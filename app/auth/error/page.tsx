import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50 border border-red-200">
          <AlertCircle size={24} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Authentication Error
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Something went wrong during sign-in. The link may have expired or already been used.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <Button asChild className="h-12 rounded-xl bg-foreground text-background font-semibold hover:bg-foreground/90">
            <Link href="/auth/login">Try Again</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-xl border-border bg-card text-foreground hover:bg-secondary">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
