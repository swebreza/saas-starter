'use server'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import {
  autoReelJobs,
  type AutoReelJob,
  type NewAutoReelJob,
} from '@/lib/db/schema'
import { getUser } from '@/lib/db/queries'
import {
  FEATURE_KEYS,
  assertWithinLimits,
  logFeatureUsage,
} from '@/lib/limits'
import {
  autoReelRequestSchema,
  prepareAutoReelJob,
} from '@/lib/video/auto-reel'
type AutoReelJobResponse = {
  id: number
  status: AutoReelJob['status']
  progress: number
  youtubeUrl: string
  title?: string | null
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  downloadUrls?: string[]
  error?: string | null
  localPath?: string
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Sign in to render auto reels.' },
      },
      { status: 401 }
    )
  }

  if (user.plan !== 'pro') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BILLING_REQUIRED',
          message: 'Upgrade to Premium to generate auto reels.',
        },
      },
      { status: 402 }
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Invalid JSON payload.' },
      },
      { status: 400 }
    )
  }

  const parsed = autoReelRequestSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: parsed.error.issues[0]?.message ?? 'Invalid request.',
        },
      },
      { status: 400 }
    )
  }

  await assertWithinLimits(user, FEATURE_KEYS.AUTO_REEL)

  const prepared = await prepareAutoReelJob(parsed.data)

  const config: NewAutoReelJob['config'] = {
    request: {
      tone: parsed.data.tone,
      highlightCount: parsed.data.highlightCount,
      highlightDurationSeconds: parsed.data.highlightDurationSeconds,
      callToAction: parsed.data.callToAction,
    },
    plan: prepared.planRaw,
    rendererPlan: prepared.plan,
  }

  const newJob: NewAutoReelJob = {
    userId: user.id,
    youtubeUrl: parsed.data.youtubeUrl,
    title: prepared.title,
    config,
    status: 'queued',
    progress: 0,
    downloadUrls: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const [createdJob] = await db
    .insert(autoReelJobs)
    .values(newJob)
    .returning()

  await logFeatureUsage(user, FEATURE_KEYS.AUTO_REEL, {
    youtubeUrl: parsed.data.youtubeUrl,
  })

  return NextResponse.json({
    success: true,
    data: serializeJob(createdJob),
  })
}

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      },
      { status: 401 }
    )
  }

  const jobs = await db
    .select()
    .from(autoReelJobs)
    .where(eq(autoReelJobs.userId, user.id))
    .orderBy(autoReelJobs.createdAt)

  return NextResponse.json({
    success: true,
    data: jobs.map(serializeJob),
  })
}

function serializeJob(job: AutoReelJob): AutoReelJobResponse {
  const metadata =
    job.metadata && typeof job.metadata === 'object'
      ? (job.metadata as Record<string, unknown>)
      : null

  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    youtubeUrl: job.youtubeUrl,
    title: job.title,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt ? job.completedAt.toISOString() : null,
    downloadUrls: Array.isArray(job.downloadUrls)
      ? (job.downloadUrls as string[]).filter((url) => typeof url === 'string')
      : undefined,
    error: job.error,
    localPath:
      typeof metadata?.localPath === 'string'
        ? (metadata.localPath as string)
        : undefined,
  }
}

