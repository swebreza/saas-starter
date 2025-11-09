import crypto from 'crypto'

import { db } from '@/lib/db/drizzle'
import {
  canvaSessions,
  type CanvaSession,
  type NewCanvaSession,
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const CANVA_AUTH_BASE = process.env.CANVA_AUTH_BASE_URL?.trim()
  ? process.env.CANVA_AUTH_BASE_URL.trim()
  : 'https://www.canva.com/api/oauth'

const TOKEN_ENDPOINT = `${CANVA_AUTH_BASE}/token`

type CanvaTokenResponse = {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
  scope?: string
}

const CANVA_APP_ID = process.env.NEXT_PUBLIC_CANVA_APP_ID
const CANVA_CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET
const CANVA_REDIRECT_URI = process.env.CANVA_REDIRECT_URI

if (!CANVA_APP_ID || !CANVA_CLIENT_SECRET || !CANVA_REDIRECT_URI) {
  console.warn(
    '[studio24] Canva OAuth environment variables are not fully configured. OAuth routes will fail until they are set.'
  )
}

export function createOAuthState(): string {
  return crypto.randomBytes(16).toString('hex')
}

function toExpiryDate(expiresIn: number) {
  const buffer = 60 * 1000
  return new Date(Date.now() + expiresIn * 1000 - buffer)
}

export async function exchangeCodeForToken(code: string) {
  if (!CANVA_APP_ID || !CANVA_CLIENT_SECRET || !CANVA_REDIRECT_URI) {
    throw new Error('Canva OAuth is not configured')
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: CANVA_REDIRECT_URI,
  })

  return requestToken(body)
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<CanvaTokenResponse> {
  if (!CANVA_APP_ID || !CANVA_CLIENT_SECRET) {
    throw new Error('Canva OAuth is not configured')
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  return requestToken(body)
}

async function requestToken(body: URLSearchParams) {
  if (!CANVA_APP_ID || !CANVA_CLIENT_SECRET) {
    throw new Error('Missing Canva client credentials')
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${CANVA_APP_ID}:${CANVA_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body,
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(
      `Failed to exchange Canva token (${response.status}): ${payload}`
    )
  }

  const json = (await response.json()) as CanvaTokenResponse

  if (!json.access_token || !json.expires_in) {
    throw new Error('Invalid token payload from Canva')
  }

  return json
}

export async function upsertCanvaSession(
  userId: number,
  token: CanvaTokenResponse
) {
  const expiresAt = toExpiryDate(token.expires_in)

  const newSession: NewCanvaSession = {
    userId,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    scope: token.scope ?? null,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const existing = await db
    .select()
    .from(canvaSessions)
    .where(eq(canvaSessions.userId, userId))
    .limit(1)

  if (existing.length) {
    await db
      .update(canvaSessions)
      .set({
        accessToken: newSession.accessToken,
        refreshToken: newSession.refreshToken,
        scope: newSession.scope,
        expiresAt: newSession.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(canvaSessions.userId, userId))
  } else {
    await db.insert(canvaSessions).values(newSession)
  }
}

export async function getCanvaSession(userId: number): Promise<CanvaSession | null> {
  const session = await db
    .select()
    .from(canvaSessions)
    .where(eq(canvaSessions.userId, userId))
    .limit(1)

  if (!session.length) {
    return null
  }

  return session[0]
}

export async function deleteCanvaSession(userId: number) {
  await db.delete(canvaSessions).where(eq(canvaSessions.userId, userId))
}

export function isSessionActive(session: CanvaSession | null): boolean {
  if (!session) return false
  return session.expiresAt.getTime() > Date.now()
}

