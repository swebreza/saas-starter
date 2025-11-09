import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { env } from 'node:process'

export type AutoReelSegment = {
  label: string
  startSeconds: number
  endSeconds: number
  hook: string
  overlayText?: string
  caption?: string
  callToAction?: string
}

export type AutoReelPlan = {
  aspectRatio: '9:16' | '1:1'
  tone: string
  segments: AutoReelSegment[]
  captions?: string[]
}

const DEFAULT_TEMP_DIR = path.join(process.cwd(), 'temp', 'auto-reels')

export function resolveTempDir(): string {
  const configured = env.AUTO_REEL_TEMP_DIR?.trim()
  return configured && configured.length > 0 ? configured : DEFAULT_TEMP_DIR
}

export function resolveJobDir(jobId: number): string {
  return path.join(resolveTempDir(), String(jobId))
}

export function resolveSourcePath(jobId: number): string {
  return path.join(resolveJobDir(jobId), 'source.mp4')
}

export function resolveSegmentPath(jobId: number, index: number): string {
  return path.join(resolveJobDir(jobId), `segment-${index + 1}.mp4`)
}

export function resolveResultPath(jobId: number): string {
  return path.join(resolveJobDir(jobId), 'result.mp4')
}

export async function ensureJobDir(jobId: number) {
  await fsp.mkdir(resolveJobDir(jobId), { recursive: true })
}

export async function ensureTempRoot() {
  await fsp.mkdir(resolveTempDir(), { recursive: true })
}

export function jobResultDownloadPath(jobId: number): string {
  return `/api/video/render-shorts/${jobId}/download`
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fsp.access(filePath)
    return true
  } catch {
    return false
  }
}

export function sanitizeOverlayText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/\n/g, '\\n')
    .replace(/'/g, "\\'")
}

export function getFontPath(): string | null {
  const configured = env.AUTO_REEL_FONT_PATH?.trim()
  if (configured && fs.existsSync(configured)) {
    return configured
  }
  const fallback = path.join(process.cwd(), 'public', 'fonts', 'Inter-SemiBold.ttf')
  return fs.existsSync(fallback) ? fallback : null
}
