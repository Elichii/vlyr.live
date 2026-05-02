// Review Sync Cron Job
// Runs every 5 minutes via Vercel Cron to:
// 1. Fetch all merchants with verified Google Business Profiles
// 2. For each merchant, fetch their latest reviews from Google
// 3. Store new reviews in the database
// 4. Trigger SMS alerts for new negative reviews (1-3 stars)

import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { getValidGoogleToken } from "@/lib/google/token-refresh"

// Use service role for cron jobs (no user context)
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(supabaseUrl, serviceRoleKey)
}

interface GoogleReview {
  name: string // format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
  reviewId: string
  reviewer: {
    displayName: string
    profilePhotoUrl?: string
  }
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE"
  comment?: string
  createTime: string
  updateTime: string
  reviewReply?: {
    comment: string
    updateTime: string
  }
}

interface GoogleReviewsResponse {
  reviews?: GoogleReview[]
  averageRating?: number
  totalReviewCount?: number
  nextPageToken?: string
}

const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const supabase = getServiceClient()
  const results: { merchantId: string; newReviews: number; errors: string[] }[] = []
  
  try {
    // Get all verified merchants with valid Google connections
    const { data: merchants, error: merchantsError } = await supabase
      .from("merchants")
      .select("id, business_name, google_verified_location_id, google_access_token, google_refresh_token")
      .eq("google_ownership_verified", true)
      .not("google_verified_location_id", "is", null)
    
    if (merchantsError) {
      console.error("[v0] Failed to fetch merchants:", merchantsError)
      return NextResponse.json({ error: "Failed to fetch merchants", details: merchantsError.message }, { status: 500 })
    }
    
    if (!merchants || merchants.length === 0) {
      return NextResponse.json({ message: "No verified merchants to sync", synced: 0 })
    }
    
    // Process each merchant
    for (const merchant of merchants) {
      const merchantResult = { merchantId: merchant.id, newReviews: 0, errors: [] as string[] }
      
      try {
        // Get valid access token (refreshes if needed)
        const accessToken = await getValidGoogleToken(merchant.id)
        
        if (!accessToken) {
          merchantResult.errors.push("No valid access token")
          results.push(merchantResult)
          continue
        }
        
        // Fetch reviews from Google Business Profile API
        const locationId = merchant.google_verified_location_id
        const reviewsUrl = `https://mybusinessaccountmanagement.googleapis.com/v1/${locationId}/reviews`
        
        const reviewsResponse = await fetch(reviewsUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        
        if (!reviewsResponse.ok) {
          const errorText = await reviewsResponse.text()
          merchantResult.errors.push(`Google API error: ${reviewsResponse.status} - ${errorText}`)
          results.push(merchantResult)
          continue
        }
        
        const reviewsData: GoogleReviewsResponse = await reviewsResponse.json()
        
        if (!reviewsData.reviews || reviewsData.reviews.length === 0) {
          results.push(merchantResult)
          continue
        }
        
        // Process each review
        for (const review of reviewsData.reviews) {
          const reviewId = review.reviewId || review.name.split("/").pop()
          const starRating = STAR_RATING_MAP[review.starRating] || 5
          
          // Check if review already exists
          const { data: existingReview } = await supabase
            .from("google_reviews")
            .select("id, sms_sent")
            .eq("merchant_id", merchant.id)
            .eq("review_id", reviewId)
            .single()
          
          if (existingReview) {
            // Review already exists, skip
            continue
          }
          
          // Insert new review
          const { error: insertError } = await supabase.from("google_reviews").insert({
            merchant_id: merchant.id,
            review_id: reviewId,
            reviewer_name: review.reviewer?.displayName || "Anonymous",
            reviewer_photo_url: review.reviewer?.profilePhotoUrl,
            star_rating: starRating,
            comment: review.comment,
            review_reply: review.reviewReply?.comment,
            review_reply_at: review.reviewReply?.updateTime,
            create_time: review.createTime,
            update_time: review.updateTime,
          })
          
          if (insertError) {
            merchantResult.errors.push(`Failed to insert review: ${insertError.message}`)
            continue
          }
          
          merchantResult.newReviews++
          
          // Process reviews based on star rating
          if (starRating <= 2) {
            // RECOVERY workflow: 1-2 star reviews trigger immediate SMS alert
            try {
              await triggerNegativeReviewSMS(merchant.id, merchant.business_name, review, starRating)
              
              // Mark as processed with RECOVERY workflow
              await supabase.from("google_reviews").update({
                sms_sent: true,
                sms_sent_at: new Date().toISOString(),
                processed: true,
                processed_at: new Date().toISOString(),
                workflow_type: "RECOVERY",
              }).eq("merchant_id", merchant.id).eq("review_id", reviewId)
            } catch (smsError) {
              merchantResult.errors.push(`SMS failed: ${smsError instanceof Error ? smsError.message : "Unknown error"}`)
            }
          } else if (starRating === 3) {
            // 3-star reviews: SMS alert but mark as NEUTRAL workflow
            try {
              await triggerNegativeReviewSMS(merchant.id, merchant.business_name, review, starRating)
              
              await supabase.from("google_reviews").update({
                sms_sent: true,
                sms_sent_at: new Date().toISOString(),
                processed: true,
                processed_at: new Date().toISOString(),
                workflow_type: "NEUTRAL",
              }).eq("merchant_id", merchant.id).eq("review_id", reviewId)
            } catch (smsError) {
              merchantResult.errors.push(`SMS failed: ${smsError instanceof Error ? smsError.message : "Unknown error"}`)
            }
          } else if (starRating >= 4) {
            // REWARD workflow: 4-5 star reviews marked for future reward automation
            await supabase.from("google_reviews").update({
              processed: true,
              processed_at: new Date().toISOString(),
              workflow_type: starRating === 5 ? "REWARD_5STAR" : "REWARD_4STAR",
            }).eq("merchant_id", merchant.id).eq("review_id", reviewId)
          }
        }
        
        // Update last fetch timestamp
        await supabase.from("merchants").update({
          last_review_fetch_at: new Date().toISOString(),
        }).eq("id", merchant.id)
        
      } catch (error) {
        merchantResult.errors.push(error instanceof Error ? error.message : "Unknown error")
      }
      
      results.push(merchantResult)
    }
    
    const totalNewReviews = results.reduce((sum, r) => sum + r.newReviews, 0)
    const merchantsWithErrors = results.filter(r => r.errors.length > 0).length
    
    return NextResponse.json({
      success: true,
      synced: merchants.length,
      totalNewReviews,
      merchantsWithErrors,
      results,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error("[v0] Review sync cron failed:", error)
    return NextResponse.json({ 
      error: "Cron job failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}

/**
 * Trigger SMS notification for negative review
 */
async function triggerNegativeReviewSMS(
  merchantId: string, 
  businessName: string,
  review: GoogleReview, 
  starRating: number
): Promise<void> {
  const didwwApiKey = process.env.DIDWW_API_KEY
  const didwwFromNumber = process.env.DIDWW_FROM_NUMBER
  
  if (!didwwApiKey || !didwwFromNumber) {
    console.log("[v0] DIDWW not configured, skipping SMS")
    return
  }
  
  const supabase = getServiceClient()
  
  // Get merchant's phone number
  const { data: merchant } = await supabase
    .from("merchants")
    .select("contact_phone, google_phone")
    .eq("id", merchantId)
    .single()
  
  const phoneNumber = merchant?.contact_phone || merchant?.google_phone
  
  if (!phoneNumber) {
    console.log("[v0] No phone number for merchant, skipping SMS")
    return
  }
  
  // Compose SMS message
  const reviewerName = review.reviewer?.displayName || "A customer"
  const message = `VLYR Alert: ${reviewerName} left a ${starRating}-star review for ${businessName}. ` +
    `"${review.comment?.substring(0, 100) || 'No comment'}"... ` +
    `Respond now to protect your reputation.`
  
  // Send via DIDWW API
  const response = await fetch("https://api.didww.com/v3/sms_outbound", {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.api+json",
      "Api-Key": didwwApiKey,
    },
    body: JSON.stringify({
      data: {
        type: "sms_outbound",
        attributes: {
          from: didwwFromNumber,
          to: phoneNumber,
          text: message,
        },
      },
    }),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DIDWW API error: ${response.status} - ${errorText}`)
  }
  
  console.log(`[v0] SMS sent to ${phoneNumber} for negative review`)
}
