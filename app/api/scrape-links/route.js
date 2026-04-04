// v5 - pakai clockworks~free-tiktok-scraper dengan input yang benar
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
  const match = url.match(/\/(video|photo)\/(\d+)/)
  return match ? match[2] : null
}

// POST: mulai scraping async — langsung return run_id tanpa tunggu
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { link_ids } = body

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

    console.log('🚀 Starting Apify for', links.length, 'URLs')
    const link = links[0]
    console.log('📌 Scraping:', link.url_original)

    // ✅ clockworks~free-tiktok-scraper dengan input yang benar
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/clockworks~free-tiktok-scraper/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postURLs: [link.url_original],  // ✅ pakai postURLs
          resultsType: 'posts',
          maxPostsPerQuery: 1,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
          shouldDownloadAvatars: false,
          shouldDownloadSubtitles: false,
          shouldDownloadSlideshowImages: false,
        })
      }
    )

    if (!runRes.ok) {
      const err = await runRes.text()
      return NextResponse.json({ error: `Gagal start Apify: ${err}` }, { status: 500 })
    }

    const runData = await runRes.json()
    const runId = runData?.data?.id
    console.log('✅ Run started:', runId, 'for:', link.url_original)

    return NextResponse.json({
      success: true,
      run_id: runId,
      link_id: link.id,
      message: `Scraping dimulai untuk 1 link. Auto cek setiap 15 detik.`,
      total_links: links.length,
      remaining: links.length - 1
    })

  } catch (err) {
    console.log('POST error:', err.message)
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
    }

    const { data: links } = await supabase
      .from('posting_links')
      .select('id, url_original, url_normalized')

    let updated = 0
    for (const item of items) {
      const itemUrl = item.webVideoUrl || item.url || ''
      const itemVideoId = extractVideoId(itemUrl)
      console.log('🔎 Matching item:', itemUrl, '| videoId:', itemVideoId)

      const match = (links || []).find(l => {
        if (itemVideoId) {
          const linkVideoId = extractVideoId(l.url_original)
          if (linkVideoId && linkVideoId === itemVideoId) return true
        }
        return normalizeUrl(itemUrl) === l.url_normalized
      })

      if (match) {
        console.log('✅ Match found:', match.url_original)
        const views    = item.playCount    ?? item.stats?.playCount    ?? 0
        const likes    = item.diggCount    ?? item.stats?.diggCount    ?? 0
        const komentar = item.commentCount ?? item.stats?.commentCount ?? 0

        const { error } = await supabase
          .from('posting_links')
          .update({ views, likes, komentar, last_scraped_at: new Date().toISOString() })
          .eq('id', match.id)
        if (!error) updated++
      } else {
        console.log('⚠️ No match for:', itemUrl)
      }
    }

    return NextResponse.json({
      status: 'SUCCEEDED',
      updated,
      total_items: items.length,
      message: updated > 0 ? `${updated} link berhasil diupdate!` : 'Data ditemukan tapi tidak ada yang cocok'
    })

  } catch (err) {
    console.log('❌ GET error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}