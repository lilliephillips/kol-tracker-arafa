const APIFY_TOKEN = process.env.APIFY_API_TOKEN

// Helper: start run async, poll sampai selesai (max ~3 menit)
async function runAndWait(actorId, input, timeoutMs = 180000) {
  // 1. Start run
  const startRes = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }
  )
  if (!startRes.ok) {
    const err = await startRes.text()
    throw new Error(`Gagal start actor ${actorId}: ${err}`)
  }
  const startData = await startRes.json()
  const runId = startData?.data?.id
  if (!runId) throw new Error('Run ID tidak ditemukan')

  // 2. Poll status setiap 5 detik
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await sleep(5000)
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    )
    const statusData = await statusRes.json()
    const status = statusData?.data?.status

    if (status === 'SUCCEEDED') {
      // 3. Ambil hasil dataset
      const dataRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`
      )
      const items = await dataRes.json()
      return items
    }

    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Actor run ${status} untuk ${actorId}`)
    }
    // Kalau masih RUNNING/READY, lanjut poll
  }
  throw new Error(`Timeout menunggu actor ${actorId}`)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── FUNGSI UTAMA ─────────────────────────────────────────────
export async function scrapeEngagement(platform, linkPosting) {
  try {
    switch (platform) {
      case 'tiktok':
        return await scrapeTikTok(linkPosting)
      case 'instagram':
        return await scrapeInstagram(linkPosting)
      case 'youtube':
        return await scrapeYouTube(linkPosting)
      default:
        throw new Error(`Platform ${platform} tidak didukung`)
    }
  } catch (error) {
    console.error(`Error scraping ${platform}:`, error)
    return null
  }
}

// ─── TIKTOK ───────────────────────────────────────────────────
// Pakai: clockworks/free-tiktok-scraper (lebih aktif di-maintain)
async function scrapeTikTok(url) {
  const items = await runAndWait('clockworks~free-tiktok-scraper', {
    postURLs: [url],
    resultsType: 'posts',
    maxPostsPerQuery: 1,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadAvatars: false,
    shouldDownloadSubtitles: false,
  })

  if (!items || items.length === 0) return null
  const post = items[0]

  return {
    views:    post.playCount    ?? post.stats?.playCount    ?? 0,
    likes:    post.diggCount    ?? post.stats?.diggCount    ?? 0,
    komentar: post.commentCount ?? post.stats?.commentCount ?? 0,
    share:    post.shareCount   ?? post.stats?.shareCount   ?? 0,
    save:     post.collectCount ?? post.stats?.collectCount ?? 0,
  }
}

// ─── INSTAGRAM ────────────────────────────────────────────────
// Pakai: apify/instagram-post-scraper (official, lebih stabil)
async function scrapeInstagram(url) {
  const items = await runAndWait('apify~instagram-post-scraper', {
    directUrls: [url],
    resultsType: 'posts',
    resultsLimit: 1,
  })

  if (!items || items.length === 0) return null
  const post = items[0]

  return {
    views:    post.videoViewCount ?? post.videoPlayCount ?? post.likesCount ?? 0,
    likes:    post.likesCount     ?? 0,
    komentar: post.commentsCount  ?? 0,
    share:    0,
    save:     0,
  }
}

// ─── YOUTUBE ──────────────────────────────────────────────────
// Pakai: streamers/youtube-scraper (fix input schema)
async function scrapeYouTube(url) {
  const items = await runAndWait('streamers~youtube-scraper', {
    startUrls: [url],   // ✅ array of string, bukan array of object
    maxResults: 1,
    proxyConfiguration: { useApifyProxy: true },
  })

  if (!items || items.length === 0) return null
  const post = items[0]

  return {
    views:    post.viewCount     ?? post.views         ?? 0,
    likes:    post.likes         ?? post.likeCount      ?? 0,
    komentar: post.commentsCount ?? post.commentCount   ?? 0,
    share:    0,
    save:     0,
  }
}