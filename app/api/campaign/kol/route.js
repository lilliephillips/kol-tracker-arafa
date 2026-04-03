import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const campaign_id = searchParams.get('campaign_id')

    let query = supabase
      .from('campaign_kols')
      .select(`
        id,
        campaign_id,
        kol_id,
        fee_kol,
        ongkir,
        ongkos_kirim,
        status_kirim,
        tanggal_kirim,
        tanggal_kirim_barang,
        kode_unik,
        hpp_total,
        hpp_satuan,
        total_spending,
        quantity,
        catatan,
        created_at,
        kols (
          id,
          nama,
          platform,
          handle
        ),
        campaigns (
          id,
          nama
        ),
        postings (
          id,
          status,
          tanggal_dipost
        ),
        posting_links (
          id,
          platform,
          views,
          likes,
          komentar
        )
      `)
      .order('created_at', { ascending: false })

    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Hitung agregat di sisi server
    const enriched = (data || []).map(ck => {
      const links = ck.posting_links || []
      const posting = ck.postings?.[0] || null

      const total_views = links.reduce((s, l) => s + (l.views || 0), 0)
      const total_likes = links.reduce((s, l) => s + (l.likes || 0), 0)
      const total_komentar = links.reduce((s, l) => s + (l.komentar || 0), 0)
      const jumlah_link = links.length

      const total_biaya = (ck.fee_kol || 0) + (ck.hpp_total || 0) + (ck.ongkir || 0)
      const cpm = total_views > 0 ? (total_biaya / total_views) * 1000 : 0

      return {
        ...ck,
        hpp: ck.hpp_total || 0,
        total_biaya,
        total_views,
        total_likes,
        total_komentar,
        jumlah_link,
        cpm,
        status_posting: posting?.status || 'belum',
        tanggal_dipost: posting?.tanggal_dipost || null,
      }
    })

    return NextResponse.json(enriched)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
function generateKodeUnik(namaKampanye) {
  const prefix = namaKampanye
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 3)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const timestamp = Date.now().toString().slice(-4)
  return `${prefix}-${random}-${timestamp}`
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Ambil nama campaign untuk generate kode unik
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('nama')
    .eq('id', body.campaign_id)
    .single()

  const hpp_total = (body.hpp_satuan || 0) * (body.quantity || 1)

  const payload = {
    ...body,
    kode_unik: generateKodeUnik(campaign?.nama || 'CMP'),
    hpp_total,
  }

  // Simpan ke campaign_kols
  const { data: ck, error } = await supabase
    .from('campaign_kols')
    .insert([payload])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Otomatis buat posting baru di tabel postings
  try {
    await supabase
      .from('postings')
      .insert([{
        kol_id: body.kol_id,
        campaign_kol_id: ck.id,
        status: 'belum',
        tanggal_deadline: body.tanggal_kirim_barang || null,
        catatan: body.catatan || '',
      }])
  } catch (postingErr) {
    console.error('Error buat posting otomatis:', postingErr)
  }

  return NextResponse.json(ck)
}

export async function PUT(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, ...updateData } = body

  if (updateData.quantity || updateData.hpp_satuan) {
    updateData.hpp_total = (updateData.hpp_satuan || 0) * (updateData.quantity || 1)
  }

  const { data, error } = await supabase
    .from('campaign_kols')
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

  // Hapus posting yang terhubung dulu
  await supabase
    .from('postings')
    .delete()
    .eq('campaign_kol_id', id)

  const { error } = await supabase.from('campaign_kols').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}