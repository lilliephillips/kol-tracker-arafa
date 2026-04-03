import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const kol_id = searchParams.get('kol_id')

  const { data, error } = await supabase
    .from('campaign_kols')
    .select(`
      id, kode_unik,
      campaigns (id, nama),
      produk_variasi (id, nama_variasi)
    `)
    .eq('kol_id', kol_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}