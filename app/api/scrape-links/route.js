import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN

async function runApifyActor(actorId, input) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60&memory=256`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Apify error: ${err}`)
  }
  return res.json()
}

async function scrapeTikTok(urls) {
  const items = await runApifyActor('clockworks/tiktok-scraper', {
    postURLs: urls,
    resultsType: 'posts',
    maxPostsPerQuery: urls.length
  })
  // Map hasil ke format standar { url, views, likes, komentar }
  return (items || []).map(item => ({
    url: item.webVideoUrl || item.url || '',
    views: item.playCount || item.viewCount || 0,
    likes: item.diggCount || item.likeCount || 0,
    komentar: item.commentCount || 0,
  }))
}

async function scrapeInstagram(urls) {
  const items = await runApifyActor('apify/instagram-scraper', {
    directUrls: urls,
    resultsType: 'posts',
    resultsLimit: urls.length
  })
  return (items || []).map(item => ({
    url: item.url || item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : '',
    views: item.videoViewCount || item.playCount || 0,
    likes: item.likesCount || item.likes || 0,
    komentar: item.commentsCount || item.comments || 0,
  }))
}

async function scrapeYouTube(urls) {
  const items = await runApifyActor('bernardo/youtube-scraper', {
    startUrls: urls.map(url => ({ url })),
    maxResults: urls.length
  })
  return (items || []).map(item => ({
    url: item.url || '',
    views: item.viewCount || 0,
    likes: item.likes || 0,
    komentar: item.commentsCount || 0,
  }))
}

function normalizeUrl(url) {
  let u = url.trim().toLowerCase()
  u = u.replace(/^https?:\/\//, '')
  u = u.replace(/^www\./, '')
  u = u.split('?')[0]
  u = u.split('#')[0]
  u = u.replace(/\/+$/, '')
  return u
}

// POST: scrape link tertentu (by id array) atau semua yang belum ada views
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { link_ids } = body // opsional: array of posting_links.id

    // Ambil links yang perlu di-scrape
    let query = supabase
      .from('posting_links')
      .select('id, platform, url_original, url_normalized')

    if (link_ids && link_ids.length > 0) {
      query = query.in('id', link_ids)
    } else {
      // Ambil semua yang views-nya 0 atau null
      query = query.or('views.is.null,views.eq.0')
    }

    const { data: links, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!links || links.length === 0) {
      return NextResponse.json({ message: 'Tidak ada link yang perlu di-scrape', updated: 0 })
    }

    // Grup per platform
    const byPlatform = { tiktok: [], instagram: [], youtube: [] }
    for (const link of links) {
      if (byPlatform[link.platform]) {
        byPlatform[link.platform].push(link)
      }
    }

    const results = []
    const errors = []

    // Scrape TikTok
    if (byPlatform.tiktok.length > 0) {
      try {
        const urls = byPlatform.tiktok.map(l => l.url_original)
        const scraped = await scrapeTikTok(urls)
        for (const link of byPlatform.tiktok) {
          const match = scraped.find(s =>
            normalizeUrl(s.url) === link.url_normalized ||
            s.url.includes(link.url_normalized)
          )
          if (match) {
            results.push({ id: link.id, ...match })
          } else {
            errors.push({ id: link.id, url: link.url_original, reason: 'Tidak ditemukan di hasil TikTok' })
          }
        }
      } catch (err) {
        errors.push({ platform: 'tiktok', reason: err.message })
      }
    }

    // Scrape Instagram
    if (byPlatform.instagram.length > 0) {
      try {
        const urls = byPlatform.instagram.map(l => l.url_original)
        const scraped = await scrapeInstagram(urls)
        for (const link of byPlatform.instagram) {
          const match = scraped.find(s =>
            normalizeUrl(s.url) === link.url_normalized ||
            s.url.includes(link.url_normalized)
          )
          if (match) {
            results.push({ id: link.id, ...match })
          } else {
            errors.push({ id: link.id, url: link.url_original, reason: 'Tidak ditemukan di hasil Instagram' })
          }
        }
      } catch (err) {
        errors.push({ platform: 'instagram', reason: err.message })
      }
    }

    // Scrape YouTube
    if (byPlatform.youtube.length > 0) {
      try {
        const urls = byPlatform.youtube.map(l => l.url_original)
        const scraped = await scrapeYouTube(urls)
        for (const link of byPlatform.youtube) {
          const match = scraped.find(s =>
            normalizeUrl(s.url) === link.url_normalized ||
            s.url.includes(link.url_normalized)
          )
          if (match) {
            results.push({ id: link.id, ...match })
          } else {
            errors.push({ id: link.id, url: link.url_original, reason: 'Tidak ditemukan di hasil YouTube' })
          }
        }
      } catch (err) {
        errors.push({ platform: 'youtube', reason: err.message })
      }
    }

    // Update ke Supabase
    let updated = 0
    for (const result of results) {
      const { error: updateErr } = await supabase
        .from('posting_links')
        .update({
          views: result.views,
          likes: result.likes,
          komentar: result.komentar,
          last_scraped_at: new Date().toISOString()
        })
        .eq('id', result.id)

      if (!updateErr) updated++
    }

    return NextResponse.json({
      success: true,
      total_links: links.length,
      updated,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: cek status — berapa link yang belum ada views
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('posting_links')
      .select('id, platform, url_normalized, views, last_scraped_at')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const belumAda = (data || []).filter(l => !l.views || l.views === 0)
    const sudahAda = (data || []).filter(l => l.views && l.views > 0)

    return NextResponse.json({
      total: data?.length || 0,
      sudah_views: sudahAda.length,
      belum_views: belumAda.length,
      by_platform: {
        tiktok: belumAda.filter(l => l.platform === 'tiktok').length,
        instagram: belumAda.filter(l => l.platform === 'instagram').length,
        youtube: belumAda.filter(l => l.platform === 'youtube').length,
      }
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}