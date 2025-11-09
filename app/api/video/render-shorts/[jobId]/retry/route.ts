'use server'

import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import { autoReelJobs } from '@/lib/db/schema'
import { getUser } from '@/lib/db/queries'

export async function POST(
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

  if (!['failed', 'completed', 'retry'].includes(job.status)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'JOB_IN_PROGRESS',
          message: 'Job is currently rendering. Please wait until it finishes.',
        },
      },
      { status: 400 }
    )
  }

  const [updated] = await db
    .update(autoReelJobs)
    .set({
      status: 'queued',
      workerId: null,
      progress: 0,
      error: null,
      downloadUrls: [],
      metadata: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(autoReelJobs.id, job.id),
        inArray(autoReelJobs.status, ['failed', 'completed', 'retry'])
      )
    )
    .returning()

  if (!updated) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RETRY_FAILED',
          message: 'Unable to reset the job. Please try again.',
        },
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      status: updated.status,
      progress: updated.progress,
    },
  })
}

