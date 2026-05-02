"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { VLYRInlineLoader } from "@/components/vlyr-loader"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const canSubmit = isEmailValid && password.length >= 6

  const handleLogin = async () => {
    if (!canSubmit) return
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-background px-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm flex flex-col gap-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/images/vlyr-logo.png"
            alt="VLYR"
            width={100}
            height={40}
            className="object-contain"
            priority
          />
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to your Command Center
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="pl-10 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="pl-10 pr-11 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Button
            onClick={handleLogin}
            disabled={!canSubmit || isLoading}
            className="h-12 rounded-xl bg-foreground text-background font-semibold text-base hover:bg-foreground/90 disabled:opacity-30"
          >
            {isLoading ? (
              <VLYRInlineLoader label="Signing in..." />
            ) : (
              <>
                Sign In
                <ArrowRight size={18} className="ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Footer Links */}
        <div className="flex flex-col items-center gap-3 text-sm">
          <p className="text-muted-foreground">
            {"Don't have an account? "}
            <Link href="/onboarding" className="text-foreground font-medium hover:underline underline-offset-4">
              Get started
            </Link>
          </p>
          <Link href="/" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors text-xs">
            Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
