// supabase/functions/redeem-coupon/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verify } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const STAFF_JWT_SECRET = Deno.env.get('STAFF_JWT_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Verify staff JWT
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let jwtPayload: { role: string; venue_id: string; exp: number }
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(STAFF_JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    jwtPayload = await verify(authHeader.slice(7), key) as typeof jwtPayload
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (jwtPayload.role !== 'staff') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { code, action } = await req.json()
  if (!code || !['check', 'confirm'].includes(action)) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Look up the redemption code
  const { data: redemption, error: rError } = await supabase
    .from('venue_redemptions')
    .select('*, venue_promotions(*)')
    .eq('code', code)
    .single()

  if (rError || !redemption) {
    return new Response(JSON.stringify({ status: 'invalid' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Venue ownership check — critical security gate
  if (redemption.venue_id !== jwtPayload.venue_id) {
    return new Response(JSON.stringify({ status: 'invalid' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const promotion = redemption.venue_promotions
  const now = new Date()

  // Check expiry
  if (new Date(promotion.valid_until) < now) {
    return new Response(JSON.stringify({ status: 'expired', promotion_title: promotion.title }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Already redeemed
  if (redemption.redeemed_at) {
    return new Response(JSON.stringify({
      status: 'already_redeemed',
      redeemed_at: redemption.redeemed_at,
      promotion_title: promotion.title,
      discount: promotion.discount,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (action === 'check') {
    return new Response(JSON.stringify({
      status: 'valid',
      promotion_title: promotion.title,
      discount: promotion.discount,
      valid_until: promotion.valid_until,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // action === 'confirm'
  await supabase
    .from('venue_redemptions')
    .update({ redeemed_at: now.toISOString() })
    .eq('id', redemption.id)

  return new Response(JSON.stringify({
    status: 'confirmed',
    promotion_title: promotion.title,
    discount: promotion.discount,
  }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
