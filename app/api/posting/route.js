import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const campaign_id = searchParams.get('campaign_id')

    let query = supabase
      .from('postings')
      .select(`
        id, kol_id, link_posting, tanggal_deadline,
        tanggal_posting, tanggal_dipost, status, catatan, created_at,
        campaign_kol_id,
        kols(id, nama, platform, handle, niche, total_biaya, no_wa),
        campaign_kol:campaign_kol_id(
          id, kode_unik, tanggal_kirim_barang,
          campaigns(id, nama),
          produk_variasi(nama_variasi)
        )
      `)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) {
      console.error('Posting GET error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let result = Array.isArray(data) ? data : []

    if (campaign_id) {
      result = result.filter(p =>
        p.campaign_kol?.campaigns?.id === campaign_id
      )
    }

    return NextResponse.json(result)

  } catch (err) {
    console.error('Posting GET catch:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { data, error } = await supabase
      .from('postings')
      .insert([{ ...body, status: 'belum' }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
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
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const { error } = await supabase.from('postings').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}