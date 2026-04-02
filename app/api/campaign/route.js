import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Ambil semua campaign
export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  // Kalau ada id → ambil detail 1 campaign + KOL-nya
  if (id) {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    const { data: kampanye_kols } = await supabase
  .from('campaign_kols')
  .select(`
    *,
    kols (
      id, nama, platform, handle, niche,
      fee_kol, biaya_produk, total_biaya, status_aktif
    ),
    produk_variasi (
      id, nama_variasi, ukuran, warna, hpp
    )
  `)
  .eq('campaign_id', id)

    // Ambil engagement terbaru per KOL
    const kolsWithEng = await Promise.all(
      (kampanye_kols || []).map(async (ck) => {
        const { data: posting } = await supabase
          .from('postings')
          .select('id')
          .eq('kol_id', ck.kol_id)
          .eq('status', 'sudah')
          .single()

        let engagement = null
        if (posting) {
          const { data: eng } = await supabase
            .from('engagement_data')
            .select('*')
            .eq('posting_id', posting.id)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .single()
          engagement = eng
        }

        return { ...ck, engagement }
      })
    )

    return NextResponse.json({ campaign, kols: kolsWithEng })
  }

  // Ambil semua campaign
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST - Buat campaign baru
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('campaigns')
    .insert([{ ...body, created_by: user.id }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT - Update campaign
export async function PUT(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, ...updateData } = body

  const { data, error } = await supabase
    .from('campaigns')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE - Hapus campaign
export async function DELETE(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  const { error } = await supabase.from('campaigns').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}