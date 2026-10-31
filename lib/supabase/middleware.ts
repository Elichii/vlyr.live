import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Helper to clear all Supabase auth cookies
  const clearAuthCookies = () => {
    // Get all cookies and clear any that look like Supabase auth cookies
    const allCookies = request.cookies.getAll()
    for (const cookie of allCookies) {
      if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
        supabaseResponse.cookies.delete(cookie.name)
      }
    }
  }

  // Get user and refresh session if needed
  // This is important to keep the session alive across page navigations
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      // If refresh token is not found or invalid, clear cookies explicitly
      if (error.code === 'refresh_token_not_found' || error.message?.includes('Refresh Token')) {
        await supabase.auth.signOut()
        clearAuthCookies()
        user = null
      } else {
        // Try to refresh the session for other errors
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          // Refresh failed, clear cookies explicitly
          await supabase.auth.signOut()
          clearAuthCookies()
          user = null
        } else {
          user = refreshData?.user ?? null
        }
      }
    } else {
      user = data.user
    }
  } catch {
    // Session is invalid, clear cookies and continue
    clearAuthCookies()
    user = null
  }

  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isBillingBlocked = request.nextUrl.pathname === '/dashboard/billing-blocked'

  // Protect /dashboard routes - redirect to login if not authenticated
  if (isDashboard && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // For authenticated users on dashboard routes (except billing-blocked),
  // check if their subscription is past_due and restrict access
  if (isDashboard && !isBillingBlocked && user) {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('subscription_status, business_name, google_ownership_verified, package_id, billing_cycle')
      .eq('id', user.id)
      .single()

    // Only businesses whose ownership Google has confirmed can use the
    // dashboard. Anyone else goes back to finish setup at the right step.
    const verified = merchant?.google_ownership_verified === true
    const hasBusiness = !!merchant?.business_name?.trim()
    if (!verified || !hasBusiness) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      url.search = ''
      url.searchParams.set('plan', merchant?.package_id || 'free')
      url.searchParams.set('cycle', merchant?.billing_cycle === 'annual' ? 'annual' : 'monthly')
      url.searchParams.set('step', verified ? 'business' : 'google-connect')
      url.searchParams.set('setup', 'required')
      return NextResponse.redirect(url)
    }

    if (merchant?.subscription_status === 'past_due') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/billing-blocked'
      return NextResponse.redirect(url)
    }
  }

  // If user is active and tries to access billing-blocked, send them to dashboard
  if (isBillingBlocked && user) {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    if (merchant?.subscription_status !== 'past_due') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from auth pages
  if (
    (request.nextUrl.pathname.startsWith('/auth/login') ||
     request.nextUrl.pathname.startsWith('/auth/sign-up')) &&
    user
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
