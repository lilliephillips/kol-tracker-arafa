import { createClient } from '@/lib/supabase/server'
import { scrapeEngagement } from '@/lib/apify'
import { hitungCPM } from '@/lib/cpm'
import { NextResponse } from 'next/server'

// Endpoint ini dipanggil otomatis setiap hari jam 07.00 WIB oleh Vercel Cron
export async function GET(request) {
  // Keamanan: cek header dari Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Ambil semua posting yang sudah ada link-nya
  const { data: postings } = await supabase
    .from('postings')
    .select('*, kols(*)')
    .eq('status', 'sudah')
    .not('link_posting', 'is', null)

  if (!postings || postings.length === 0) {
    return NextResponse.json({ message: 'Tidak ada posting untuk diupdate' })
  }

  let berhasil = 0
  let gagal = 0

  for (const posting of postings) {
    try {
      const engagement = await scrapeEngagement(
        posting.kols.platform,
        posting.link_posting
      )

      if (engagement) {
        const cpm = hitungCPM(posting.kols.total_biaya, engagement.views)
        await supabase.from('engagement_data').insert([{
          posting_id: posting.id,
          views:    engagement.views,
          likes:    engagement.likes,
          komentar: engagement.komentar,
          share:    engagement.share,
          save:     engagement.save,
          cpm:      cpm,
        }])
        berhasil++
      } else {
        gagal++
      }

      // Jeda 2 detik antar request agar tidak kena rate limit
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (err) {
      console.error(`Error update posting ${posting.id}:`, err)
      gagal++
    }
  }

  return NextResponse.json({
    message: `Update selesai: ${berhasil} berhasil, ${gagal} gagal`,
    berhasil,
    gagal
  })
}