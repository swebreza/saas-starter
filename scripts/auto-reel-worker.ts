import 'dotenv/config'

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as wait } from 'node:timers/promises'

import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import ytdl from 'ytdl-core'

import { db } from '@/lib/db/drizzle'
import { autoReelJobs, type AutoReelJob } from '@/lib/db/schema'
import {
  AutoReelPlan,
  ensureJobDir,
  ensureTempRoot,
  fileExists,
  getFontPath,
  jobResultDownloadPath,
  resolveResultPath,
  resolveSegmentPath,
  resolveSourcePath,
  sanitizeOverlayText,
} from '@/lib/video-renderer'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

type RendererPlanConfig = {
  rendererPlan?: AutoReelPlan
}

const POLL_INTERVAL =
  Number.parseInt(process.env.AUTO_REEL_POLL_INTERVAL_MS ?? '5000', 10) || 5000
const MAX_RETRIES =
  Number.parseInt(process.env.AUTO_REEL_MAX_RETRIES ?? '2', 10) || 2
const WORKER_ID = process.env.AUTO_REEL_WORKER_ID ?? `auto-reel-worker-${process.pid}`

async function main() {
  await ensureTempRoot()

  while (true) {
    const job = await claimNextJob()
    if (!job) {
      await wait(POLL_INTERVAL)
      continue
    }

    try {
      await processJob(job)
    } catch (error) {
      await markJobFailed(job, error)
    }
  }
}

async function claimNextJob(): Promise<AutoReelJob | null> {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(autoReelJobs)
      .where(
        and(
          inArray(autoReelJobs.status, ['queued', 'retry']),
          isNull(autoReelJobs.workerId)
        )
      )
      .orderBy(asc(autoReelJobs.createdAt))
      .limit(1)

    if (!job) {
      return null
    }

    const [lockedJob] = await tx
      .update(autoReelJobs)
      .set({
        status: 'rendering',
        workerId: WORKER_ID,
        progress: 5,
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(autoReelJobs.id, job.id))
      .returning()

    return lockedJob ?? null
  })
}

async function processJob(job: AutoReelJob) {
  const config = (job.config ?? {}) as RendererPlanConfig
  const plan = config.rendererPlan

  if (!plan || !Array.isArray(plan.segments) || plan.segments.length === 0) {
    throw new Error('Renderer plan missing or empty. Re-run generation.')
  }

  await ensureJobDir(job.id)
  const sourcePath = resolveSourcePath(job.id)
  const metadata =
    job.metadata && typeof job.metadata === 'object'
      ? { ...(job.metadata as Record<string, unknown>) }
      : ({} as Record<string, unknown>)

  if (!(await fileExists(sourcePath))) {
    await downloadYoutubeVideo(job.youtubeUrl, sourcePath)
  }

  const segmentPaths: string[] = []
  const fontPath = getFontPath()

  for (const [index, segment] of plan.segments.entries()) {
    const segmentPath = resolveSegmentPath(job.id, index)
    await renderSegment({
      sourcePath,
      outputPath: segmentPath,
      segment,
      fontPath,
    })
    segmentPaths.push(segmentPath)

    const progress =
      10 + Math.round(((index + 1) / plan.segments.length) * 70)
    await updateJobProgress(job.id, progress)
  }

  const resultPath = resolveResultPath(job.id)
  await concatenateSegments(segmentPaths, resultPath)

  metadata.localPath = resultPath

  const [finalJob] = await db
    .update(autoReelJobs)
    .set({
      status: 'completed',
      progress: 100,
      downloadUrls: [jobResultDownloadPath(job.id)],
      workerId: null,
      completedAt: new Date(),
      updatedAt: new Date(),
      metadata,
    })
    .where(eq(autoReelJobs.id, job.id))
    .returning()

  await cleanupIntermediateFiles(segmentPaths)

  if (!finalJob) {
    throw new Error('Failed to update job after rendering.')
  }
}

async function markJobFailed(job: AutoReelJob, error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Auto reel worker failed.'

  const newRetryCount = (job.retryCount ?? 0) + 1
  const shouldRetry = newRetryCount <= MAX_RETRIES

  await db
    .update(autoReelJobs)
    .set({
      status: shouldRetry ? 'retry' : 'failed',
      workerId: null,
      progress: shouldRetry ? Math.min(job.progress, 25) : job.progress,
      error: message,
      retryCount: newRetryCount,
      lastErrorAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(autoReelJobs.id, job.id))
}

async function updateJobProgress(jobId: number, progress: number) {
  await db
    .update(autoReelJobs)
    .set({
      progress: Math.min(95, Math.max(10, progress)),
      updatedAt: new Date(),
    })
    .where(eq(autoReelJobs.id, jobId))
}

async function downloadYoutubeVideo(url: string, outputPath: string) {
  await new Promise<void>((resolve, reject) => {
    const stream = ytdl(url, {
      quality: 'highest',
      filter: 'audioandvideo',
    })

    stream.on('error', reject)

    const output = fs.createWriteStream(outputPath)
    output.on('error', reject)
    output.on('finish', () => resolve())

    stream.pipe(output)
  })
}

async function renderSegment(options: {
  sourcePath: string
  outputPath: string
  segment: AutoReelPlan['segments'][number]
  fontPath: string | null
}) {
  const { sourcePath, outputPath, segment, fontPath } = options

  const start = Math.max(0, Math.round(segment.startSeconds))
  const duration = Math.max(
    5,
    Math.round(segment.endSeconds - segment.startSeconds)
  )

  const filters: string[] = [
    'scale=1080:1920:force_original_aspect_ratio=decrease',
    'pad=1080:1920:(1080-iw)/2:(1920-ih)/2',
    'fps=30',
    'format=yuv420p',
  ]

  const overlayText = segment.overlayText ?? segment.hook
  if (overlayText) {
    const fontDirective = fontPath
      ? `fontfile='${fontPath.replace(/\\/g, '\\\\')}'`
      : "font='Arial'"
    filters.push(
      `drawtext=${fontDirective}:text='${sanitizeOverlayText(
        overlayText
      )}':fontcolor=white:fontsize=64:borderw=8:bordercolor=#000000AA:x=(w-text_w)/2:y=h*0.75`
    )
  }

  await new Promise<void>((resolve, reject) => {
    ffmpeg(sourcePath)
      .setStartTime(start)
      .setDuration(duration)
      .videoFilters(filters)
      .audioCodec('aac')
      .videoCodec('libx264')
      .outputOptions(['-preset', 'veryfast', '-crf', '20'])
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath)
  })
}

async function concatenateSegments(segmentPaths: string[], outputPath: string) {
  if (segmentPaths.length === 1) {
    await fsp.copyFile(segmentPaths[0], outputPath)
    return
  }

  await new Promise<void>((resolve, reject) => {
    const command = ffmpeg()
    segmentPaths.forEach((segmentPath) => command.addInput(segmentPath))

    const inputs: string[] = []
    for (let index = 0; index < segmentPaths.length; index += 1) {
      inputs.push(`${index}:v:0`)
      inputs.push(`${index}:a:0`)
    }

    command
      .complexFilter([
        {
          filter: 'concat',
          options: { n: segmentPaths.length, v: 1, a: 1 },
          inputs,
          outputs: ['v', 'a'],
        },
      ])
      .outputOptions(['-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-c:a', 'aac'])
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath)
  })
}

async function cleanupIntermediateFiles(segmentPaths: string[]) {
  for (const segmentPath of segmentPaths) {
    await safeUnlink(segmentPath)
  }
}

async function safeUnlink(filePath: string) {
  try {
    await fsp.unlink(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`auto-reel-worker: failed to remove temp file ${filePath}`, error)
    }
  }
}

void main().catch((error) => {
  console.error('auto-reel-worker crashed:', error)
  process.exitCode = 1
})

