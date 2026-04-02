import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const { data } = await supabase
      .from('produk')
      .select('*, produk_variasi(*)')
      .eq('id', id)
      .single()
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('produk')
    .select('*, produk_variasi(*)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { variasi, ...produkData } = body

  // Simpan produk
  const { data: produk, error } = await supabase
    .from('produk')
    .insert([{ ...produkData, created_by: user.id }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Simpan variasi kalau ada
  if (variasi && variasi.length > 0) {
    await supabase.from('produk_variasi').insert(
      variasi.map(v => ({ ...v, produk_id: produk.id }))
    )
  }

  return NextResponse.json(produk)
}

export async function PUT(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, variasi, ...updateData } = body

  const { data, error } = await supabase
    .from('produk')
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
  const variasi_id = searchParams.get('variasi_id')

  // Hapus variasi saja
  if (variasi_id) {
    await supabase.from('produk_variasi').delete().eq('id', variasi_id)
    return NextResponse.json({ success: true })
  }

  // Hapus produk (variasi ikut terhapus karena CASCADE)
  const { error } = await supabase.from('produk').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}