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
        JSON.stringify({ error: 'Only admins can update permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, moduleIds } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!Array.isArray(moduleIds)) {
      return new Response(
        JSON.stringify({ error: 'Module IDs must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Updating permissions for user ${userId}: ${moduleIds.length} modules`)

    // Deletar todas as permissões existentes do usuário
    const { error: deleteError } = await supabaseAdmin
      .from('user_module_permissions')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting existing permissions:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to update permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Inserir novas permissões (se houver)
    if (moduleIds.length > 0) {
      const permissions = moduleIds.map((moduleId: string) => ({
        user_id: userId,
        module_id: moduleId,
        granted_by: callerUser.id
      }))
      
      const { error: insertError } = await supabaseAdmin
        .from('user_module_permissions')
        .insert(permissions)

      if (insertError) {
        console.error('Error inserting permissions:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to insert new permissions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log(`Permissions updated successfully for user ${userId}`)

    return new Response(
      JSON.stringify({ success: true }),
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
