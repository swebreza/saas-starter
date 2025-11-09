import { getUser } from '@/lib/db/queries'
import { FEATURE_KEYS, getUsageSnapshot } from '@/lib/limits'
import { getCanvaSession, isSessionActive } from '@/lib/canva/oauth'

export async function GET() {
  const user = await getUser()
  if (!user) {
    return Response.json(null)
  }

  const usage = await getUsageSnapshot(user, FEATURE_KEYS.TEXT)
  const canvaSession = await getCanvaSession(user.id)

  return Response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    canvaConnected: isSessionActive(canvaSession),
    usage: usage
      ? {
          used: usage.used,
          limit: usage.limit,
          remaining: usage.remaining,
        }
      : null,
  })
}
