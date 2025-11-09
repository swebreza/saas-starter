import { and, eq, gte, sql } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { usageLogs, type User } from '@/lib/db/schema'

const FREE_DAILY_LIMIT = 10
const DAILY_WINDOW_HOURS = 24

export const FEATURE_KEYS = {
  TEXT: 'text',
  VIDEO_REPURPOSE: 'video_repurpose',
  STORYBOARD: 'storyboard',
  AUTO_REEL: 'auto_reel',
  CANVA_CONNECT: 'canva_connect',
  CANVA_SAVE: 'canva_save',
} as const

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS]

export type LimitSnapshot = {
  plan: User['plan']
  used: number
  limit: number | null
  remaining: number | null
}

type LimitReached = Error & { code: 'LIMIT_REACHED'; limit: number }

function createLimitReachedError(limit: number): LimitReached {
  const error = new Error('Daily limit reached for this feature.')
  ;(error as LimitReached).code = 'LIMIT_REACHED'
  ;(error as LimitReached).limit = limit
  return error as LimitReached
}

export function isLimitReachedError(error: unknown): error is LimitReached {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'LIMIT_REACHED'
  )
}

function getWindowStart() {
  return new Date(Date.now() - DAILY_WINDOW_HOURS * 60 * 60 * 1000)
}

export async function getUsageSnapshot(
  user: User,
  feature: FeatureKey
): Promise<LimitSnapshot> {
  if (user.plan === 'pro') {
    return {
      plan: user.plan,
      used: 0,
      limit: null,
      remaining: null,
    }
  }

  const [{ count }] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.userId, user.id),
        eq(usageLogs.feature, feature),
        gte(usageLogs.createdAt, getWindowStart())
      )
    )

  const used = Number(count ?? 0)
  const remaining = Math.max(FREE_DAILY_LIMIT - used, 0)

  return {
    plan: user.plan,
    used,
    limit: FREE_DAILY_LIMIT,
    remaining,
  }
}

export async function assertWithinLimits(
  user: User,
  feature: FeatureKey
): Promise<LimitSnapshot> {
  const snapshot = await getUsageSnapshot(user, feature)

  if (snapshot.limit !== null && snapshot.remaining !== null) {
    if (snapshot.remaining <= 0) {
      throw createLimitReachedError(snapshot.limit)
    }
  }

  return snapshot
}

export async function logFeatureUsage(
  user: User,
  feature: FeatureKey,
  metadata?: Record<string, unknown>
) {
  await db.insert(usageLogs).values({
    userId: user.id,
    feature,
    metadata,
  })
}
