'use client'

import { useState, useEffect } from 'react'

const platformIcon = { tiktok: '🎵', instagram: '📸', youtube: '▶️' }

const BULAN = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
]

export default function PostingPage() {
  const [postings, setPostings] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [bulkCampaign, setBulkCampaign] = useState('')
  const [showBulkCampaign, setShowBulkCampaign] = useState(false)

  // Filter state
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCampaign, setFilterCampaign] = useState('')
  const [filterKirimMode, setFilterKirimMode] = useState('') // 'bulan' or 'range'
  const [filterKirimBulan, setFilterKirimBulan] = useState('')
  const [filterKirimFrom, setFilterKirimFrom] = useState('')
  const [filterKirimTo, setFilterKirimTo] = useState('')
  const [filterPostMode, setFilterPostMode] = useState('')
  const [filterPostBulan, setFilterPostBulan] = useState('')
  const [filterPostFrom, setFilterPostFrom] = useState('')
  const [filterPostTo, setFilterPostTo] = useState('')

  // Link input state
  const [showLinkForm, setShowLinkForm] = useState(null)
  const [linkInput, setLinkInput] = useState('')
  const [tanggalDipost, setTanggalDipost] = useState('')
  const [scraping, setScraping] = useState(null)

  useEffect(() => { fetchAll() }, [filterStatus, filterCampaign])

  async function fetchAll() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterCampaign) params.set('campaign_id', filterCampaign)

      const [postRes, campRes] = await Promise.all([
        fetch('/api/posting?' + params),
        fetch('/api/campaign'),
      ])

      const [postData, campData] = await Promise.all([
        postRes.json(),
        campRes.json(),
      ])

      setPostings(Array.isArray(postData) ? postData : [])
      setCampaigns(Array.isArray(campData) ? campData : [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  // Filter tanggal di frontend
  const filtered = postings.filter(p => {
    if (filterKirimMode === 'bulan' && filterKirimBulan) {
      const tgl = p.campaign_kol?.tanggal_kirim_barang
      if (!tgl) return false
      const bulan = new Date(tgl).getMonth()
      if (bulan !== parseInt(filterKirimBulan)) return false
    }
    if (filterKirimMode === 'range' && filterKirimFrom && filterKirimTo) {
      const tgl = p.campaign_kol?.tanggal_kirim_barang
      if (!tgl || tgl < filterKirimFrom || tgl > filterKirimTo) return false
    }
    if (filterPostMode === 'bulan' && filterPostBulan) {
      const tgl = p.tanggal_dipost
      if (!tgl) return false
      const bulan = new Date(tgl).getMonth()
      if (bulan !== parseInt(filterPostBulan)) return false
    }
    if (filterPostMode === 'range' && filterPostFrom && filterPostTo) {
      const tgl = p.tanggal_dipost
      if (!tgl || tgl < filterPostFrom || tgl > filterPostTo) return false
    }
    return true
  })

  const totalSudah = filtered.filter(p => p.status === 'sudah').length
  const totalBelum = filtered.filter(p => p.status === 'belum').length
  const totalOverdue = filtered.filter(p => {
    if (p.status !== 'belum' || !p.tanggal_deadline) return false
    return new Date(p.tanggal_deadline) < new Date()
  }).length
  const total = filtered.length
  const pctPosting = total > 0 ? Math.round((totalSudah / total) * 100) : 0

  async function handleInputLink(postingId) {
    if (!linkInput.trim()) return
    await fetch('/api/posting', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: postingId,
        link_posting: linkInput,
        tanggal_dipost: tanggalDipost || new Date().toISOString().split('T')[0]
      })
    })
    setShowLinkForm(null)
    setLinkInput('')
    setTanggalDipost('')
    fetchAll()
  }

  async function handleScrape(postingId) {
    setScraping(postingId)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posting_id: postingId })
      })
      const result = await res.json()
      if (result.success) { alert('Data berhasil diperbarui!'); fetchAll() }
      else alert('Gagal: ' + result.error)
    } catch (err) { alert('Error: ' + err.message) }
    setScraping(null)
  }

  async function handleBulkScrape() {
    if (selected.length === 0) return
    if (!confirm('Refresh data ' + selected.length + ' posting?')) return
    for (const id of selected) {
      await handleScrape(id)
    }
    setSelected([])
  }

  async function handleBulkPindahCampaign() {
    if (!bulkCampaign) { alert('Pilih campaign dulu'); return }
    const camp = campaigns.find(c => c.id === bulkCampaign)
    if (!camp) return
    // Update campaign_kol untuk posting yang dipilih
    for (const postingId of selected) {
      await fetch('/api/posting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postingId, target_campaign_id: bulkCampaign })
      })
    }
    setSelected([])
    setShowBulkCampaign(false)
    setBulkCampaign('')
    fetchAll()
    alert('Berhasil dipindahkan ke campaign ' + camp.nama)
  }

  async function handleDelete(id) {
    if (!confirm('Yakin hapus posting ini?')) return
    await fetch('/api/posting?id=' + id, { method: 'DELETE' })
    fetchAll()
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  function toggleSelectAll() {
    if (selected.length === filtered.length) setSelected([])
    else setSelected(filtered.map(p => p.id))
  }

  function formatTanggal(tgl) {
    if (!tgl) return '-'
    return new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function getDeadlineInfo(tanggal, status) {
    if (status === 'sudah' || !tanggal) return null
    const deadline = new Date(tanggal)
    const now = new Date()
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return { label: 'Terlambat ' + Math.abs(diffDays) + 'h', cls: 'text-red-600 font-bold' }
    if (diffDays === 0) return { label: 'Hari ini!', cls: 'text-orange-600 font-bold' }
    if (diffDays <= 3) return { label: diffDays + ' hari lagi', cls: 'text-yellow-600' }
    return { label: diffDays + ' hari lagi', cls: 'text-gray-600' }
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tracking Posting</h1>
          <p className="text-gray-600 text-sm mt-0.5">Monitor status posting KOL</p>
        </div>
      </div>

      {/* KPI Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-800">📊 Progress Posting KOL</span>
          <span className="text-sm font-semibold text-gray-800">{totalSudah} / {total} sudah posting</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4">
          <div className={'h-4 rounded-full transition-all ' +
            (pctPosting >= 80 ? 'bg-green-500' : pctPosting >= 50 ? 'bg-yellow-500' : 'bg-red-500')}
            style={{ width: pctPosting + '%' }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className={'text-sm font-bold ' +
            (pctPosting >= 80 ? 'text-green-600' : pctPosting >= 50 ? 'text-yellow-600' : 'text-red-600')}>
            {pctPosting}% selesai
          </span>
          <span className="text-xs text-gray-500">{totalBelum} belum posting</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{totalSudah}</div>
          <div className="text-sm font-medium text-gray-700 mt-0.5">✅ Sudah Posting</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">{totalBelum}</div>
          <div className="text-sm font-medium text-gray-700 mt-0.5">⏳ Belum Posting</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="text-2xl font-bold text-red-600">{totalOverdue}</div>
          <div className="text-sm font-medium text-red-600 mt-0.5">🚨 Overdue</div>
        </div>
      </div>

     {/* Filter - semua horizontal */}
<div className="bg-white rounded-xl border border-gray-200 p-4">
  <div className="flex gap-3 flex-wrap items-center">
    
    {/* Status */}
    {[{v:'',l:'Semua'},{v:'belum',l:'Belum'},{v:'sudah',l:'Sudah'}].map(opt => (
      <button key={opt.v} onClick={() => setFilterStatus(opt.v)}
        className={'px-3 py-2 rounded-lg text-sm font-medium ' +
          (filterStatus === opt.v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
        {opt.l}
      </button>
    ))}

    {/* Campaign */}
    <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
      <option value="">Semua Campaign</option>
      {campaigns.map(c => <option key={c.id} value={c.id}>🎯 {c.nama}</option>)}
    </select>

    {/* Filter Tgl Kirim */}
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Tgl Kirim:</span>
      <select value={filterKirimMode} onChange={e => { setFilterKirimMode(e.target.value); setFilterKirimBulan(''); setFilterKirimFrom(''); setFilterKirimTo('') }}
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
        <div className="flex items-center gap-1">
          <input type="date" value={filterKirimFrom} onChange={e => setFilterKirimFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-gray-500 text-sm">–</span>
          <input type="date" value={filterKirimTo} onChange={e => setFilterKirimTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}
    </div>

    {/* Filter Tgl Dipost */}
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Tgl Dipost:</span>
      <select value={filterPostMode} onChange={e => { setFilterPostMode(e.target.value); setFilterPostBulan(''); setFilterPostFrom(''); setFilterPostTo('') }}
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
        <div className="flex items-center gap-1">
          <input type="date" value={filterPostFrom} onChange={e => setFilterPostFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-gray-500 text-sm">–</span>
          <input type="date" value={filterPostTo} onChange={e => setFilterPostTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}
    </div>

    {/* Reset Filter */}
    {(filterStatus || filterCampaign || filterKirimMode || filterPostMode) && (
      <button onClick={() => {
        setFilterStatus(''); setFilterCampaign('')
        setFilterKirimMode(''); setFilterKirimBulan(''); setFilterKirimFrom(''); setFilterKirimTo('')
        setFilterPostMode(''); setFilterPostBulan(''); setFilterPostFrom(''); setFilterPostTo('')
      }}
        className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50">
        ✕ Reset Filter
      </button>
    )}
  </div>
</div>

      {/* Bulk Action Bar */}
      {selected.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-blue-800">{selected.length} dipilih</span>
          <button onClick={handleBulkScrape}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            🔄 Refresh Data Terpilih
          </button>
          <button onClick={() => setShowBulkCampaign(!showBulkCampaign)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            🎯 Pindah ke Campaign
          </button>
          {showBulkCampaign && (
            <div className="flex gap-2 items-center">
              <select value={bulkCampaign} onChange={e => setBulkCampaign(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Pilih Campaign --</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
              </select>
              <button onClick={handleBulkPindahCampaign}
                className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg text-sm font-medium">
                Pindahkan
              </button>
            </div>
          )}
          <button onClick={() => { setSelected([]); setShowBulkCampaign(false) }}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium">
            ✕ Batal
          </button>
        </div>
      )}

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox"
                  checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300" />
              </th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Kode Unik</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">KOL</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Campaign</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Platform</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Tgl Kirim</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Deadline</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Sisa Waktu</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Status</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Tgl Dipost</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">URL Posting</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="text-center py-12 text-gray-500">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={12} className="text-center py-12 text-gray-500">Belum ada data posting.</td></tr>
            ) : filtered.map(p => {
              const deadlineInfo = getDeadlineInfo(p.tanggal_deadline, p.status)
              const isOverdue = p.status === 'belum' && p.tanggal_deadline && new Date(p.tanggal_deadline) < new Date()
              const tglKirim = p.campaign_kol?.tanggal_kirim_barang

              return (
                <tr key={p.id}
                  className={'border-b border-gray-100 ' + (isOverdue ? 'bg-red-50' : 'hover:bg-gray-50')}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.includes(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3">
                    {p.campaign_kol?.kode_unik
                      ? <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-mono">{p.campaign_kol.kode_unik}</span>
                      : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{p.kols?.nama}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.campaign_kol?.campaigns?.nama
                      ? <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">🎯 {p.campaign_kol.campaigns.nama}</span>
                      : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {platformIcon[p.kols?.platform]} {p.kols?.platform}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">{formatTanggal(tglKirim)}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatTanggal(p.tanggal_deadline)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {deadlineInfo
                      ? <span className={deadlineInfo.cls + ' text-xs'}>{deadlineInfo.label}</span>
                      : p.status === 'sudah'
                        ? <span className="text-green-600 text-xs">✅ Selesai</span>
                        : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' +
                      (p.status === 'sudah' ? 'bg-green-100 text-green-700' :
                       isOverdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}>
                      {p.status === 'sudah' ? 'Sudah' : isOverdue ? 'Overdue' : 'Belum'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">{formatTanggal(p.tanggal_dipost)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.link_posting ? (
                      <a href={p.link_posting} target="_blank"
                        className="text-blue-600 hover:underline text-xs font-medium">Lihat Post →</a>
                    ) : showLinkForm === p.id ? (
                      <div className="space-y-2">
                        <input type="date" value={tanggalDipost}
                          onChange={e => setTanggalDipost(e.target.value)}
                          placeholder="Tgl dipost"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 focus:outline-none" />
                        <div className="flex gap-1">
                          <input type="url" value={linkInput}
                            onChange={e => setLinkInput(e.target.value)}
                            placeholder="Paste URL..."
                            className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 w-36 focus:outline-none" />
                          <button onClick={() => handleInputLink(p.id)}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs">✓</button>
                          <button onClick={() => { setShowLinkForm(null); setLinkInput(''); setTanggalDipost('') }}
                            className="text-gray-500 text-xs px-1">✕</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowLinkForm(p.id)}
                        className="text-blue-600 text-xs font-medium hover:text-blue-800">
                        + Input Link
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {p.status === 'sudah' && (
                        <button onClick={() => handleScrape(p.id)} disabled={scraping === p.id}
                          className="text-green-600 text-xs font-medium disabled:opacity-50 hover:text-green-800">
                          {scraping === p.id ? '⏳' : '🔄'} Refresh
                        </button>
                      )}
                      <button onClick={() => handleDelete(p.id)}
                        className="text-red-500 text-xs font-medium hover:text-red-700">
                        Hapus
                      </button>
                    </div>
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
