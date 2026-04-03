import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const campaign_id = searchParams.get('campaign_id')

  let query = supabase
    .from('postings')
    .select(`
      *,
      kols (id, nama, platform, handle, niche, total_biaya),
      campaign_kol:campaign_kol_id (
        id, kode_unik, produk_variasi_id,
        produk_variasi (nama_variasi),
        campaigns (id, nama)
      )
    `)
    .order('tanggal_deadline', { ascending: true })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter by campaign kalau ada
  let result = data || []
  if (campaign_id) {
    result = result.filter(p => p.campaign_kol?.campaigns?.id === campaign_id)
  }

  return NextResponse.json(result)
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { campaign_kol_id, ...postingData } = body

  const payload = {
    ...postingData,
    status: 'belum',
  }
  if (campaign_kol_id) payload.campaign_kol_id = campaign_kol_id

  const { data, error } = await supabase
    .from('postings')
    .insert([payload])
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

  if (updateData.link_posting) {
    updateData.status = 'sudah'
    updateData.tanggal_posting = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('postings')
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

  const { error } = await supabase.from('postings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}