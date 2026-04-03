import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform')
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  let query = supabase
    .from('kols')
    .select(`
      *,
      ditambahkan_oleh_profile:ditambahkan_oleh(id, nama, email)
    `)
    .order('created_at', { ascending: false })

  if (platform) query = query.eq('platform', platform)
  if (status === 'aktif') query = query.eq('status_aktif', true)
  if (status === 'nonaktif') query = query.eq('status_aktif', false)
  if (search) query = query.ilike('nama', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  
  // Normalize nomor WA
  if (body.no_wa) {
    body.no_wa = normalizeWA(body.no_wa)
  }

  const { data, error } = await supabase
    .from('kols')
    .insert([{ ...body, created_by: user.id }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, ...updateData } = body

  if (updateData.no_wa) {
    updateData.no_wa = normalizeWA(updateData.no_wa)
  }

  const { data, error } = await supabase
    .from('kols')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  const { error } = await supabase.from('kols').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

function normalizeWA(no) {
  no = no.replace(/\D/g, '') // hapus non-digit
  if (no.startsWith('0')) no = '62' + no.slice(1)
  if (no.startsWith('+')) no = no.slice(1)
  if (!no.startsWith('62')) no = '62' + no
  return no
}