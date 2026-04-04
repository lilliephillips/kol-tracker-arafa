'use client'

import { useState, useEffect } from 'react'

const platformIcon = { tiktok: '🎵', instagram: '📸', youtube: '▶️' }

export default function PostingPage() {
  const [postings, setPostings] = useState([])
  const [kols, setKols] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [campaignKols, setCampaignKols] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCampaign, setFilterCampaign] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(null)
  const [linkInput, setLinkInput] = useState('')
  const [scraping, setScraping] = useState(null)
  const [form, setForm] = useState({
    kol_id: '', tanggal_deadline: '', catatan: '', campaign_kol_id: ''
  })

  useEffect(() => { fetchAll() }, [filterStatus, filterCampaign])

  async function fetchAll() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterCampaign) params.set('campaign_id', filterCampaign)

      const [postRes, kolRes, campRes] = await Promise.all([
        fetch('/api/posting?' + params),
        fetch('/api/kol'),
        fetch('/api/campaign'),
      ])

      const [postData, kolData, campData] = await Promise.all([
        postRes.json(),
        kolRes.json(),
        campRes.json(),
      ])

      setPostings(Array.isArray(postData) ? postData : [])
      setKols(Array.isArray(kolData) ? kolData : [])
      setCampaigns(Array.isArray(campData) ? campData : [])
    } catch (err) {
      console.error('fetchAll error:', err)
    }
    setLoading(false)
  }

  async function fetchCampaignKols(kolId) {
    if (!kolId) { setCampaignKols([]); return }
    try {
      const res = await fetch('/api/campaign/kol/by-kol?kol_id=' + kolId)
      const data = await res.json()
      setCampaignKols(Array.isArray(data) ? data : [])
    } catch {
      setCampaignKols([])
    }
  }

  async function handleTambahPosting(e) {
    e.preventDefault()
    try {
      await fetch('/api/posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      setForm({ kol_id: '', tanggal_deadline: '', catatan: '', campaign_kol_id: '' })
      setShowForm(false)
      fetchAll()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  async function handleInputLink(postingId) {
    if (!linkInput.trim()) return
    await fetch('/api/posting', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postingId, link_posting: linkInput })
    })
    setShowLinkForm(null)
    setLinkInput('')
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
      if (result.success) {
        alert('Data berhasil diperbarui!')
        fetchAll()
      } else {
        alert('Gagal: ' + result.error)
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setScraping(null)
  }

  async function handleDelete(id) {
    if (!confirm('Yakin hapus posting ini?')) return
    await fetch('/api/posting?id=' + id, { method: 'DELETE' })
    fetchAll()
  }

  function getDeadlineInfo(tanggal, status) {
    if (status === 'sudah' || !tanggal) return null
    const deadline = new Date(tanggal)
    const now = new Date()
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return { label: 'Terlambat ' + Math.abs(diffDays) + ' hari', cls: 'text-red-600 font-bold' }
    if (diffDays === 0) return { label: 'Hari ini!', cls: 'text-orange-600 font-bold' }
    if (diffDays <= 3) return { label: diffDays + ' hari lagi', cls: 'text-yellow-600' }
    return { label: diffDays + ' hari lagi', cls: 'text-gray-500' }
  }

  function formatTanggal(tgl) {
    if (!tgl) return '-'
    return new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const totalSudah = postings.filter(p => p.status === 'sudah').length
  const totalBelum = postings.filter(p => p.status === 'belum').length
  const totalOverdue = postings.filter(p => {
    if (p.status !== 'belum' || !p.tanggal_deadline) return false
    return new Date(p.tanggal_deadline) < new Date()
  }).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tracking Posting</h1>
          <p className="text-gray-500 text-sm mt-0.5">Monitor status posting KOL</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Tambah Posting
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-800">{totalSudah}</div>
          <div className="text-sm text-gray-500 mt-0.5">Sudah Posting</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">{totalBelum}</div>
          <div className="text-sm text-gray-500 mt-0.5">Belum Posting</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="text-2xl font-bold text-red-600">{totalOverdue}</div>
          <div className="text-sm text-red-500 mt-0.5">Overdue / Terlambat</div>
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        {[{v:'',l:'Semua'},{v:'belum',l:'Belum Posting'},{v:'sudah',l:'Sudah Posting'}].map(opt => (
          <button key={opt.v} onClick={() => setFilterStatus(opt.v)}
            className={'px-4 py-2 rounded-lg text-sm font-medium ' +
              (filterStatus === opt.v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600')}>
            {opt.l}
          </button>
        ))}
        <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Campaign</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>🎯 {c.nama}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Kode Unik</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">KOL</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Campaign</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Platform</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Deadline</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Sisa Waktu</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Status</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Link</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
            ) : postings.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Belum ada data posting.</td></tr>
            ) : postings.map(p => {
              const deadlineInfo = getDeadlineInfo(p.tanggal_deadline, p.status)
              const isOverdue = p.status === 'belum' && p.tanggal_deadline && new Date(p.tanggal_deadline) < new Date()
              return (
                <tr key={p.id} className={'border-b border-gray-100 ' + (isOverdue ? 'bg-red-50' : 'hover:bg-gray-50')}>
                  <td className="px-4 py-3">
                    {p.campaign_kol?.kode_unik
                      ? <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">{p.campaign_kol.kode_unik}</span>
                      : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{p.kols?.nama}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.campaign_kol?.campaigns?.nama
                      ? <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">🎯 {p.campaign_kol.campaigns.nama}</span>
                      : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {platformIcon[p.kols?.platform]} {p.kols?.platform}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatTanggal(p.tanggal_deadline)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {deadlineInfo
                      ? <span className={deadlineInfo.cls}>{deadlineInfo.label}</span>
                      : p.status === 'sudah'
                        ? <span className="text-green-600 text-xs">Posting: {formatTanggal(p.tanggal_posting)}</span>
                        : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' +
                      (p.status === 'sudah' ? 'bg-green-100 text-green-700' :
                       isOverdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}>
                      {p.status === 'sudah' ? 'Sudah' : isOverdue ? 'Overdue' : 'Belum'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.link_posting
                      ? <a href={p.link_posting} target="_blank" className="text-blue-600 hover:underline text-xs">Lihat Post</a>
                      : showLinkForm === p.id
                        ? <div className="flex gap-1 items-center">
                            <input type="url" value={linkInput} onChange={e => setLinkInput(e.target.value)}
                              placeholder="Paste URL..." className="border border-gray-300 rounded px-2 py-1 text-xs w-36 focus:outline-none" />
                            <button onClick={() => handleInputLink(p.id)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">✓</button>
                            <button onClick={() => { setShowLinkForm(null); setLinkInput('') }} className="text-gray-400 text-xs">✕</button>
                          </div>
                        : <button onClick={() => setShowLinkForm(p.id)} className="text-blue-600 text-xs font-medium">+ Input Link</button>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {p.status === 'sudah' && (
                        <button onClick={() => handleScrape(p.id)} disabled={scraping === p.id}
                          className="text-green-600 text-xs font-medium disabled:opacity-50">
                          {scraping === p.id ? 'Loading...' : 'Refresh Data'}
                        </button>
                      )}
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 text-xs font-medium">Hapus</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">Tambah Data Posting</h2>
            </div>
            <form onSubmit={handleTambahPosting} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih KOL *</label>
                <select value={form.kol_id}
                  onChange={e => { setForm({...form, kol_id: e.target.value, campaign_kol_id: ''}); fetchCampaignKols(e.target.value) }}
                  required className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Pilih KOL --</option>
                  {kols.map(k => <option key={k.id} value={k.id}>{platformIcon[k.platform]} {k.nama} (@{k.handle})</option>)}
                </select>
              </div>
              {campaignKols.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hubungkan ke Campaign (opsional)</label>
                  <select value={form.campaign_kol_id} onChange={e => setForm({...form, campaign_kol_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Tidak ada campaign --</option>
                    {campaignKols.map(ck => (
                      <option key={ck.id} value={ck.id}>
                        🎯 {ck.campaigns?.nama} — {ck.kode_unik}{ck.produk_variasi ? ' (' + ck.produk_variasi.nama_variasi + ')' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Deadline *</label>
                <input type="date" value={form.tanggal_deadline} onChange={e => setForm({...form, tanggal_deadline: e.target.value})}
                  required className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={form.catatan} onChange={e => setForm({...form, catatan: e.target.value})}
                  rows={3} placeholder="Catatan untuk KOL..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2.5 text-sm">Tambah Posting</button>
                <button type="button" onClick={() => { setShowForm(false); setForm({ kol_id: '', tanggal_deadline: '', catatan: '', campaign_kol_id: '' }) }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg py-2.5 text-sm">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
