import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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