const DEFAULT_CREATE_SDK_URL = 'https://sdk.canva.com/create/latest/sdk.js'

const DEFAULT_TEMPLATE_URLS = {
  vertical: 'https://www.canva.com/templates/vertical-storyboard',
  square: 'https://www.canva.com/templates/square-storyboard',
  widescreen: 'https://www.canva.com/templates/widescreen-storyboard',
} as const

type TemplateOverrides = Partial<
  Record<keyof typeof DEFAULT_TEMPLATE_URLS, string>
>

function parseTemplateOverrides(): TemplateOverrides {
  const raw = process.env.CANVA_TEMPLATES_CONFIG
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as TemplateOverrides
    return parsed
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[studio24] Failed to parse CANVA_TEMPLATES_CONFIG', error)
    }
    return {}
  }
}

const TEMPLATE_OVERRIDES = parseTemplateOverrides()

export const CANVA_TEMPLATE_URLS: Record<
  keyof typeof DEFAULT_TEMPLATE_URLS,
  string
> = {
  vertical: TEMPLATE_OVERRIDES.vertical ?? DEFAULT_TEMPLATE_URLS.vertical,
  square: TEMPLATE_OVERRIDES.square ?? DEFAULT_TEMPLATE_URLS.square,
  widescreen: TEMPLATE_OVERRIDES.widescreen ?? DEFAULT_TEMPLATE_URLS.widescreen,
}

export type CanvaStoryboardFormat = keyof typeof DEFAULT_TEMPLATE_URLS

export const CANVA_APP_ID = process.env.NEXT_PUBLIC_CANVA_APP_ID?.trim() ?? ''

export const CANVA_CREATE_SDK_URL =
  process.env.NEXT_PUBLIC_CANVA_CREATE_SDK_URL?.trim() ?? DEFAULT_CREATE_SDK_URL

if (!CANVA_APP_ID && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[studio24] NEXT_PUBLIC_CANVA_APP_ID is not set. Canva Create SDK will fail to initialize.'
  )
}
