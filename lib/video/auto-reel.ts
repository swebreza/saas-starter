import { z } from 'zod'

import {
  AutoReelPlanResponse,
  generateAutoReelPlan,
  type AutoReelPlanInput,
} from '@/lib/gemini'
import type { AutoReelPlan } from '@/lib/video-renderer'

const MAX_HIGHLIGHT_COUNT = 6
const MAX_HIGHLIGHT_DURATION = 45

export const autoReelRequestSchema = z.object({
  youtubeUrl: z
    .string()
    .url('Provide a valid YouTube URL.')
    .refine(
      (url) => url.includes('youtube.com') || url.includes('youtu.be'),
      'Only YouTube URLs are supported for Auto Reels.'
    ),
  highlightCount: z
    .coerce.number()
    .int()
    .min(1)
    .max(MAX_HIGHLIGHT_COUNT)
    .default(3),
  highlightDurationSeconds: z
    .coerce.number()
    .int()
    .min(5)
    .max(MAX_HIGHLIGHT_DURATION)
    .default(15),
  tone: z.string().min(2).max(32).default('bold'),
  callToAction: z.string().max(180).optional(),
  transcript: z.string().optional(),
  title: z.string().optional(),
})

export type AutoReelRequest = z.infer<typeof autoReelRequestSchema>

export type PreparedAutoReelJob = {
  title?: string | null
  plan: AutoReelPlan
  planRaw: AutoReelPlanResponse
}

export async function prepareAutoReelJob(
  input: AutoReelRequest
): Promise<PreparedAutoReelJob> {
  const metadata = await resolveYoutubeMetadata(input.youtubeUrl).catch(() => ({
    title: input.title ?? null,
  }))

  const planInput: AutoReelPlanInput = {
    youtubeUrl: input.youtubeUrl,
    transcript: input.transcript,
    tone: input.tone,
    highlightCount: input.highlightCount,
    highlightDurationSeconds: input.highlightDurationSeconds,
    callToAction: input.callToAction,
    title: metadata?.title ?? input.title ?? null,
  }

  const planRaw = await generateAutoReelPlan(planInput)

  const plan: AutoReelPlan = {
    aspectRatio: planRaw.aspectRatio,
    tone: input.tone,
    segments: planRaw.segments.map((segment) => ({
      label: segment.label,
      startSeconds: segment.startSeconds,
      endSeconds: segment.endSeconds,
      hook: segment.hook,
      overlayText: segment.overlayText ?? segment.hook,
      caption: segment.caption,
      callToAction: segment.callToAction ?? input.callToAction,
    })),
    captions: planRaw.captions,
  }

  return {
    title: metadata?.title ?? input.title ?? null,
    plan,
    planRaw,
  }
}

async function resolveYoutubeMetadata(url: string): Promise<{ title: string }> {
  try {
    const response = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(url)}`
    )
    if (!response.ok) {
      throw new Error('Failed to resolve metadata')
    }
    const json = (await response.json()) as { title?: string }
    if (json?.title && json.title.trim().length > 0) {
      return { title: json.title.trim() }
    }
    throw new Error('No title returned')
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Unable to fetch video metadata'
    )
  }
}

