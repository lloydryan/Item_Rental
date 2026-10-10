import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return json({ error: 'Authentication is required.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })

    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Your session is invalid or expired.' }, 401)

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', userData.user.id)
      .single()

    if (!callerProfile?.is_active || callerProfile.role !== 'owner') {
      return json({ error: 'Only an active owner can reset staff passwords.' }, 403)
    }

    const body = await request.json()
    const userId = String(body.userId || '').trim()
    const password = String(body.password || '')

    if (!userId) return json({ error: 'Select an employee account.' }, 400)
    if (userId === userData.user.id) {
      return json({ error: 'Change your own password from My profile.' }, 400)
    }
    if (password.length < 8) {
      return json({ error: 'Password must contain at least 8 characters.' }, 400)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!targetProfile) return json({ error: 'The employee account was not found.' }, 404)

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password })
    if (updateError) return json({ error: updateError.message }, 400)

    return json({ success: true }, 200)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to reset the password.' }, 500)
  }
})

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
