// supabase/functions/notify-expiring-perks/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

/** Haversine distance in metres between two lat/lng points */
function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const DISCOVERY_RADIUS_M = 50_000 // 50 km — matches app discovery radius

Deno.serve(async () => {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + 168 * 60 * 60 * 1000) // max 1 week ahead

  // 1. Fetch active promotions expiring within the max window
  const { data: promotions, error: promoErr } = await supabase
    .from('venue_promotions')
    .select('id, title, discount, valid_until, venue_id, venues(name, latitude, longitude)')
    .eq('status', 'active')
    .gt('valid_until', now.toISOString())
    .lt('valid_until', windowEnd.toISOString())

  if (promoErr) {
    console.error('fetch promotions error:', promoErr)
    return new Response('error fetching promotions', { status: 500 })
  }

  if (!promotions || promotions.length === 0) {
    return new Response('no expiring promotions', { status: 200 })
  }

  // 2. Fetch opted-in users with push tokens (from user_notification_preferences)
  const { data: users, error: userErr } = await supabase
    .from('user_notification_preferences')
    .select('user_id, push_token, latitude, longitude, notify_expiring_perks_hours, notify_expiring_perks_scope')
    .eq('notify_expiring_perks', true)
    .not('push_token', 'is', null)

  if (userErr) {
    console.error('fetch users error:', userErr)
    return new Response('error fetching users', { status: 500 })
  }

  if (!users || users.length === 0) {
    return new Response('no opted-in users', { status: 200 })
  }

  // 3. For each promotion, find eligible users and send
  const pushMessages: { to: string; title: string; body: string }[] = []
  const sentRecords: { user_id: string; promotion_id: string }[] = []

  for (const promo of promotions) {
    const venue = (promo as any).venues
    if (!venue) continue

    const expiresAt = new Date(promo.valid_until)
    const hoursLeft = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)

    for (const user of users) {
      const threshold = user.notify_expiring_perks_hours as number // 24, 48, or 168
      // Notify when promotion is within [threshold - 1h, threshold + 1h]
      if (hoursLeft < threshold - 1 || hoursLeft > threshold + 1) continue

      // Scope filter
      if (user.notify_expiring_perks_scope === 'all_nearby') {
        if (!user.latitude || !user.longitude) continue
        const dist = distanceMetres(user.latitude, user.longitude, venue.latitude, venue.longitude)
        if (dist > DISCOVERY_RADIUS_M) continue
      } else {
        // interacted_only
        const { data: interaction } = await supabase
          .from('user_venue_interactions')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('venue_id', promo.venue_id)
          .maybeSingle()
        if (!interaction) continue
      }

      // Deduplication check
      const { data: alreadySent } = await supabase
        .from('perk_notifications_sent')
        .select('user_id')
        .eq('user_id', user.user_id)
        .eq('promotion_id', promo.id)
        .maybeSingle()
      if (alreadySent) continue

      pushMessages.push({
        to: user.push_token,
        title: `${venue.name} perk expiring soon!`,
        body: `${promo.title} — ${promo.discount}. Don't miss out.`,
      })
      sentRecords.push({ user_id: user.user_id, promotion_id: promo.id })
    }
  }

  // 4. Send push notifications in batches of 100
  const BATCH_SIZE = 100
  for (let i = 0; i < pushMessages.length; i += BATCH_SIZE) {
    const batch = pushMessages.slice(i, i + BATCH_SIZE)
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
    } catch (err) {
      console.error('push send error:', err)
    }
  }

  // 5. Record sent notifications
  if (sentRecords.length > 0) {
    await supabase.from('perk_notifications_sent').insert(sentRecords)
  }

  return new Response(
    JSON.stringify({ sent: pushMessages.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
