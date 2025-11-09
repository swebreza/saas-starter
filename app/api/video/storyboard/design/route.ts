import { NextResponse } from 'next/server'

import { db } from '@/lib/db/drizzle'
import { canvaDesigns, type NewCanvaDesign } from '@/lib/db/schema'
import { getUser } from '@/lib/db/queries'
import { FEATURE_KEYS, logFeatureUsage } from '@/lib/limits'
import { eq, and } from 'drizzle-orm'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  if (user.plan !== 'pro') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BILLING_REQUIRED',
          message: 'Upgrade to Premium to save Canva designs.',
        },
      },
      { status: 402 }
    )
  }

  const body = (await request.json()) as {
    designId?: string
    format?: string
    storyboardInput?: unknown
  }

  if (!body.designId || !body.format) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'designId and format are required.',
        },
      },
      { status: 400 }
    )
  }

  const payload: NewCanvaDesign = {
    userId: user.id,
    designId: body.designId,
    format: body.format,
    storyboardInput:
      typeof body.storyboardInput === 'object'
        ? (body.storyboardInput as object)
        : null,
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const existing = await db
    .select()
    .from(canvaDesigns)
    .where(and(eq(canvaDesigns.userId, user.id), eq(canvaDesigns.designId, body.designId)))
    .limit(1)

  if (existing.length) {
    await db
      .update(canvaDesigns)
      .set({
        format: payload.format,
        storyboardInput: payload.storyboardInput,
        lastSyncedAt: payload.lastSyncedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(canvaDesigns.userId, user.id), eq(canvaDesigns.designId, body.designId)))
  } else {
    await db.insert(canvaDesigns).values(payload)
  }

  await logFeatureUsage(user, FEATURE_KEYS.CANVA_SAVE, {
    designId: body.designId,
  })

  return NextResponse.json({
    success: true,
    data: {
      designId: body.designId,
    },
  })
}

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const designs = await db
    .select()
    .from(canvaDesigns)
    .where(eq(canvaDesigns.userId, user.id))
    .orderBy(canvaDesigns.updatedAt)

  return NextResponse.json({
    success: true,
    data: designs.map((design) => ({
      id: design.id,
      designId: design.designId,
      format: design.format,
      lastSyncedAt: design.lastSyncedAt.toISOString(),
    })),
  })
}

