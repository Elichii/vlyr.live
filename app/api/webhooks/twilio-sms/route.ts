/**
 * Incoming texts from Twilio.
 *
 * In Twilio, set the Messaging Service "VLYR" > Integration >
 * "Send a webhook" to:  https://vlyr.live/api/webhooks/twilio-sms  (POST)
 *
 * Twilio already answers STOP / START / HELP and blocks texts to numbers
 * that opted out. This keeps our dashboard in step: STOP switches the
 * alerts off for that number, START switches them back on.
 * Requests are checked with Twilio's signature (X-Twilio-Signature).
 */
import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { optInPhone, optOutPhone } from "@/lib/sms-alerts"
import { publicOrigin } from "@/lib/public-origin"

export const runtime = "nodejs"

const STOP_WORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "OPTOUT", "REVOKE"]
const START_WORDS = ["START", "UNSTOP", "YES"]

// Empty reply: Twilio sends its own STOP/START confirmations
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const signature = request.headers.get("x-twilio-signature")
  if (!authToken || !signature) return new NextResponse(null, { status: 404 })

  const params = Object.fromEntries(new URLSearchParams(await request.text()))
  const url = `${publicOrigin(request)}${request.nextUrl.pathname}${request.nextUrl.search}`
  if (!twilio.validateRequest(authToken, signature, url, params)) {
    console.warn("[sms] inbound webhook: bad Twilio signature for", url)
    return new NextResponse(null, { status: 403 })
  }

  const from = params.From ?? ""
  // OptOutType is set when Advanced Opt-Out is on; fall back to the words themselves
  const type = (params.OptOutType ?? "").toUpperCase()
  const word = (params.Body ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "")
  if (type === "STOP" || (!type && STOP_WORDS.includes(word))) {
    const n = await optOutPhone(from)
    console.log(`[sms] STOP from …${from.slice(-4)}: alerts off for ${n} business(es)`)
  } else if (type === "START" || (!type && START_WORDS.includes(word))) {
    const n = await optInPhone(from)
    console.log(`[sms] START from …${from.slice(-4)}: alerts on for ${n} business(es)`)
  }

  return new NextResponse(EMPTY_TWIML, { headers: { "Content-Type": "text/xml" } })
}
