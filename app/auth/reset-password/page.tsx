"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Eye, EyeOff, Lock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { VLYRInlineLoader } from "@/components/vlyr-loader"
import { createClient } from "@/lib/supabase/client"

/** Reached from the reset email (via /auth/callback, which signs the user in). */
export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState<"checking" | "ok" | "no-session">("checking")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "")
      setReady(data.user ? "ok" : "no-session")
    })
  }, [])

  const tooShort = password.length > 0 && password.length < 8
  const mismatch = confirm.length > 0 && confirm !== password
  const canSave = password.length >= 8 && password === confirm

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    const { error: err } = await createClient().auth.updateUser({ password })
    setSaving(false)
    if (err) {
      setError(/same/i.test(err.message) ? "Choose a password different from your old one." : err.message)
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-background px-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col items-center gap-4">
          <Image src="/images/vlyr-logo.png" alt="VLYR" width={100} height={40} className="object-contain" priority />
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Choose a new password</h1>
            {email && <p className="text-sm text-muted-foreground mt-1">For {email}</p>}
          </div>
        </div>

        {ready === "checking" ? (
          <div className="flex justify-center"><VLYRInlineLoader label="Checking your link..." /></div>
        ) : ready === "no-session" ? (
          <div className="text-center flex flex-col gap-3 p-6 rounded-2xl bg-card border border-border">
            <p className="text-sm font-semibold text-foreground">This link has expired</p>
            <p className="text-sm text-muted-foreground">Reset links work once and expire after a short time.</p>
            <Link href="/auth/forgot-password"><Button className="w-full rounded-xl">Send a new link</Button></Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {error && <p className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</p>}
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={show ? "text" : "password"}
                placeholder="New password (at least 8 characters)"
                value={password}
                autoFocus
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-11 h-12 rounded-xl"
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {tooShort && <p className="text-xs text-red-400 -mt-2">At least 8 characters.</p>}
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={show ? "text" : "password"}
                placeholder="Repeat new password"
                value={confirm}
                autoComplete="new-password"
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                className="pl-10 h-12 rounded-xl"
              />
            </div>
            {mismatch && <p className="text-xs text-red-400 -mt-2">Passwords don&apos;t match.</p>}
            <Button onClick={save} disabled={!canSave || saving} className="h-12 rounded-xl font-semibold">
              {saving ? <VLYRInlineLoader label="Saving..." /> : "Save and sign in"}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
