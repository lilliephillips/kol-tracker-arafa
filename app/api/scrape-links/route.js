import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN

function normalizeUrl(url) {
  let u = url.trim().toLowerCase()
  u = u.replace(/^https?:\/\//, '')
  u = u.replace(/^www\./, '')
  u = u.split('?')[0]
  u = u.split('#')[0]
  u = u.replace(/\/+$/, '')
  return u
}

function extractVideoId(url) {
  const match = url.match(/\/video\/(\d+)/)
  return match ? match[1] : null
}

// POST: mulai scraping async — langsung return run_id tanpa tunggu
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { link_ids } = body

    // Ambil TikTok links yang belum ada views
    let query = supabase
      .from('posting_links')
      .select('id, platform, url_original, url_normalized')
      .eq('platform', 'tiktok')

    if (link_ids && link_ids.length > 0) {
      query = query.in('id', link_ids)
    } else {
      query = query.or('views.is.null,views.eq.0')
    }

    const { data: links, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!links || links.length === 0) {
      return NextResponse.json({ message: 'Tidak ada link TikTok yang perlu di-scrape', updated: 0 })
    }

    const urls = links.map(l => l.url_original)
    console.log('🚀 Starting Apify for URLs:', urls)

    // Fire and forget — tidak tunggu hasil
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postURLs: urls,
          resultsType: 'posts',
          maxPostsPerQuery: urls.length,
          resultsPerPage: 1,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
          shouldDownloadAvatars: false,
        })
      }
    )

    if (!runRes.ok) {
      const err = await runRes.text()
      console.log('❌ Apify start error:', err)
      return NextResponse.json({ error: `Gagal start Apify: ${err}` }, { status: 500 })
    }

    const runData = await runRes.json()
    const runId = runData?.data?.id
    console.log('✅ Run started:', runId)

    return NextResponse.json({
      success: true,
      run_id: runId,
      message: `Scraping dimulai untuk ${urls.length} link TikTok. Tunggu 2-3 menit lalu klik "Cek Hasil".`,
      total_links: urls.length
    })

  } catch (err) {
    console.log('❌ POST error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: cek hasil run berdasarkan run_id
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const run_id = searchParams.get('run_id')

    if (!run_id) {
      const { data } = await supabase
        .from('posting_links')
        .select('id, platform, views, last_scraped_at')
      const belumAda = (data || []).filter(l => !l.views || l.views === 0)
      return NextResponse.json({
        total: data?.length || 0,
        sudah_views: (data?.length || 0) - belumAda.length,
        belum_views: belumAda.length
      })
    }

    // Cek status run
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${run_id}?token=${APIFY_TOKEN}`
    )
    const statusData = await statusRes.json()
    const status = statusData?.data?.status
    console.log('📊 Run status:', run_id, status)

    if (status !== 'SUCCEEDED') {
      return NextResponse.json({
        status,
        message: status === 'RUNNING' ? 'Masih berjalan, coba lagi sebentar...' : `Status: ${status}`
      })
    }

    // Ambil hasil dataset
    const dataRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${run_id}/dataset/items?token=${APIFY_TOKEN}`
    )
    const items = await dataRes.json()
    console.log('📦 Got items:', items?.length)
    if (items?.[0]) console.log('🔍 Sample keys:', Object.keys(items[0]))

    if (!items || items.length === 0) {
      return NextResponse.json({ status: 'SUCCEEDED', updated: 0, message: 'Tidak ada data hasil scraping' })
    }console.log('📦 Total items dari Apify:', items?.length)
    if (items?.[0]) {
      console.log('🔍 Sample item:', JSON.stringify({
        webVideoUrl: items[0].webVideoUrl,
        url: items[0].url,
        playCount: items[0].playCount,
        diggCount: items[0].diggCount,
        commentCount: items[0].commentCount,
      }))
    }

    // Ambil semua posting_links
    const { data: links, error: linksError } = await supabase
      .from('posting_links')
      .select('id, url_original, url_normalized')
    
    console.log('🗄️ Links di DB:', links?.length, linksError?.message)
    if (links?.[0]) console.log('🔗 Sample link:', JSON.stringify({
      url_original: links[0].url_original,
      url_normalized: links[0].url_normalized
    }))

    let updated = 0
    for (const item of items) {
      const itemUrl = item.webVideoUrl || item.url || ''
      const itemVideoId = extractVideoId(itemUrl)
      console.log('🎯 Item URL:', itemUrl, '| videoId:', itemVideoId)

      const match = (links || []).find(l => {
        if (itemVideoId) {
          const linkVideoId = extractVideoId(l.url_original)
          console.log('   comparing videoId:', linkVideoId, '===', itemVideoId)
          if (linkVideoId && linkVideoId === itemVideoId) return true
        }
        return normalizeUrl(itemUrl) === l.url_normalized
      })

      if (match) {
        console.log('✅ Match:', match.url_original)
        const { error: updateError } = await supabase
          .from('posting_links')
          .update({
            views: item.playCount || 0,
            likes: item.diggCount || 0,
            komentar: item.commentCount || 0,
            last_scraped_at: new Date().toISOString()
          })
          .eq('id', match.id)
        console.log('💾 Update result:', updateError ? updateError.message : 'OK')
        if (!updateError) updated++
      } else {
        console.log('⚠️ No match for:', itemUrl)
      }
    }