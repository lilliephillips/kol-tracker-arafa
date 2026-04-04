import { createClient } from '@/lib/supabase/server'
import { scrapeEngagement } from '@/lib/apify'
import { hitungCPM } from '@/lib/cpm'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { posting_id } = await request.json()

  // Ambil data posting + KOL
  const { data: posting, error: postingError } = await supabase
    .from('postings')
    .select('*, kols(*)')
    .eq('id', posting_id)
    .single()

  if (postingError || !posting) {
    return NextResponse.json({ error: 'Posting tidak ditemukan' }, { status: 404 })
  }

  if (!posting.link_posting) {
    return NextResponse.json({ error: 'Posting belum punya link' }, { status: 400 })
  }

  // Scrape data dari Apify
  const engagement = await scrapeEngagement(
    posting.kols.platform,
    posting.link_posting
  )

  if (!engagement) {
    return NextResponse.json({ error: 'Gagal ambil data dari Apify' }, { status: 500 })
  }

  // Hitung CPM
  const cpm = hitungCPM(posting.kols.total_biaya, engagement.views)

  // Simpan ke database
  const { data: saved, error: saveError } = await supabase
    .from('engagement_data')
    .insert([{
      posting_id,
      views:    engagement.views,
      likes:    engagement.likes,
      komentar: engagement.komentar,
      share:    engagement.share,
      save:     engagement.save,
      cpm:      cpm,
    }])
    .select()
    .single()

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, engagement: saved })
}

// GET - Ambil data engagement terbaru per posting test saya akan test 
export async function GET(request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const posting_id = searchParams.get('posting_id')

  let query = supabase
    .from('engagement_data')
    .select('*')
    .order('recorded_at', { ascending: false })

  if (posting_id) query = query.eq('posting_id', posting_id).limit(1)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}