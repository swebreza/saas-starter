import { forwardRef, useEffect, useMemo, useState } from 'react'
import Konva from 'konva'
import { Group, Layer, Rect, Stage, Text } from 'react-konva'

export type StoryboardCardTheme = {
  gradientStops: Array<number | string>
  accent: string
  overlayBackground: string
  textPrimary: string
  textSecondary: string
  badgeBackground: string
  badgeText: string
}

export type StoryboardCanvasCard = {
  index: number
  time: string
  headline: string
  overlay?: string
  voiceover: string
  note?: string
}

export type StoryboardCanvasSize = {
  width: number
  height: number
  padding?: number
}

type StoryboardCanvasProps = {
  card: StoryboardCanvasCard
  theme: StoryboardCardTheme
  size: StoryboardCanvasSize
}

const defaultPadding = 32

export const StoryboardCanvas = forwardRef<Konva.Stage, StoryboardCanvasProps>(
  ({ card, theme, size }, ref) => {
    const padding = size.padding ?? defaultPadding
    const safeArea = useMemo(() => {
      const inset = padding * 0.75
      return {
        x: inset,
        y: inset,
        width: size.width - inset * 2,
        height: size.height - inset * 2,
      }
    }, [size.height, size.width, padding])

    const overlayBoxY = size.height - padding - 140

    const sanitize = (value: string | undefined, maxLength: number) => {
      if (!value) return ''
      const clean = value.replace(/\s+/g, ' ').trim()
      return clean.length > maxLength
        ? `${clean.slice(0, maxLength - 1)}…`
        : clean
    }

    const keywordChips = useMemo(() => {
      const words = card.headline
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
      if (!words.length) return ['STORYBOARD', 'SCENE', 'DETAIL']
      return words.slice(0, 3)
    }, [card.headline])

    const overlayLabel = sanitize(card.overlay, 28)
    const directorNote = sanitize(card.note, 42)
    const voiceoverPreview = sanitize(card.voiceover, 42)

    const stringHash = (input: string) => {
      let hash = 0
      for (let i = 0; i < input.length; i += 1) {
        hash = (hash << 5) - hash + input.charCodeAt(i)
        hash |= 0
      }
      return Math.abs(hash)
    }

    const visualBlocks = useMemo(() => {
      const blocks = Array.from({ length: 5 }).map((_, index) => {
        const width =
          ((stringHash(`${card.headline}-${index}`) % 50) / 100) *
            (size.width - padding * 2) +
          (size.width - padding * 2) * 0.2
        return {
          width,
          y: padding + 90 + index * 48,
          opacity: 0.25 + (index % 3) * 0.15,
        }
      })
      return blocks
    }, [card.headline, size.width, padding])

    const audioLevels = useMemo(() => {
      const seed = card.voiceover || card.headline
      return Array.from({ length: 18 }).map((_, index) => {
        const magnitude =
          ((stringHash(`${seed}-${index}`) % 70) / 100) * 60 + 20
        return {
          height: magnitude,
          x: padding + 12 + index * ((size.width - padding * 2 - 24) / 18),
          opacity: 0.45 + (index % 4) * 0.08,
        }
      })
    }, [card.headline, card.voiceover, size.width, padding])

    const isClient = typeof window !== 'undefined'
    const [isSupported, setIsSupported] = useState(false)
    const [isChecked, setIsChecked] = useState(false)
    const [supportMessage, setSupportMessage] = useState<string | null>(null)

    useEffect(() => {
      if (!isClient) {
        setIsSupported(false)
        setSupportMessage(
          'Storyboard graphics require a modern browser with canvas support.'
        )
        setIsChecked(true)
        return
      }

      try {
        const canvas = document.createElement('canvas')
        if (!canvas || !canvas.getContext('2d')) {
          throw new Error('Canvas context unavailable')
        }

        const HitCanvasCtor = (Konva as unknown as { HitCanvas?: unknown })
          .HitCanvas
        if (!HitCanvasCtor) {
          ;(
            Konva as unknown as { hitCanvasEnabled?: boolean }
          ).hitCanvasEnabled = false
          setSupportMessage(
            'Advanced hit detection is disabled by your browser. Storyboard graphics remain interactive, but per-element hit testing is limited.'
          )
        } else {
          setSupportMessage(null)
        }
        setIsSupported(true)
      } catch (error) {
        console.warn('Storyboard canvas limited support', error)
        ;(Konva as unknown as { hitCanvasEnabled?: boolean }).hitCanvasEnabled =
          false
        setSupportMessage(
          'Canvas support is limited in this browser. Storyboard graphics will render but hit detection may be reduced.'
        )
        setIsSupported(true)
      }
      setIsChecked(true)
    }, [isClient])

    if (!isChecked) {
      return (
        <div
          style={{
            width: size.width,
            height: size.height,
          }}
          className='flex flex-col items-center justify-center rounded-[28px] border border-gray-200 bg-white/80 px-6 text-center text-sm text-gray-500'
        >
          <p>Preparing canvas preview…</p>
        </div>
      )
    }

    const pixelRatio =
      typeof window !== 'undefined' && window.devicePixelRatio
        ? Math.min(window.devicePixelRatio, 3)
        : 2

    if (!isSupported && supportMessage) {
      return (
        <div
          style={{
            width: size.width,
            height: size.height,
          }}
          className='flex flex-col items-center justify-center rounded-[28px] border border-dashed border-gray-300 bg-white/80 px-6 text-center text-sm text-gray-600'
        >
          <p className='font-semibold text-gray-800'>Canvas blocked</p>
          <p className='mt-2 leading-relaxed'>
            {supportMessage ??
              'Your browser prevented storyboard graphics from rendering. Please disable privacy blockers for this site or switch browsers.'}
          </p>
        </div>
      )
    }

    return (
      <Stage
        ref={ref}
        width={size.width}
        height={size.height}
        pixelRatio={pixelRatio}
      >
        <Layer>
          <Rect
            width={size.width}
            height={size.height}
            cornerRadius={28}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: size.width, y: size.height }}
            fillLinearGradientColorStops={theme.gradientStops}
            shadowBlur={32}
            shadowOpacity={0.25}
            shadowColor={theme.accent}
          />

          <Rect
            x={safeArea.x}
            y={safeArea.y}
            width={safeArea.width}
            height={safeArea.height}
            stroke='rgba(255,255,255,0.08)'
            strokeWidth={1}
            dash={[14, 10]}
            cornerRadius={22}
          />

          <Group x={padding} y={padding} width={size.width - padding * 2}>
            <Rect
              width={180}
              height={34}
              cornerRadius={18}
              fill={theme.badgeBackground}
            />
            <Text
              text={`SCENE ${card.index}`}
              fontSize={14}
              fontStyle='bold'
              fill={theme.badgeText}
              x={16}
              y={9}
            />
            <Text
              text={card.time.toUpperCase()}
              fontSize={13}
              fill={theme.badgeText}
              x={16}
              y={9}
              align='right'
              width={150}
            />

            <Group x={0} y={58} width={size.width - padding * 2}>
              {keywordChips.map((chip, index) => (
                <Group key={chip} x={index * 112}>
                  <Rect
                    width={100}
                    height={28}
                    cornerRadius={14}
                    fill='rgba(255,255,255,0.14)'
                  />
                  <Text
                    text={chip}
                    fontSize={12}
                    fontStyle='bold'
                    fill={theme.textPrimary}
                    x={12}
                    y={7}
                  />
                </Group>
              ))}
            </Group>

            <Group x={0} y={110}>
              <Rect
                width={size.width - padding * 2}
                height={220}
                cornerRadius={22}
                fill='rgba(0,0,0,0.08)'
              />
              {visualBlocks.map((bar, index) => (
                <Rect
                  key={`visual-${index}`}
                  x={12}
                  y={bar.y - (padding + 112)}
                  width={bar.width}
                  height={18}
                  cornerRadius={12}
                  fill='rgba(255,255,255,0.28)'
                  opacity={bar.opacity}
                />
              ))}
            </Group>

            <Group x={0} y={overlayBoxY - padding}>
              <Rect
                width={size.width - padding * 2}
                height={overlayLabel ? 112 : 80}
                cornerRadius={20}
                fill={theme.overlayBackground}
              />
              <Text
                text='OVERLAY / CTA'
                fontSize={12}
                fontStyle='bold'
                fill={theme.textSecondary}
                x={20}
                y={18}
              />
              <Rect
                x={20}
                y={42}
                width={(size.width - padding * 2) * 0.78}
                height={26}
                cornerRadius={12}
                fill='rgba(255,255,255,0.18)'
              />
              <Text
                text={overlayLabel || 'CTA TEXT / KEY MESSAGE'}
                fontSize={14}
                fontStyle='bold'
                fill={theme.textPrimary}
                x={32}
                y={46}
              />
              <Group
                x={20}
                y={overlayLabel ? 76 : 70}
                width={size.width - padding * 2 - 40}
              >
                {audioLevels.map((tone, index) => (
                  <Rect
                    key={`audio-${index}`}
                    x={tone.x - (padding + 20)}
                    y={Math.max(0, 64 - tone.height / 2)}
                    width={6}
                    height={tone.height}
                    cornerRadius={3}
                    fill='rgba(255,255,255,0.25)'
                    opacity={tone.opacity}
                  />
                ))}
              </Group>
            </Group>

            <Group
              x={size.width - padding * 2 - 160}
              y={overlayBoxY + (overlayLabel ? 130 : 116)}
            >
              <Rect
                width={160}
                height={90}
                cornerRadius={16}
                fill='rgba(0,0,0,0.15)'
              />
              <Text
                text='VOICEOVER'
                fontSize={11}
                fontStyle='bold'
                fill={theme.textSecondary}
                x={14}
                y={12}
              />
              <Text
                text={voiceoverPreview || 'NARRATED ACTION / HOOK'}
                fontSize={13}
                fill={theme.textPrimary}
                width={132}
                x={14}
                y={30}
                lineHeight={1.35}
              />
            </Group>

            <Group x={20} y={overlayBoxY + (overlayLabel ? 132 : 118)}>
              <Rect
                width={182}
                height={92}
                cornerRadius={16}
                fill='rgba(0,0,0,0.18)'
              />
              <Text
                text='DIRECTOR NOTE'
                fontSize={11}
                fontStyle='bold'
                fill={theme.textSecondary}
                x={14}
                y={12}
              />
              <Text
                text={directorNote || 'CAMERA / MOTION / EDITING DIRECTION'}
                fontSize={12}
                fill={theme.textPrimary}
                width={150}
                x={14}
                y={32}
                lineHeight={1.4}
              />
            </Group>
          </Group>
        </Layer>
      </Stage>
    )
  }
)

StoryboardCanvas.displayName = 'StoryboardCanvas'
