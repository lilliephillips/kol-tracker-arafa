'use client'

import { useState, useEffect } from 'react'
import { kategoriCPM, formatCPM } from '@/lib/cpm'
import * as XLSX from 'xlsx'

export default function LaporanPage() {
  const [data, setData] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCampaign, setFilterCampaign] = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [kolRes, postRes, engRes, campRes] = await Promise.all([
        fetch('/api/kol'),
        fetch('/api/posting'),
        fetch('/api/scrape'),
        fetch('/api/campaign'),
      ])

      const [kols, postings, engagements, camps] = await Promise.all([
        kolRes.json(),
        postRes.json(),
        engRes.json(),
        campRes.json(),
      ])

      setCampaigns(Array.isArray(camps) ? camps : [])

      const combined = (Array.isArray(kols) ? kols : []).map(kol => {
        const posting = (Array.isArray(postings) ? postings : []).find(p => p.kol_id === kol.id)
        const eng = posting ? (Array.isArray(engagements) ? engagements : []).find(e => e.posting_id === posting.id) : null

        return {
          id: kol.id,
          nama: kol.nama,
          platform: kol.platform,
          handle: kol.handle,
          niche: kol.niche || '-',
          fee_kol: kol.fee_kol,
          biaya_produk: kol.biaya_produk,
          total_biaya: kol.total_biaya,
          nama_produk: kol.nama_produk || '-',
          status_aktif: kol.status_aktif,
          status_posting: posting?.status || 'belum',
          link_posting: posting?.link_posting || '-',
          deadline: posting?.tanggal_deadline || '-',
          kode_unik: posting?.campaign_kol?.kode_unik || '-',
          nama_campaign: posting?.campaign_kol?.campaigns?.nama || '-',
          views: eng?.views || 0,
          likes: eng?.likes || 0,
          komentar: eng?.komentar || 0,
          share: eng?.share || 0,
          cpm: eng?.cpm || 0,
        }
      })

      setData(combined)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const filtered = data.filter(d => {
    if (filterPlatform && d.platform !== filterPlatform) return false
    if (filterStatus && d.status_posting !== filterStatus) return false
    if (filterCampaign && d.nama_campaign !== filterCampaign) return false
    return true
  })

  function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(num || 0)
  }

  function handleExport() {
    const exportData = filtered.map(d => ({
      'Kode Unik': d.kode_unik,
      'Campaign': d.nama_campaign,
      'Nama KOL': d.nama,
      'Platform': d.platform,
      'Handle': '@' + d.handle,
      'Niche': d.niche,
      'Nama Produk': d.nama_produk,
      'Fee KOL': d.fee_kol,
      'Biaya Produk': d.biaya_produk,
      'Total Biaya': d.total_biaya,
      'Status KOL': d.status_aktif ? 'Aktif' : 'Nonaktif',
      'Status Posting': d.status_posting,
      'Deadline': d.deadline,
      'Link Posting': d.link_posting,
      'Views': d.views,
      'Likes': d.likes,
      'Komentar': d.komentar,
      'Share': d.share,
      'CPM (Rp)': d.cpm,
      'Kategori CPM': d.cpm === 0 ? 'Belum ada data' : d.cpm < 50000 ? 'Efisien' : d.cpm <= 150000 ? 'Normal' : 'Mahal',
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan KOL')
    const cols = Object.keys(exportData[0] || {}).map(() => ({ wch: 20 }))
    ws['!cols'] = cols
    XLSX.writeFile(wb, `Laporan_KOL_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Laporan KOL</h1>
          <p className="text-gray-500 text-sm mt-0.5">Data lengkap semua KOL dan performa</p>
        </div>
        <button onClick={handleExport} disabled={filtered.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium">
          📥 Export Excel
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Platform</option>
          <option value="tiktok">🎵 TikTok</option>
          <option value="instagram">📸 Instagram</option>
          <option value="youtube">▶️ YouTube</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Status</option>
          <option value="sudah">✅ Sudah Posting</option>
          <option value="belum">⏳ Belum Posting</option>
        </select>
        <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Campaign</option>
          {campaigns.map(c => <option key={c.id} value={c.nama}>🎯 {c.nama}</option>)}
        </select>
        <div className="text-sm text-gray-500 self-center">Menampilkan {filtered.length} KOL</div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Kode Unik</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Campaign</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Nama KOL</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Platform</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Niche</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Total Biaya</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Status</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Views</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Likes</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">CPM</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Kategori</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-12 text-gray-400">Tidak ada data</td></tr>
            ) : filtered.map(d => {
              const cpmInfo = kategoriCPM(d.cpm)
              return (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {d.kode_unik !== '-'
                      ? <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">{d.kode_unik}</span>
                      : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {d.nama_campaign !== '-'
                      ? <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">🎯 {d.nama_campaign}</span>
                      : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{d.nama}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize whitespace-nowrap">{d.platform}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{d.niche}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatRupiah(d.total_biaya)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' +
                      (d.status_posting === 'sudah' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                      {d.status_posting === 'sudah' ? '✅ Sudah' : '⏳ Belum'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {d.views > 0 ? d.views.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {d.likes > 0 ? d.likes.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {d.cpm > 0 ? formatCPM(d.cpm) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + cpmInfo.class}>
                      {cpmInfo.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}