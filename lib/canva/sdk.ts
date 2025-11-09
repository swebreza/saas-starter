import { CANVA_CREATE_SDK_URL } from './config'

declare global {
  interface Window {
    Canva?: unknown
  }
}

let sdkPromise: Promise<unknown> | null = null

function injectScript(src: string) {
  return new Promise<Event>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-canva-create-sdk]'
    )

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve(new Event('load'))
        return
      }

      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.canvaCreateSdk = 'true'
    script.addEventListener('load', (event) => {
      script.dataset.loaded = 'true'
      resolve(event)
    })
    script.addEventListener('error', reject, { once: true })
    document.head.appendChild(script)
  })
}

export async function loadCanvaCreateSdk(
  url: string = CANVA_CREATE_SDK_URL
): Promise<unknown> {
  if (typeof window === 'undefined') {
    throw new Error('Canva SDK can only be loaded in the browser')
  }

  if (sdkPromise) {
    await sdkPromise
    return window.Canva ?? null
  }

  sdkPromise = injectScript(url).then(() => window.Canva ?? null)

  try {
    await sdkPromise
    return window.Canva ?? null
  } catch (error) {
    sdkPromise = null
    throw error
  }
}
