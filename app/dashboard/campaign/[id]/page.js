'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatCPM, kategoriCPM } from '@/lib/cpm'
import * as XLSX from 'xlsx'

const platformIcon = { tiktok: '🎵', instagram: '📸', youtube: '▶️' }

export default function CampaignDetailPage() {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [kols, setKols] = useState([])
  const [allKols, setAllKols] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddKol, setShowAddKol] = useState(false)
  const [formKol, setFormKol] = useState({ kol_id: '', tanggal_kirim_barang: '', catatan: '' })

  useEffect(() => { fetchDetail(); fetchAllKols() }, [id])

  async function fetchDetail() {
    setLoading(true)
    const res = await fetch(`/api/campaign?id=${id}`)
    const data = await res.json()
    setCampaign(data.campaign)
    setKols(data.kols || [])
    setLoading(false)
  }

  async function fetchAllKols() {
    const res = await fetch('/api/kol')
    const data = await res.json()
    setAllKols(data || [])
  }

  async function handleAddKol(e) {
    e.preventDefault()
    await fetch('/api/campaign/kol', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: id, ...formKol })
    })
    setFormKol({ kol_id: '', tanggal_kirim_barang: '', catatan: '' })
    setShowAddKol(false)
    fetchDetail()
  }

  async function handleUpdateTanggal(ckId, tanggal) {
    await fetch('/api/campaign/kol', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ckId, tanggal_kirim_barang: tanggal })
    })
    fetchDetail()
  }

  async function handleRemoveKol(ckId) {
    if (!confirm('Hapus KOL dari campaign ini?')) return
    await fetch(`/api/campaign/kol?id=${ckId}`, { method: 'DELETE' })
    fetchDetail()
  }

  function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(num || 0)
  }

  // Hitung statistik campaign
  const totalBudget = kols.reduce((sum, ck) => sum + (ck.kols?.total_biaya || 0), 0)
  const totalViews = kols.reduce((sum, ck) => sum + (ck.engagement?.views || 0), 0)
  const avgCpm = kols.length > 0
    ? kols.reduce((sum, ck) => sum + (ck.engagement?.cpm || 0), 0) / kols.filter(ck => ck.engagement?.cpm > 0).length || 0
    : 0

  // Export Excel
  function handleExport() {
    const exportData = kols.map(ck => ({
      'Nama KOL': ck.kols?.nama,
      'Platform': ck.kols?.platform,
      'Handle': '@' + ck.kols?.handle,
      'Niche': ck.kols?.niche || '-',
      'Fee KOL': ck.kols?.fee_kol,
      'Biaya Produk': ck.kols?.biaya_produk,
      'Total Biaya': ck.kols?.total_biaya,
      'Tanggal Kirim Barang': ck.tanggal_kirim_barang || '-',
      'Views': ck.engagement?.views || 0,
      'Likes': ck.engagement?.likes || 0,
      'Komentar': ck.engagement?.komentar || 0,
      'CPM': ck.engagement?.cpm || 0,
      'Kategori CPM': !ck.engagement?.cpm ? 'Belum ada data' :
        ck.engagement.cpm < 50000 ? 'Efisien' :
        ck.engagement.cpm <= 150000 ? 'Normal' : 'Mahal',
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, campaign?.nama || 'Campaign')
    XLSX.writeFile(wb, `Laporan_${campaign?.nama}_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`)
  }

  // KOL yang belum ada di campaign ini
  const kolsInCampaign = kols.map(ck => ck.kol_id)
  const availableKols = allKols.filter(k => !kolsInCampaign.includes(k.id))

  if (loading) return <div className="p-8 text-gray-400">Memuat data campaign...</div>

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400 mb-1">← <a href="/dashboard/campaign" className="hover:text-blue-600">Semua Campaign</a></div>
          <h1 className="text-2xl font-bold text-gray-800">{campaign?.nama}</h1>
          {campaign?.deskripsi && <p className="text-gray-500 text-sm mt-1">{campaign.deskripsi}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 
                       rounded-lg text-sm font-medium transition-colors">
            📥 Export Excel
          </button>
          <button onClick={() => setShowAddKol(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 
                       rounded-lg text-sm font-medium transition-colors">
            + Tambah KOL
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-blue-600">{kols.length}</div>
          <div className="text-sm text-gray-500 mt-1">👥 Total KOL</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-purple-600">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, notation: 'compact' }).format(totalBudget)}
          </div>
          <div className="text-sm text-gray-500 mt-1">💰 Total Budget</div>
        </div>
        <div className={`rounded-xl border p-5 ${avgCpm === 0 ? 'bg-white border-gray-200' : avgCpm < 50000 ? 'bg-green-50 border-green-200' : avgCpm <= 150000 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`text-3xl font-bold ${avgCpm === 0 ? 'text-gray-400' : avgCpm < 50000 ? 'text-green-600' : avgCpm <= 150000 ? 'text-yellow-600' : 'text-red-600'}`}>
            {avgCpm === 0 ? '-' : formatCPM(avgCpm)}
          </div>
          <div className="text-sm text-gray-500 mt-1">📊 Rata-rata CPM</div>
        </div>
      </div>

      {/* Tabel KOL dalam Campaign */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Daftar KOL dalam Campaign</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Nama KOL</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Platform</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Total Biaya</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Kirim Barang</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Views</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">CPM</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {kols.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                Belum ada KOL. Klik "+ Tambah KOL".
              </td></tr>
            ) : kols.map(ck => {
              const cpmInfo = kategoriCPM(ck.engagement?.cpm || 0)
              return (
                <tr key={ck.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{ck.kols?.nama}</td>
                  <td className="px-4 py-3">
                    {platformIcon[ck.kols?.platform]} {ck.kols?.platform}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatRupiah(ck.kols?.total_biaya)}</td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      defaultValue={ck.tanggal_kirim_barang || ''}
                      onBlur={e => handleUpdateTanggal(ck.id, e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs
                                 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ck.engagement?.views ? ck.engagement.views.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {ck.engagement?.cpm > 0 ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cpmInfo.class}`}>
                        {formatCPM(ck.engagement.cpm)}
                      </span>
                    ) : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleRemoveKol(ck.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium">
                      Hapus
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah KOL */}
      {showAddKol && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">Tambah KOL ke Campaign</h2>
            </div>
            <form onSubmit={handleAddKol} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih KOL *</label>
                <select value={formKol.kol_id}
                  onChange={e => setFormKol({...formKol, kol_id: e.target.value})}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Pilih KOL --</option>
                  {availableKols.map(kol => (
                    <option key={kol.id} value={kol.id}>
                      {platformIcon[kol.platform]} {kol.nama} (@{kol.handle})
                    </option>
                  ))}
                </select>
                {availableKols.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">Semua KOL sudah ada di campaign ini</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kirim Barang</label>
                <input type="date" value={formKol.tanggal_kirim_barang}
                  onChange={e => setFormKol({...formKol, tanggal_kirim_barang: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={formKol.catatan}
                  onChange={e => setFormKol({...formKol, catatan: e.target.value})}
                  placeholder="Catatan khusus untuk KOL ini..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white 
                             font-medium rounded-lg py-2.5 text-sm transition-colors">
                  Tambah KOL
                </button>
                <button type="button" onClick={() => setShowAddKol(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 
                             font-medium rounded-lg py-2.5 text-sm transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}