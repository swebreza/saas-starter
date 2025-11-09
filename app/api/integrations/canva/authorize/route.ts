'use server'

import { NextResponse, type NextRequest } from 'next/server'

import { createOAuthState } from '@/lib/canva/oauth'
import { getUser } from '@/lib/db/queries'

const CANVA_APP_ID = process.env.NEXT_PUBLIC_CANVA_APP_ID
const CANVA_REDIRECT_URI = process.env.CANVA_REDIRECT_URI
const CANVA_SCOPES =
  process.env.CANVA_SCOPES ??
  'openid profile design:read design:write'
const CANVA_AUTH_BASE = process.env.CANVA_AUTH_BASE_URL?.trim()
  ? process.env.CANVA_AUTH_BASE_URL.trim()
  : 'https://www.canva.com/api/oauth'
const AUTHORIZE_ENDPOINT = `${CANVA_AUTH_BASE}/authorize`

export async function GET(request: NextRequest) {
  if (!CANVA_APP_ID || !CANVA_REDIRECT_URI) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'CANVA_NOT_CONFIGURED', message: 'Canva OAuth is not configured.' },
      },
      { status: 500 }
    )
  }

  const user = await getUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in to connect Canva.' } },
      { status: 401 }
    )
  }

  if (user.plan !== 'pro') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BILLING_REQUIRED',
          message: 'Upgrade to Premium to connect Canva.',
        },
      },
      { status: 402 }
    )
  }

  const state = createOAuthState()
  const url = new URL(AUTHORIZE_ENDPOINT)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', CANVA_APP_ID)
  url.searchParams.set('redirect_uri', CANVA_REDIRECT_URI)
  url.searchParams.set('scope', CANVA_SCOPES)
  url.searchParams.set('state', state)

  const response = NextResponse.redirect(url.toString())
  response.cookies.set('canva_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 5 * 60,
    path: '/',
  })

  const returnTo = request.nextUrl.searchParams.get('return_to')
  if (returnTo) {
    response.cookies.set('canva_return_path', returnTo, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 5 * 60,
      path: '/',
    })
  }

  return response
}

