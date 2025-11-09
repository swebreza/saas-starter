import { NextResponse } from 'next/server'

import {
  deleteCanvaSession,
  getCanvaSession,
  isSessionActive,
  refreshAccessToken,
  upsertCanvaSession,
} from '@/lib/canva/oauth'
import { getUser } from '@/lib/db/queries'

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const session = await getCanvaSession(user.id)
  if (!session) {
    return NextResponse.json({
      success: true,
      data: { connected: false },
    })
  }

  if (!isSessionActive(session)) {
    if (!session.refreshToken) {
      await deleteCanvaSession(user.id)
      return NextResponse.json({
        success: true,
        data: { connected: false },
      })
    }

    try {
      const token = await refreshAccessToken(session.refreshToken)
      await upsertCanvaSession(user.id, token)
      const refreshed = await getCanvaSession(user.id)
      return NextResponse.json({
        success: true,
        data: {
          connected: Boolean(refreshed),
          expiresAt: refreshed?.expiresAt.toISOString() ?? null,
        },
      })
    } catch (error) {
      console.error('Failed to refresh Canva session', error)
      await deleteCanvaSession(user.id)
      return NextResponse.json({
        success: true,
        data: { connected: false },
      })
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      connected: true,
      expiresAt: session.expiresAt.toISOString(),
    },
  })
}

