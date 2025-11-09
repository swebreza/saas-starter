import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

import { exchangeCodeForToken, upsertCanvaSession } from '@/lib/canva/oauth'
import { getUser } from '@/lib/db/queries'
import { FEATURE_KEYS, logFeatureUsage } from '@/lib/limits'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const stateCookie = cookies().get('canva_oauth_state')?.value
  const returnPath =
    cookies().get('canva_return_path')?.value ?? '/studio/storyboard'

  const cleanup = () => {
    const response = NextResponse.redirect(returnPath)
    response.cookies.delete('canva_oauth_state')
    response.cookies.delete('canva_return_path')
    return response
  }

  if (error) {
    console.error('Canva OAuth error:', error)
    return cleanup()
  }

  if (!code || !state || !stateCookie || state !== stateCookie) {
    console.error('Canva OAuth state mismatch or missing code.')
    return cleanup()
  }

  const user = await getUser()
  if (!user) {
    return cleanup()
  }

  try {
    const token = await exchangeCodeForToken(code)
    await upsertCanvaSession(user.id, token)
    await logFeatureUsage(user, FEATURE_KEYS.CANVA_CONNECT, {
      detail: 'connected',
    })
  } catch (err) {
    console.error('Failed to exchange Canva OAuth code', err)
  }

  return cleanup()
}

