'use client'

import { useState, useEffect } from 'react'
import { kategoriCPM, formatCPM } from '@/lib/cpm'

const platformIcon = { tiktok: '🎵', instagram: '📸', youtube: '▶️' }

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [kols, setKols] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

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

      const [kolData, postData, engData, campData] = await Promise.all([
        kolRes.json(),
        postRes.json(),
        engRes.json(),
        campRes.json(),
      ])

      const kols = Array.isArray(kolData) ? kolData : []
      const postings = Array.isArray(postData) ? postData : []
      const engagements = Array.isArray(engData) ? engData : []
      const camps = Array.isArray(campData) ? campData : []

      const kolAktif = kols.filter(k => k.status_aktif).length
      const totalBudget = kols.reduce((sum, k) => sum + (k.total_biaya || 0), 0)
      const sudahPosting = postings.filter(p => p.status === 'sudah').length
      const totalPosting = postings.length
      const pctPosting = totalPosting > 0 ? Math.round((sudahPosting / totalPosting) * 100) : 0
      const cpms = engagements.filter(e => e.cpm > 0).map(e => e.cpm)
      const avgCpm = cpms.length > 0 ? cpms.reduce((a, b) => a + b, 0) / cpms.length : 0

      const kolsWithData = kols.map(kol => {
        const posting = postings.find(p => p.kol_id === kol.id && p.status === 'sudah')
        const eng = posting ? engagements.find(e => e.posting_id === posting.id) : null
        return { ...kol, views: eng?.views || 0, likes: eng?.likes || 0, cpm: eng?.cpm || 0 }
      })

      setStats({ kolAktif, totalKol: kols.length, totalBudget, sudahPosting, totalPosting, pctPosting, avgCpm })
      setKols(kolsWithData)
      setCampaigns(camps)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0, notation: 'compact'
    }).format(num || 0)
  }

  function formatRupiahFull(num) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(num || 0)
  }

  if (loading) return <div className="p-8 text-gray-400">Memuat dashboard...</div>

  return (
    <div className="p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Overview performa KOL Affiliate Branding</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-blue-600">{stats?.kolAktif}</div>
          <div className="text-sm text-gray-500 mt-1">👥 KOL Aktif</div>
          <div className="text-xs text-gray-400 mt-0.5">dari {stats?.totalKol} total</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-purple-600">{formatRupiah(stats?.totalBudget)}</div>
          <div className="text-sm text-gray-500 mt-1">💰 Total Budget</div>
          <div className="text-xs text-gray-400 mt-0.5">semua KOL</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-green-600">{stats?.pctPosting}%</div>
          <div className="text-sm text-gray-500 mt-1">✅ Sudah Posting</div>
          <div className="text-xs text-gray-400 mt-0.5">{stats?.sudahPosting} dari {stats?.totalPosting}</div>
        </div>
        <div className={`rounded-xl border p-5 ${
          !stats?.avgCpm ? 'bg-white border-gray-200' :
          stats.avgCpm < 50000 ? 'bg-green-50 border-green-200' :
          stats.avgCpm <= 150000 ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'}`}>
          <div className={`text-3xl font-bold ${
            !stats?.avgCpm ? 'text-gray-400' :
            stats.avgCpm < 50000 ? 'text-green-600' :
            stats.avgCpm <= 150000 ? 'text-yellow-600' : 'text-red-600'}`}>
            {!stats?.avgCpm ? '-' : formatCPM(stats.avgCpm)}
          </div>
          <div className="text-sm text-gray-500 mt-1">📊 Rata-rata CPM</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {!stats?.avgCpm ? 'Belum ada data' :
             stats.avgCpm < 50000 ? '✅ Efisien' :
             stats.avgCpm <= 150000 ? '⚠️ Normal' : '🔴 Mahal'}
          </div>
        </div>
      </div>

      {/* Campaign Summary */}
      {campaigns.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">🎯 Campaign Aktif</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {campaigns.filter(c => c.status === 'aktif').map(c => (
              <div key={c.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-800">{c.nama}</span>
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">aktif</span>
                </div>
                {c.budget > 0 && (
                  <span className="text-sm text-gray-500">Budget: {formatRupiah(c.budget)}</span>
                )}
                <a href={`/dashboard/campaign/${c.id}`}
                  className="text-blue-600 hover:underline text-xs">Lihat →</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabel KOL */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Performa KOL</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Nama KOL</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Platform</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Total Biaya</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Views</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Likes</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">CPM</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {kols.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada data KOL</td></tr>
            ) : kols.map(kol => {
              const cpmInfo = kategoriCPM(kol.cpm)
              return (
                <tr key={kol.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{kol.nama}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {platformIcon[kol.platform]} {kol.platform}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatRupiahFull(kol.total_biaya)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {kol.views > 0 ? kol.views.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {kol.likes > 0 ? kol.likes.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {kol.cpm > 0
                      ? <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + cpmInfo.class}>{formatCPM(kol.cpm)}</span>
                      : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' +
                      (kol.status_aktif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {kol.status_aktif ? 'Aktif' : 'Nonaktif'}
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