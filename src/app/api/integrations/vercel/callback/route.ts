import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptString } from '@/lib/crypto'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // Contains org_id and site_id

    if (!code) {
      return NextResponse.redirect(new URL('/connect/vercel?error=no_code', req.url))
    }

    // Parse state (format: orgId:siteId or JSON)
    let orgId: string | undefined
    let siteId: string | undefined

    if (state) {
      try {
        const parsed = JSON.parse(decodeURIComponent(state))
        orgId = parsed.org_id
        siteId = parsed.site_id
      } catch {
        const [org, site] = state.split(':')
        orgId = org
        siteId = site
      }
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.VERCEL_CLIENT_ID!,
        client_secret: process.env.VERCEL_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.VERCEL_REDIRECT_URI!,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('[Vercel OAuth] Token exchange failed:', error)
      return NextResponse.redirect(new URL('/connect/vercel?error=token_exchange_failed', req.url))
    }

    const tokenData = await tokenResponse.json()
    const { access_token, user_id, team_id } = tokenData

    if (!access_token) {
      return NextResponse.redirect(new URL('/connect/vercel?error=no_access_token', req.url))
    }

    // Encrypt and store the access token
    const accessTokenEnc = encryptString(access_token)

    const connectionData: any = {
      org_id: orgId || null,
      site_id: siteId || null,
      provider: 'vercel',
      access_token_enc: accessTokenEnc,
      meta: {
        user_id,
        team_id,
        connected_at: new Date().toISOString(),
      },
    }

    // Store in oauth_connections table
    const { error: dbError } = await supabaseAdmin
      .from('oauth_connections')
      .upsert(connectionData, {
        onConflict: 'org_id,site_id,provider',
      })

    if (dbError) {
      console.error('[Vercel OAuth] DB error:', dbError)
      return NextResponse.redirect(new URL('/connect/vercel?error=db_error', req.url))
    }

    // Redirect to success page or dashboard
    const redirectUrl = orgId && siteId
      ? `/dashboard?connected=vercel&org_id=${orgId}&site_id=${siteId}`
      : '/dashboard?connected=vercel'

    return NextResponse.redirect(new URL(redirectUrl, req.url))
  } catch (err: any) {
    console.error('[Vercel OAuth] Callback error:', err)
    return NextResponse.redirect(new URL('/connect/vercel?error=callback_failed', req.url))
  }
}
