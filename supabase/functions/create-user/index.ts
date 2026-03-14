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

    // Verificar se é admin global
    const { data: isAdminData } = await supabaseAdmin.rpc('is_admin', { user_id: callerUser.id })
    
    // Ler o body para verificar organizationId (precisamos fazer isso antes de consumir o stream)
    const body = await req.json()
    const { email, password, fullName, moduleIds, inviteId, organizationId, cohortId } = body
    
    // Verificar se é org admin para a organização específica (se não for admin global)
    let canCreate = isAdminData
    if (!canCreate && organizationId) {
      const { data: isOrgAdminData } = await supabaseAdmin.rpc('is_organization_admin', { 
        p_user_id: callerUser.id, 
        p_organization_id: organizationId 
      })
      canCreate = isOrgAdminData
    }
    
    if (!canCreate) {
      return new Response(
        JSON.stringify({ error: 'Only admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Variáveis já extraídas do body acima

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validação de senha forte (server-side)
    const passwordErrors: string[] = [];
    if (password.length < 8) {
      passwordErrors.push('Senha deve ter no mínimo 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      passwordErrors.push('Senha deve conter pelo menos uma letra maiúscula');
    }
    if (!/[a-z]/.test(password)) {
      passwordErrors.push('Senha deve conter pelo menos uma letra minúscula');
    }
    if (!/[0-9]/.test(password)) {
      passwordErrors.push('Senha deve conter pelo menos um número');
    }
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/'`;~]/.test(password)) {
      passwordErrors.push('Senha deve conter pelo menos um caractere especial');
    }

    // Lista de senhas comuns
    const commonPasswords = [
      'password', '123456', '12345678', 'qwerty', 'abc123', 'admin', 'admin123',
      'senha', 'senha123', 'mudar123', '123mudar', 'password123', 'letmein'
    ];
    if (commonPasswords.includes(password.toLowerCase())) {
      passwordErrors.push('Esta senha é muito comum, escolha outra');
    }

    if (passwordErrors.length > 0) {
      console.log(`Password validation failed for ${email}: ${passwordErrors.join(', ')}`);
      return new Response(
        JSON.stringify({ error: passwordErrors[0] }),
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

    // Atualizar o perfil com organization_id se fornecido
    if (organizationId) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ organization_id: organizationId })
        .eq('id', newUserId)

      if (profileError) {
        console.error('Error updating profile organization:', profileError)
      } else {
        console.log(`Updated profile with organization_id: ${organizationId}`)
      }

      // Inserir em organization_members para que o usuário apareça na lista
      const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          user_id: newUserId,
          organization_id: organizationId,
          role: 'member',
          is_primary: true
        })

      if (memberError) {
        console.error('Error inserting organization member:', memberError)
      } else {
        console.log(`Inserted organization_members for user: ${newUserId}`)
      }

      // Inserir registro em user_invites como "accepted" para histórico
      const callerProfile = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', callerUser.id)
        .single()

      const { error: inviteRecordError } = await supabaseAdmin
        .from('user_invites')
        .insert({
          email,
          full_name: fullName || null,
          organization_id: organizationId,
          cohort_id: cohortId || null,
          invited_by_id: callerUser.id,
          invited_by_name: callerProfile.data?.full_name || callerUser.email,
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })

      if (inviteRecordError) {
        console.error('Error inserting invite record:', inviteRecordError)
      } else {
        console.log(`Inserted invite record for: ${email}`)
      }
    }

    // Buscar módulos com unlock_rule = 'always_unlocked' da organização para incluir automaticamente
    const finalModuleIds = [...(moduleIds || [])]
    if (organizationId) {
      const { data: alwaysUnlockedModules } = await supabaseAdmin
        .from('modules')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('unlock_rule', 'always_unlocked')
        .eq('is_published', true)

      if (alwaysUnlockedModules) {
        for (const m of alwaysUnlockedModules) {
          if (!finalModuleIds.includes(m.id)) {
            finalModuleIds.push(m.id)
            console.log(`Auto-including always_unlocked module: ${m.id}`)
          }
        }
      }
    }

    // Inserir permissões de módulos
    if (finalModuleIds.length > 0) {
      const permissions = finalModuleIds.map((moduleId: string) => ({
        user_id: newUserId,
        module_id: moduleId,
        granted_by: callerUser.id
      }))
      
      const { error: permError } = await supabaseAdmin
        .from('user_module_permissions')
        .insert(permissions)

      if (permError) {
        console.error('Error inserting permissions:', permError)
      } else {
        console.log(`Inserted ${permissions.length} module permissions (including auto-unlocked)`)
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

    // Matricular na turma se cohortId fornecido
    if (cohortId) {
      const { error: cohortError } = await supabaseAdmin
        .from('cohort_members')
        .insert({ cohort_id: cohortId, user_id: newUserId })

      if (cohortError) {
        console.error('Error enrolling in cohort:', cohortError)
      } else {
        console.log(`Enrolled user in cohort: ${cohortId}`)
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
