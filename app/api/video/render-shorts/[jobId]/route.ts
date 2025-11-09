'use server'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import { autoReelJobs, type AutoReelJob } from '@/lib/db/schema'
import { getUser } from '@/lib/db/queries'

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

export async function GET(
  request: Request,
  context: { params: { jobId: string } }
) {
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

  const jobId = Number.parseInt(context.params.jobId, 10)
  if (!Number.isFinite(jobId)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Invalid job id.' },
      },
      { status: 400 }
    )
  }

  const [job] = await db
    .select()
    .from(autoReelJobs)
    .where(eq(autoReelJobs.id, jobId))

  if (!job || job.userId !== user.id) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job not found.' },
      },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    data: serializeJob(job),
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


