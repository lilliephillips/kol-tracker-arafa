import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Normalisasi URL sebelum disimpan/dicek
function normalizeUrl(url) {
  let u = url.trim().toLowerCase()
  u = u.replace(/^https?:\/\//, '')
  u = u.replace(/^www\./, '')
  u = u.split('?')[0]
  u = u.split('#')[0]
  u = u.replace(/\/+$/, '')
  return u
}

// GET: ambil semua link untuk satu campaign_kol_id, atau cek duplikat
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const campaign_kol_id = searchParams.get('campaign_kol_id')
    const check_url = searchParams.get('check_url')

    // Mode cek duplikat
    if (check_url) {
      const normalized = normalizeUrl(check_url)
      const { data, error } = await supabase
        .from('posting_links')
        .select('id, campaign_kol_id, url_normalized, campaign_kol:campaign_kol_id(kol_id, kols(nama))')
        .eq('url_normalized', normalized)
        .maybeSingle()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({
        is_duplicate: !!data,
        existing: data || null,
        normalized
      })
    }

    if (!campaign_kol_id) return NextResponse.json({ error: 'campaign_kol_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('posting_links')
      .select('*')
      .eq('campaign_kol_id', campaign_kol_id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: tambah link baru
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { campaign_kol_id, platform, url, tanggal_dipost } = body

    if (!campaign_kol_id || !platform || !url) {
      return NextResponse.json({ error: 'campaign_kol_id, platform, url wajib diisi' }, { status: 400 })
    }

    const url_normalized = normalizeUrl(url)

    // Cek duplikat
    const { data: existing } = await supabase
      .from('posting_links')
      .select('id, campaign_kol_id, campaign_kol:campaign_kol_id(kols(nama))')
      .eq('url_normalized', url_normalized)
      .maybeSingle()

    if (existing) {
      const isSameKol = existing.campaign_kol_id === campaign_kol_id
      return NextResponse.json({
        error: 'duplicate',
        same_kol: isSameKol,
        existing_kol_name: existing.campaign_kol?.kols?.nama || 'KOL lain'
      }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('posting_links')
      .insert([{
        campaign_kol_id,
        platform,
        url_original: url,
        url_normalized,
        tanggal_dipost: tanggal_dipost || new Date().toISOString().split('T')[0]
      }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update status posting di tabel postings jadi 'sudah' jika belum
    await supabase
      .from('postings')
      .update({ status: 'sudah', tanggal_dipost })
      .eq('campaign_kol_id', campaign_kol_id)
      .eq('status', 'belum')

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT: edit link
export async function PUT(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, platform, url, tanggal_dipost } = body

    const url_normalized = normalizeUrl(url)

    // Cek duplikat kecuali dirinya sendiri
    const { data: existing } = await supabase
      .from('posting_links')
      .select('id, campaign_kol_id, campaign_kol:campaign_kol_id(kols(nama))')
      .eq('url_normalized', url_normalized)
      .neq('id', id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        error: 'duplicate',
        existing_kol_name: existing.campaign_kol?.kols?.nama || 'KOL lain'
      }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('posting_links')
      .update({ platform, url_original: url, url_normalized, tanggal_dipost })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE: hapus link
export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const { error } = await supabase.from('posting_links').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}