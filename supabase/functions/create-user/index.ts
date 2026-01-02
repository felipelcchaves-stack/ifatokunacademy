import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verificar se o chamador é admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é admin
    const { data: isAdminData } = await supabaseAdmin.rpc('is_admin', { user_id: callerUser.id })
    if (!isAdminData) {
      return new Response(
        JSON.stringify({ error: 'Only admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, fullName, moduleIds, inviteId } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating user: ${email} with ${moduleIds?.length || 0} module permissions`)

    // Criar o usuário
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || ''
      }
    })

    if (error) {
      console.error('Error creating user:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = data.user.id

    // Inserir permissões de módulos
    if (moduleIds && moduleIds.length > 0) {
      const permissions = moduleIds.map((moduleId: string) => ({
        user_id: newUserId,
        module_id: moduleId,
        granted_by: callerUser.id
      }))
      
      const { error: permError } = await supabaseAdmin
        .from('user_module_permissions')
        .insert(permissions)

      if (permError) {
        console.error('Error inserting permissions:', permError)
        // Não falhar a criação do usuário por causa das permissões
      } else {
        console.log(`Inserted ${permissions.length} module permissions`)
      }
    }

    // Atualizar convite se fornecido
    if (inviteId) {
      const { error: inviteError } = await supabaseAdmin
        .from('user_invites')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString() 
        })
        .eq('id', inviteId)

      if (inviteError) {
        console.error('Error updating invite:', inviteError)
      }
    }

    console.log(`User created successfully: ${newUserId}`)

    return new Response(
      JSON.stringify({ success: true, user: data.user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Unexpected error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
