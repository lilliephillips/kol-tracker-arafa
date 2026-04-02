const APIFY_TOKEN = process.env.APIFY_API_TOKEN

// Fungsi utama: scrape engagement berdasarkan platform
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

// Scrape TikTok
async function scrapeTikTok(url) {
  const response = await fetch(
    'https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?timeout=60',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${APIFY_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        postURLs: [url],
        resultsType: 'posts',
        maxItems: 1
      })
    }
  )

  if (!response.ok) throw new Error('Apify TikTok error: ' + response.status)
  const data = await response.json()
  if (!data || data.length === 0) return null

  const post = data[0]
  return {
    views:    post.playCount    || 0,
    likes:    post.diggCount    || 0,
    komentar: post.commentCount || 0,
    share:    post.shareCount   || 0,
    save:     post.collectCount || 0,
  }
}

// Scrape Instagram
async function scrapeInstagram(url) {
  const response = await fetch(
    'https://api.apify.com/v2/acts/apify~instagram-post-scraper/run-sync-get-dataset-items?timeout=60',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${APIFY_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        directUrls: [url],
        resultsType: 'posts',
        maxItems: 1
      })
    }
  )

  if (!response.ok) throw new Error('Apify Instagram error: ' + response.status)
  const data = await response.json()
  if (!data || data.length === 0) return null

  const post = data[0]
  return {
    views:    post.videoViewCount  || post.likesCount || 0,
    likes:    post.likesCount      || 0,
    komentar: post.commentsCount   || 0,
    share:    0,
    save:     0,
  }
}

// Scrape YouTube
async function scrapeYouTube(url) {
  const response = await fetch(
    'https://api.apify.com/v2/acts/streamers~youtube-scraper/run-sync-get-dataset-items?timeout=60',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${APIFY_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startUrls: [{ url }],
        maxResults: 1
      })
    }
  )

  if (!response.ok) throw new Error('Apify YouTube error: ' + response.status)
  const data = await response.json()
  if (!data || data.length === 0) return null

  const post = data[0]
  return {
    views:    post.viewCount     || 0,
    likes:    post.likes         || 0,
    komentar: post.commentsCount || 0,
    share:    0,
    save:     0,
  }
}