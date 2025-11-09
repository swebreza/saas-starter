'use server'

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import { autoReelJobs } from '@/lib/db/schema'
import { getUser } from '@/lib/db/queries'
import { resolveResultPath } from '@/lib/video-renderer'

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

  if (job.status !== 'completed') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'JOB_NOT_READY',
          message: 'Render in progress. Try again once the job completes.',
        },
      },
      { status: 409 }
    )
  }

  const filePath = resolveResultPath(job.id)

  try {
    const stats = await stat(filePath)
    const stream = createReadStream(filePath)

    return new NextResponse(Readable.toWeb(stream), {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `attachment; filename="auto-reel-${job.id}.mp4"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message:
            error instanceof Error ? error.message : 'Rendered file missing.',
        },
      },
      { status: 404 }
    )
  }
}

