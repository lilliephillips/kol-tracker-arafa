'use client'

import { useState, useEffect } from 'react'
import { kategoriCPM, formatCPM } from '@/lib/cpm'
import * as XLSX from 'xlsx'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { id } from 'date-fns/locale'

const BULAN = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
]

export default function LaporanPage() {
  const [data, setData] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCampaign, setFilterCampaign] = useState('')
  const [filterKirimMode, setFilterKirimMode] = useState('')
  const [filterKirimBulan, setFilterKirimBulan] = useState('')
  const [filterKirimFrom, setFilterKirimFrom] = useState(null)
  const [filterKirimTo, setFilterKirimTo] = useState(null)
  const [filterPostMode, setFilterPostMode] = useState('')
  const [filterPostBulan, setFilterPostBulan] = useState('')
  const [filterPostFrom, setFilterPostFrom] = useState(null)
  const [filterPostTo, setFilterPostTo] = useState(null)

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
        kolRes.json(), postRes.json(), engRes.json(), campRes.json(),
      ])

      setCampaigns(Array.isArray(camps) ? camps : [])

      const combined = (Array.isArray(kols) ? kols : []).map(kol => {
        const posting = (Array.isArray(postings) ? postings : []).find(p => p.kol_id === kol.id)
        const eng = posting ? (Array.isArray(engagements) ? engagements : []).find(e => e.posting_id === posting.id) : null
        const er = (eng?.views > 0)
          ? (((eng?.likes || 0) + (eng?.komentar || 0)) / eng.views * 100).toFixed(2)
          : null

        return {
          id: kol.id,
          nama: kol.nama,
          platform: kol.platform,
          handle: kol.handle,
          total_biaya: kol.total_biaya || 0,
          status_aktif: kol.status_aktif,
          status_posting: posting?.status || 'belum',
          link_posting: posting?.link_posting || '-',
          deadline: posting?.tanggal_deadline || '-',
          tanggal_dipost: posting?.tanggal_dipost || null,
          kode_unik: posting?.campaign_kol?.kode_unik || '-',
          nama_campaign: posting?.campaign_kol?.campaigns?.nama || '-',
          tanggal_kirim: posting?.campaign_kol?.tanggal_kirim_barang || null,
          views: eng?.views || 0,
          likes: eng?.likes || 0,
          komentar: eng?.komentar || 0,
          share: eng?.share || 0,
          cpm: eng?.cpm || 0,
          er: er,
        }
      })

      setData(combined)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  // Filter
  const filtered = data.filter(d => {
    if (filterPlatform && d.platform !== filterPlatform) return false
    if (filterStatus && d.status_posting !== filterStatus) return false
    if (filterCampaign && d.nama_campaign !== filterCampaign) return false

    if (filterKirimMode === 'bulan' && filterKirimBulan !== '') {
      if (!d.tanggal_kirim) return false
      if (new Date(d.tanggal_kirim).getMonth() !== parseInt(filterKirimBulan)) return false
    }
    if (filterKirimMode === 'range' && filterKirimFrom) {
      if (!d.tanggal_kirim) return false
      const tgl = new Date(d.tanggal_kirim)
      if (tgl < filterKirimFrom) return false
      if (filterKirimTo && tgl > filterKirimTo) return false
    }
    if (filterPostMode === 'bulan' && filterPostBulan !== '') {
      if (!d.tanggal_dipost) return false
      if (new Date(d.tanggal_dipost).getMonth() !== parseInt(filterPostBulan)) return false
    }
    if (filterPostMode === 'range' && filterPostFrom) {
      if (!d.tanggal_dipost) return false
      const tgl = new Date(d.tanggal_dipost)
      if (tgl < filterPostFrom) return false
      if (filterPostTo && tgl > filterPostTo) return false
    }
    return true
  })

  // KPI Stats
  const totalImpresi = filtered.reduce((s, d) => s + d.views, 0)
  const totalLikes = filtered.reduce((s, d) => s + d.likes, 0)
  const totalKomentar = filtered.reduce((s, d) => s + d.komentar, 0)
  const totalSpending = filtered.reduce((s, d) => s + d.total_biaya, 0)
  const totalSudah = filtered.filter(d => d.status_posting === 'sudah').length
  const totalBelum = filtered.filter(d => d.status_posting === 'belum').length
  const totalKol = filtered.length
  const ratioPosting = totalKol > 0 ? Math.round((totalSudah / totalKol) * 100) : 0
  const cpms = filtered.filter(d => d.cpm > 0).map(d => d.cpm)
  const avgCpm = cpms.length > 0 ? cpms.reduce((a, b) => a + b, 0) / cpms.length : 0
  const erAll = totalImpresi > 0 ? ((totalLikes + totalKomentar) / totalImpresi * 100).toFixed(2) : null
  const totalPostingan = filtered.filter(d => d.status_posting === 'sudah').length

  function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(num || 0)
  }

  function formatNumber(num) {
    if (!num || num === 0) return '-'
    return new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(num)
  }

  function formatTanggal(tgl) {
    if (!tgl) return '-'
    return new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function resetFilter() {
    setFilterPlatform(''); setFilterStatus(''); setFilterCampaign('')
    setFilterKirimMode(''); setFilterKirimBulan(''); setFilterKirimFrom(null); setFilterKirimTo(null)
    setFilterPostMode(''); setFilterPostBulan(''); setFilterPostFrom(null); setFilterPostTo(null)
  }

  function handleExport() {
    const exportData = filtered.map(d => ({
      'Kode Unik': d.kode_unik,
      'Campaign': d.nama_campaign,
      'Nama KOL': d.nama,
      'Platform': d.platform,
      'Handle': '@' + d.handle,
      'Total Biaya': d.total_biaya,
      'Status': d.status_posting,
      'Tgl Dipost': formatTanggal(d.tanggal_dipost),
      'Views': d.views,
      'Likes': d.likes,
      'Komentar': d.komentar,
      'ER (%)': d.er || 0,
      'CPM': d.cpm,
      'Kategori CPM': d.cpm === 0 ? 'Belum ada data' : d.cpm < 50000 ? 'Efisien' : d.cpm <= 150000 ? 'Normal' : 'Mahal',
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan KOL')
    ws['!cols'] = Object.keys(exportData[0] || {}).map(() => ({ wch: 20 }))
    XLSX.writeFile(wb, 'Laporan_KOL_' + new Date().toLocaleDateString('id-ID').replace(/\//g, '-') + '.xlsx')
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan KOL</h1>
          <p className="text-gray-600 text-sm mt-0.5">Data lengkap semua KOL dan performa</p>
        </div>
        <button onClick={handleExport} disabled={filtered.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium">
          📥 Export Excel
        </button>
      </div>

      {/* KPI Visual */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className="text-3xl font-bold text-blue-600">{formatNumber(totalImpresi)}</div>
          <div className="text-sm font-semibold text-gray-700 mt-1">👁️ Total Impressi</div>
          <div className="text-xs text-gray-500 mt-0.5">{totalImpresi.toLocaleString('id-ID')} views</div>
        </div>
        <div className={`rounded-xl border p-5 text-center ${
          avgCpm === 0 ? 'bg-white border-gray-200' :
          avgCpm < 50000 ? 'bg-green-50 border-green-200' :
          avgCpm <= 150000 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`text-3xl font-bold ${
            avgCpm === 0 ? 'text-gray-400' :
            avgCpm < 50000 ? 'text-green-600' :
            avgCpm <= 150000 ? 'text-yellow-600' : 'text-red-600'}`}>
            {avgCpm === 0 ? '-' : formatCPM(avgCpm)}
          </div>
          <div className="text-sm font-semibold text-gray-700 mt-1">📊 CPM Rata-rata</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {avgCpm === 0 ? 'Belum ada data' : avgCpm < 50000 ? '✅ Efisien' : avgCpm <= 150000 ? '⚠️ Normal' : '🔴 Mahal'}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className={`text-3xl font-bold ${
            ratioPosting >= 80 ? 'text-green-600' : ratioPosting >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {ratioPosting}%
          </div>
          <div className="text-sm font-semibold text-gray-700 mt-1">📝 Ratio Posting</div>
          <div className="text-xs text-gray-500 mt-0.5">{totalSudah} / {totalKol} KOL</div>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
            <div className={`h-2 rounded-full ${ratioPosting >= 80 ? 'bg-green-500' : ratioPosting >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: ratioPosting + '%' }} />
          </div>
        </div>
      </div>

      {/* Summary Cards 10 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: '💸 Total Spending', value: formatRupiah(totalSpending), cls: 'text-purple-600' },
          { label: '📝 Jumlah Postingan', value: totalPostingan, cls: 'text-blue-600' },
          { label: '👥 Jumlah KOL', value: totalKol, cls: 'text-blue-600' },
          { label: '⏳ Belum Posting', value: totalBelum, cls: 'text-yellow-600' },
          { label: '✅ Sudah Posting', value: totalSudah, cls: 'text-green-600' },
          { label: '👁️ Total Impressi', value: formatNumber(totalImpresi), cls: 'text-blue-600' },
          { label: '💬 Komentar', value: formatNumber(totalKomentar), cls: 'text-gray-700' },
          { label: '❤️ Total Likes', value: formatNumber(totalLikes), cls: 'text-pink-600' },
          { label: '📊 ER', value: erAll ? erAll + '%' : '-', cls: erAll && Number(erAll) > 3 ? 'text-green-600' : erAll ? 'text-yellow-600' : 'text-gray-400' },
          { label: '📈 CPM Rata-rata', value: avgCpm > 0 ? formatCPM(avgCpm) : '-', cls: 'text-blue-600' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={'text-xl font-bold ' + item.cls}>{item.value}</div>
            <div className="text-xs font-medium text-gray-600 mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-3 flex-wrap items-center">
          <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Semua Platform</option>
            <option value="tiktok">🎵 TikTok</option>
            <option value="instagram">📸 Instagram</option>
            <option value="youtube">▶️ YouTube</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Semua Status</option>
            <option value="sudah">✅ Sudah Posting</option>
            <option value="belum">⏳ Belum Posting</option>
          </select>
          <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Semua Campaign</option>
            {campaigns.map(c => <option key={c.id} value={c.nama}>🎯 {c.nama}</option>)}
          </select>

          {/* Filter Tgl Kirim */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Tgl Kirim:</span>
            <select value={filterKirimMode} onChange={e => { setFilterKirimMode(e.target.value); setFilterKirimBulan(''); setFilterKirimFrom(null); setFilterKirimTo(null) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Semua</option>
              <option value="bulan">Bulan</option>
              <option value="range">Range</option>
            </select>
            {filterKirimMode === 'bulan' && (
              <select value={filterKirimBulan} onChange={e => setFilterKirimBulan(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Pilih Bulan</option>
                {BULAN.map((b, i) => <option key={i} value={i}>{b}</option>)}
              </select>
            )}
            {filterKirimMode === 'range' && (
              <DatePicker selectsRange
                startDate={filterKirimFrom} endDate={filterKirimTo}
                onChange={([start, end]) => { setFilterKirimFrom(start); setFilterKirimTo(end) }}
                locale={id} dateFormat="dd/MM/yyyy" placeholderText="Pilih range tanggal"
                isClearable showMonthDropdown showYearDropdown dropdownMode="select"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none w-52" />
            )}
          </div>

          {/* Filter Tgl Dipost */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Tgl Dipost:</span>
            <select value={filterPostMode} onChange={e => { setFilterPostMode(e.target.value); setFilterPostBulan(''); setFilterPostFrom(null); setFilterPostTo(null) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Semua</option>
              <option value="bulan">Bulan</option>
              <option value="range">Range</option>
            </select>
            {filterPostMode === 'bulan' && (
              <select value={filterPostBulan} onChange={e => setFilterPostBulan(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Pilih Bulan</option>
                {BULAN.map((b, i) => <option key={i} value={i}>{b}</option>)}
              </select>
            )}
            {filterPostMode === 'range' && (
              <DatePicker selectsRange
                startDate={filterPostFrom} endDate={filterPostTo}
                onChange={([start, end]) => { setFilterPostFrom(start); setFilterPostTo(end) }}
                locale={id} dateFormat="dd/MM/yyyy" placeholderText="Pilih range tanggal"
                isClearable showMonthDropdown showYearDropdown dropdownMode="select"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none w-52" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Menampilkan {filtered.length} KOL</span>
            {(filterPlatform || filterStatus || filterCampaign || filterKirimMode || filterPostMode) && (
              <button onClick={resetFilter}
                className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50">
                ✕ Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Kode Unik</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Campaign</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Nama KOL</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Platform</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Total Biaya</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Status</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Tgl Dipost</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Views</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Likes</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Komentar</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">ER</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">CPM</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Kategori</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} className="text-center py-12 text-gray-500">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={13} className="text-center py-12 text-gray-500">Tidak ada data</td></tr>
            ) : filtered.map(d => {
              const cpmInfo = kategoriCPM(d.cpm)
              return (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {d.kode_unik !== '-'
                      ? <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-mono">{d.kode_unik}</span>
                      : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {d.nama_campaign !== '-'
                      ? <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">🎯 {d.nama_campaign}</span>
                      : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{d.nama}</td>
                  <td className="px-4 py-3 text-gray-700 capitalize whitespace-nowrap">{d.platform}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatRupiah(d.total_biaya)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' +
                      (d.status_posting === 'sudah' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                      {d.status_posting === 'sudah' ? '✅ Sudah' : '⏳ Belum'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">{formatTanggal(d.tanggal_dipost)}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatNumber(d.views)}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatNumber(d.likes)}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatNumber(d.komentar)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {d.er ? (
                      <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' +
                        (Number(d.er) > 3 ? 'bg-green-100 text-green-700' :
                         Number(d.er) >= 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                        {d.er}%
                      </span>
                    ) : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {d.cpm > 0 ? formatCPM(d.cpm) : <span className="text-gray-400 text-xs">-</span>}
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
