import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const allowedRoles = new Set(['owner', 'rental', 'inventory', 'delivery'])

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
      return json({ error: 'Only an active owner can create staff accounts.' }, 403)
    }

    const body = await request.json()
    const fullName = String(body.fullName || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const role = String(body.role || '')

    if (!fullName) return json({ error: 'Enter the employee name.' }, 400)
    if (!email || !email.includes('@')) return json({ error: 'Enter a valid email address.' }, 400)
    if (password.length < 8) return json({ error: 'Password must contain at least 8 characters.' }, 400)
    if (!allowedRoles.has(role)) return json({ error: 'Select a valid application role.' }, 400)

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (createError) return json({ error: createError.message }, 400)

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: created.user.id,
      full_name: fullName,
      email,
      role,
      is_active: true,
    })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id)
      return json({ error: `The account could not be assigned an application profile: ${profileError.message}` }, 400)
    }

    return json({ user: { id: created.user.id, email, fullName, role } }, 201)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to create the account.' }, 500)
  }
})

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
