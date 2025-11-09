'use client'

import { useEffect, useRef, useState } from 'react'

import { loadCanvaCreateSdk } from '@/lib/canva/sdk'

type CanvaEmbedProps = {
  templateUrl: string
  format: string
  onDesignId?: (designId: string | null) => void
}

type CanvaGlobal = {
  createDesign: (options: {
    element: HTMLElement
    template: string
    onDesignOpen?: (event: { id: string }) => void
  }) => { destroy?: () => void }
}

export function CanvaEmbed({
  templateUrl,
  format,
  onDesignId,
}: CanvaEmbedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let instance: { destroy?: () => void } | null = null

    async function init() {
      try {
        const sdk = (await loadCanvaCreateSdk()) as CanvaGlobal | null
        if (cancelled) return

        if (!sdk || typeof sdk.createDesign !== 'function') {
          setError('Canva Create SDK is unavailable in this environment.')
          return
        }

        if (!containerRef.current) {
          setError('Missing Canva container element.')
          return
        }

        instance = sdk.createDesign({
          element: containerRef.current,
          template: templateUrl,
          onDesignOpen: (design) => {
            setIsReady(true)
            onDesignId?.(design?.id ?? null)
          },
        })
      } catch (err) {
        console.error('Failed to initialise Canva Create SDK', err)
        if (!cancelled) {
          setError('Unable to load the Canva editor. Please try again.')
        }
      }
    }

    init()

    return () => {
      cancelled = true
      if (instance?.destroy) {
        instance.destroy()
      }
    }
  }, [templateUrl, onDesignId])

  return (
    <div className='space-y-3'>
      <div
        ref={containerRef}
        className='min-h-[520px] w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'
      />
      {error ? (
        <p className='text-sm text-red-600'>{error}</p>
      ) : (
        <p className='text-xs text-gray-500'>
          {isReady
            ? `Design ready in Canva (${format}). Remember to save when you’re done.`
            : 'Loading Canva editor…'}
        </p>
      )}
    </div>
  )
}

