'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  ArrowRight,
  Download,
  Loader2,
  RefreshCw,
  Youtube,
  RotateCw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type ApiUser = {
  id: number
  name: string | null
  email: string
  role: string
  plan: 'free' | 'pro'
} | null

type AutoReelJob = {
  id: number
  status: 'queued' | 'rendering' | 'completed' | 'failed' | 'retry'
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

type AutoReelJobsResponse =
  | {
      success: true
      data: AutoReelJob[]
    }
  | {
      success: false
      error: { code: string; message: string }
    }

type AutoReelJobResponse =
  | {
      success: true
      data: AutoReelJob
    }
  | {
      success: false
      error: { code: string; message: string }
    }

export default function AutoReelsStudioPage() {
  const { data: userResponse } = useSWR<ApiUser>('/api/user', fetcher)
  const { data: jobsResponse, mutate } = useSWR<AutoReelJobsResponse>(
    '/api/video/render-shorts',
    fetcher,
    {
      refreshInterval: 10_000,
    }
  )

  const user = userResponse
  const isPro = user?.plan === 'pro'

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [highlightCount, setHighlightCount] = useState(3)
  const [highlightDuration, setHighlightDuration] = useState(15)
  const [tone, setTone] = useState('bold')
  const [callToAction, setCallToAction] = useState('Subscribe for more insights.')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryingJobId, setRetryingJobId] = useState<number | null>(null)

  const jobs = jobsResponse?.success ? jobsResponse.data : []

  const pendingJobIds = useMemo(
    () =>
      jobs
        .filter(
          (job) =>
            job.status === 'queued' ||
            job.status === 'rendering' ||
            job.status === 'retry'
        )
        .map((job) => job.id),
    [jobs]
  )

  useEffect(() => {
    if (!pendingJobIds.length) return

    const interval = setInterval(async () => {
      await Promise.all(
        pendingJobIds.map((id) =>
          fetch(`/api/video/render-shorts/${id}`)
            .then((res) => res.json() as Promise<AutoReelJobResponse>)
            .then((response) => {
              if (response.success) {
                mutate((prev) => {
                  if (!prev?.success) return prev
                  return {
                    success: true,
                    data: prev.data.map((job) =>
                      job.id === response.data.id ? response.data : job
                    ),
                  }
                }, false)
              }
            })
            .catch((error) => {
              console.error('Failed to refresh job status', error)
            })
        )
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [pendingJobIds, mutate])

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!isPro) {
        setErrorMessage('Upgrade to Premium to generate auto reels.')
        return
      }
      if (isSubmitting) return

      setIsSubmitting(true)
      setErrorMessage(null)

      try {
        const response = await fetch('/api/video/render-shorts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            youtubeUrl,
            highlightCount,
            highlightDurationSeconds: highlightDuration,
            tone,
            callToAction,
          }),
        })

        const data = (await response.json()) as AutoReelJobResponse

        if (!response.ok || !data.success) {
          const message =
            data?.success === false
              ? data.error.message
              : 'Something went wrong while queuing the render.'
          throw new Error(message)
        }

        setYoutubeUrl('')
        mutate()
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to queue the auto reel. Please try again.'
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [youtubeUrl, highlightCount, highlightDuration, tone, callToAction, isPro, isSubmitting, mutate]
  )

  const renderJobStatus = (job: AutoReelJob) => {
    switch (job.status) {
      case 'completed':
        return (
          <span className='inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600'>
            Ready to download
          </span>
        )
      case 'failed':
        return (
          <span className='inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600'>
            Failed — retry
          </span>
        )
      case 'rendering':
        return (
          <span className='inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600'>
            Rendering…
          </span>
        )
      case 'retry':
        return (
          <span className='inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600'>
            Retrying…
          </span>
        )
      default:
        return (
          <span className='inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600'>
            Queued
          </span>
        )
    }
  }

  const renderDownloadButton = (job: AutoReelJob) => {
    if (job.status !== 'completed') return null

    const urls = job.downloadUrls?.filter((url) => url.length > 0) ?? []

    if (urls.length === 0) {
      return (
        <span className='text-xs text-red-500'>
          Result file missing. Retry the job.
        </span>
      )
    }

    return urls.map((url, index) => (
      <Button
        key={`${job.id}-${index}`}
        variant='default'
        size='sm'
        className='rounded-full'
        asChild
      >
        <a href={url} target='_blank' rel='noopener noreferrer'>
          <Download className='mr-2 h-4 w-4' />
          Download reel {urls.length > 1 ? index + 1 : ''}
        </a>
      </Button>
    ))
  }

  const handleRetry = async (jobId: number) => {
    setRetryingJobId(jobId)
    try {
      const response = await fetch(`/api/video/render-shorts/${jobId}/retry`, {
        method: 'POST',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message =
          payload?.error?.message ?? 'Unable to retry the job. Please try again.'
        throw new Error(message)
      }
      await mutate()
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to retry the job. Please try again.'
      )
    } finally {
      setRetryingJobId(null)
    }
  }

  const renderRetryButton = (job: AutoReelJob) => {
    if (job.status !== 'failed' && job.status !== 'completed') return null

    return (
      <Button
        variant='outline'
        size='sm'
        className='rounded-full'
        disabled={retryingJobId === job.id}
        onClick={() => handleRetry(job.id)}
      >
        {retryingJobId === job.id ? (
          <span className='flex items-center gap-1'>
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
            Retrying…
          </span>
        ) : (
          <span className='flex items-center gap-1'>
            <RotateCw className='h-3.5 w-3.5' />
            Retry render
          </span>
        )}
      </Button>
    )
  }

  return (
    <div className='bg-gray-50 flex-1'>
      <section className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10'>
        <Card className='border border-gray-200 bg-white/80 backdrop-blur shadow-sm'>
          <CardHeader className='space-y-4'>
            <div className='flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-purple-600'>
              <span className='inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1'>
                <Youtube className='h-3.5 w-3.5' />
                Auto Reels Studio
              </span>
              <span className='inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-1 text-white'>
                Premium feature
              </span>
            </div>
            <CardTitle className='text-3xl font-semibold text-gray-900 sm:text-4xl'>
              Repurpose YouTube videos into ready-to-post reels.
            </CardTitle>
            <CardDescription className='text-base text-gray-600 sm:text-lg leading-relaxed max-w-3xl'>
              Drop a YouTube URL, choose how many highlights you want, and Studio 24 will stitch highlight clips with captions, overlays, and a downloadable MP4.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPro ? (
              <form className='space-y-8' onSubmit={handleSubmit}>
                <div className='space-y-2'>
                  <Label htmlFor='youtubeUrl'>YouTube URL</Label>
                  <Input
                    id='youtubeUrl'
                    placeholder='https://www.youtube.com/watch?v=...'
                    value={youtubeUrl}
                    onChange={(event) => setYoutubeUrl(event.target.value)}
                    required
                  />
                </div>
                <div className='grid gap-6 md:grid-cols-3'>
                  <div className='space-y-2'>
                    <Label htmlFor='highlightCount'>Highlight count</Label>
                    <Input
                      id='highlightCount'
                      type='number'
                      min={1}
                      max={6}
                      value={highlightCount}
                      onChange={(event) =>
                        setHighlightCount(Number(event.target.value))
                      }
                    />
                    <p className='text-xs text-gray-500'>
                      Studio 24 will find this many hooks in the video.
                    </p>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='highlightDuration'>
                      Seconds per highlight
                    </Label>
                    <Input
                      id='highlightDuration'
                      type='number'
                      min={5}
                      max={45}
                      value={highlightDuration}
                      onChange={(event) =>
                        setHighlightDuration(Number(event.target.value))
                      }
                    />
                    <p className='text-xs text-gray-500'>
                      Typical reels run 15–30 seconds each.
                    </p>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='tone'>Narrative tone</Label>
                    <Input
                      id='tone'
                      placeholder='bold, friendly, professional...'
                      value={tone}
                      onChange={(event) => setTone(event.target.value)}
                    />
                    <p className='text-xs text-gray-500'>
                      Guides Gemini when writing hooks and captions.
                    </p>
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='cta'>Call to action (optional)</Label>
                  <Input
                    id='cta'
                    placeholder='Tell viewers what to do after watching...'
                    value={callToAction}
                    onChange={(event) => setCallToAction(event.target.value)}
                  />
                </div>

                {errorMessage && (
                  <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700'>
                    {errorMessage}
                  </div>
                )}

                <div className='flex flex-wrap items-center gap-3'>
                  <Button
                    type='submit'
                    disabled={isSubmitting || youtubeUrl.trim().length === 0}
                    className='rounded-full'
                  >
                    {isSubmitting ? (
                      <span className='flex items-center gap-2'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Queuing render…
                      </span>
                    ) : (
                      <span className='flex items-center gap-2'>
                        Generate auto reels
                        <ArrowRight className='h-4 w-4' />
                      </span>
                    )}
                  </Button>
                  <p className='text-xs text-gray-500'>
                    Studio 24 will notify you once rendering finishes—refresh to see downloads.
                  </p>
                </div>
              </form>
            ) : (
              <div className='space-y-5 text-sm text-gray-600 leading-relaxed'>
                <p>
                  Auto Reels is a Premium workflow. Upgrade to let Studio 24 transform long-form videos into multiple reels with captions, motion graphics, and CTA overlays.
                </p>
                <Button asChild className='rounded-full'>
                  <a href='/pricing'>
                    View Premium plans
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {isPro && (
          <Card className='border border-gray-200 shadow-sm'>
            <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <CardTitle className='text-xl font-semibold text-gray-900'>
                  Render queue
                </CardTitle>
                <CardDescription>
                  Track progress, retry failures, and download completed reels.
                </CardDescription>
              </div>
              <Button
                variant='outline'
                size='sm'
                className='rounded-full'
                onClick={() => mutate()}
              >
                <RefreshCw className='mr-2 h-4 w-4' />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className='space-y-4'>
              {jobs.length === 0 ? (
                <div className='rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500'>
                  Queue a YouTube URL to start generating reels. Completed renders will appear here.
                </div>
              ) : (
                <div className='space-y-4'>
                  {jobs
                    .slice()
                    .reverse()
                    .map((job) => (
                      <div
                        key={job.id}
                        className='rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-xs'
                      >
                        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                          <div className='space-y-1'>
                            <div className='flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900'>
                              <span>{job.title ?? 'Untitled video'}</span>
                              {renderJobStatus(job)}
                            </div>
                            <a
                              href={job.youtubeUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-xs text-purple-600 hover:underline'
                            >
                              {job.youtubeUrl}
                            </a>
                            <div className='text-xs text-gray-500'>
                              Progress: {job.progress}%
                            </div>
                            {job.error && (
                              <div className='text-xs text-red-600'>
                                {job.error}
                              </div>
                            )}
                          </div>
                          <div className='flex flex-wrap items-center gap-2'>
                            {renderDownloadButton(job)}
                            {renderRetryButton(job)}
                            {job.status === 'completed' && job.localPath ? (
                                <span className='text-xs text-gray-500'>
                                  Local path: {job.localPath}
                                </span>
                              ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}


