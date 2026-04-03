'use client'

import { useState, useEffect, useCallback } from 'react'
import { kategoriCPM, formatCPM, hitungCPM } from '@/lib/cpm'
import * as XLSX from 'xlsx'

// ─── CONSTANTS ───────────────────────────────────────────────
const PLATFORM_LABEL = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube' }

// ─── URL NORMALIZER ──────────────────────────────────────────
function normalizeUrl(url) {
  let u = url.trim().toLowerCase()
  u = u.replace(/^https?:\/\//, '')
  u = u.replace(/^www\./, '')
  u = u.split('?')[0]
  u = u.split('#')[0]
  u = u.replace(/\/+$/, '')
  return u
}

// ─── FORMAT HELPERS ──────────────────────────────────────────
function formatTanggal(tgl) {
  if (!tgl) return '-'
  return new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0)
}

function formatNumber(num) {
  if (!num || num === 0) return '-'
  return new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(num)
}

function getSisaWaktu(deadline, statusPosting) {
  if (statusPosting === 'sudah' || !deadline) return null
  const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: `Overdue ${Math.abs(diff)}h`, cls: 'text-red-600 font-bold', urgency: 0 }
  if (diff === 0) return { label: 'Hari ini!', cls: 'text-red-600 font-bold', urgency: 1 }
  if (diff <= 3) return { label: `${diff} hari (H-${diff})`, cls: 'text-yellow-600 font-semibold', urgency: 2 }
  return { label: `${diff} hari`, cls: 'text-gray-500', urgency: 3 }
}

// ─── BADGE ───────────────────────────────────────────────────
function Badge({ children, color = 'gray' }) {
  const colors = {
    green:  'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red:    'bg-red-100 text-red-700',
    blue:   'bg-blue-50 text-blue-700',
    gray:   'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

// ─── PLATFORM PILLS ──────────────────────────────────────────
function PlatformPills({ platforms }) {
  if (!platforms || platforms.length === 0) return <span className="text-gray-400 text-xs">-</span>
  return (
    <div className="flex gap-1 flex-wrap">
      {[...new Set(platforms)].map(p => (
        <span key={p} className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded font-medium">
          {PLATFORM_LABEL[p] || p}
        </span>
      ))}
    </div>
  )
}
// ─── TOMBOL TANDAI KIRIM ─────────────────────────────────────
function TandaiKirimButton({ ckId, kolNama, onDone }) {
  const [showForm, setShowForm] = useState(false)
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  async function handleSimpan() {
    setSaving(true)
    const res = await fetch('/api/campaign/kol', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ckId,
        status_kirim: 'sudah',
        tanggal_kirim: tanggal
      })
    })
    const result = await res.json()
    if (result.error) {
      alert('Error: ' + result.error)
    } else {
      setShowForm(false)
      onDone()
    }
    setSaving(false)
  }

  if (!showForm) {
    return (
      <button
        onClick={e => { e.stopPropagation(); setShowForm(true) }}
        className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-lg font-medium whitespace-nowrap">
        📦 Tandai Kirim
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <input
        type="date"
        value={tanggal}
        onChange={e => setTanggal(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 w-32"
      />
      <button
        onClick={handleSimpan}
        disabled={saving}
        className="text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-2 py-1 rounded font-medium">
        {saving ? '...' : 'Simpan'}
      </button>
      <button
        onClick={() => setShowForm(false)}
        className="text-xs text-gray-400 hover:text-gray-600 px-1">
        ✕
      </button>
    </div>
  )
}

// ─── TOMBOL SCRAPE APIFY ─────────────────────────────────────
function ScrapeButton({ onDone }) {
  const [status, setStatus] = useState(null)
  const [result, setResult] = useState(null)

  async function handleScrape() {
    setStatus('loading')
    setResult(null)
    try {
      const res = await fetch('/api/scrape-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (data.error) {
        setStatus('error')
        setResult(data.error)
      } else {
        setStatus('done')
        setResult(`${data.updated} link berhasil diupdate dari ${data.total_links} link`)
        onDone()
      }
    } catch (err) {
      setStatus('error')
      setResult(err.message)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleScrape}
        disabled={status === 'loading'}
        className="border border-blue-200 text-blue-600 rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
        {status === 'loading'
          ? <><span className="animate-spin inline-block">⏳</span> Sedang scraping...</>
          : '🔄 Ambil Data Views'}
      </button>
      {status === 'done' && (
        <span className="text-xs text-green-600 font-medium">✅ {result}</span>
      )}
      {status === 'error' && (
        <span className="text-xs text-red-600">❌ {result}</span>
      )}
    </div>
  )
}

// ─── KOL ROW (expandable) ────────────────────────────────────
function KolRow({ ck, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [links, setLinks] = useState([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [addForm, setAddForm] = useState(false)
  const [newPlatform, setNewPlatform] = useState('tiktok')
  const [newUrl, setNewUrl] = useState('')
  const [newTanggal, setNewTanggal] = useState(new Date().toISOString().split('T')[0])
  const [urlValidation, setUrlValidation] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editUrl, setEditUrl] = useState('')
  const [editPlatform, setEditPlatform] = useState('')
  const [editTanggal, setEditTanggal] = useState('')
  const [editValidation, setEditValidation] = useState(null)
  const [saving, setSaving] = useState(false)

  const deadline = ck.tanggal_kirim
    ? new Date(new Date(ck.tanggal_kirim).getTime() + 14 * 86400000)
    : null
  const sisaWaktu = getSisaWaktu(deadline, ck.status_posting)
  const isOverdue = sisaWaktu?.urgency === 0
  const isSoon = sisaWaktu?.urgency === 1 || sisaWaktu?.urgency === 2

  async function loadLinks() {
    setLoadingLinks(true)
    const res = await fetch(`/api/posting-links?campaign_kol_id=${ck.id}`)
    const data = await res.json()
    setLinks(Array.isArray(data) ? data : [])
    setLoadingLinks(false)
  }

  function handleExpand() {
    setExpanded(!expanded)
    if (!expanded && links.length === 0) loadLinks()
  }

  async function validateUrl(url, excludeId = null) {
    if (!url.trim()) { setUrlValidation(null); return }
    setUrlValidation({ checking: true })
    const res = await fetch(`/api/posting-links?check_url=${encodeURIComponent(url)}`)
    const data = await res.json()
    const normalized = normalizeUrl(url)
    if (data.is_duplicate) {
      const isSameKol = data.existing?.campaign_kol_id === ck.id && data.existing?.id !== excludeId
      setUrlValidation({
        ok: false,
        type: isSameKol ? 'same_kol' : 'other_kol',
        msg: isSameKol
          ? 'Link ini sudah ada di KOL yang sama. Tidak bisa disimpan.'
          : `Link sudah digunakan KOL lain: ${data.existing?.campaign_kol?.kols?.nama || 'KOL lain'}. Yakin ingin menyimpan?`,
        canSave: !isSameKol
      })
    } else {
      setUrlValidation({ ok: true, msg: `✓ URL valid → ${normalized}` })
    }
  }

  async function handleAddLink() {
    if (!newUrl.trim() || urlValidation?.type === 'same_kol') return
    setSaving(true)
    const res = await fetch('/api/posting-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_kol_id: ck.id,
        platform: newPlatform,
        url: newUrl,
        tanggal_dipost: newTanggal
      })
    })
    if (res.ok) {
      setNewUrl('')
      setNewTanggal(new Date().toISOString().split('T')[0])
      setAddForm(false)
      setUrlValidation(null)
      await loadLinks()
      onRefresh()
    }
    setSaving(false)
  }

  async function handleEditSave(linkId) {
    if (!editUrl.trim() || editValidation?.type === 'same_kol') return
    setSaving(true)
    const res = await fetch('/api/posting-links', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: linkId, platform: editPlatform, url: editUrl, tanggal_dipost: editTanggal })
    })
    if (res.ok) {
      setEditingId(null)
      setEditValidation(null)
      await loadLinks()
    }
    setSaving(false)
  }

  async function handleDeleteLink(linkId) {
    if (!confirm('Hapus link ini?')) return
    await fetch(`/api/posting-links?id=${linkId}`, { method: 'DELETE' })
    await loadLinks()
    onRefresh()
  }

  function startEdit(link) {
    setEditingId(link.id)
    setEditUrl(link.url_original)
    setEditPlatform(link.platform)
    setEditTanggal(link.tanggal_dipost || '')
    setEditValidation(null)
  }

  const totalViews = links.reduce((s, l) => s + (l.views || 0), 0)
  const cpm = hitungCPM(ck.total_biaya || 0, totalViews)
  const cpmInfo = kategoriCPM(cpm)
  const linksWithoutViews = links.filter(l => !l.views || l.views === 0).length
  const platforms = links.map(l => l.platform)
  const rowBg = isOverdue ? 'bg-red-50' : isSoon ? 'bg-yellow-50' : 'hover:bg-gray-50'

  return (
    <>
      <tr className={`border-b border-gray-100 cursor-pointer ${rowBg}`} onClick={handleExpand}>
        <td className="px-4 py-3">
          <span className="text-gray-400 text-xs">{expanded ? '▼' : '▶'}</span>
        </td>
        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
          <div>{ck.kols?.nama}</div>
          <PlatformPills platforms={platforms.length > 0 ? platforms : ck.kols?.platform ? [ck.kols.platform] : []} />
        </td>
        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          {ck.status_kirim === 'sudah'
            ? <span className="text-green-600 text-xs font-medium">✅ {ck.tanggal_kirim || '-'}</span>
            : <TandaiKirimButton ckId={ck.id} kolNama={ck.kols?.nama} onDone={onRefresh} />}
        </td>
        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatTanggal(ck.tanggal_kirim)}</td>
        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
          {deadline ? formatTanggal(deadline) : <span className="text-gray-400">—</span>}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {sisaWaktu
            ? <span className={`text-xs ${sisaWaktu.cls}`}>{sisaWaktu.label}</span>
            : ck.status_posting === 'sudah'
              ? <span className="text-green-600 text-xs">✅ Selesai</span>
              : <span className="text-gray-400 text-xs">Menunggu kirim</span>}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`text-xs font-medium ${links.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
            {links.length > 0 ? `${links.length} link` : '0 link'}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {ck.status_posting === 'sudah'
            ? <Badge color="green">Sudah</Badge>
            : isOverdue ? <Badge color="red">Overdue</Badge>
            : <Badge color="yellow">Belum</Badge>}
        </td>
        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
          {formatRupiah(ck.total_biaya || 0)}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={9} className="bg-gray-50 px-0 py-0 border-b border-gray-200">
            <div className="px-8 py-4 space-y-3">

              {ck.status_kirim !== 'sudah' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                  ⚠️ Produk belum dikirim — input link tersedia setelah produk ditandai sudah kirim.
                </div>
              )}

              {loadingLinks ? (
                <div className="text-sm text-gray-500">Memuat link...</div>
              ) : links.length === 0 && ck.status_kirim === 'sudah' ? (
                <div className="text-sm text-gray-400">Belum ada link yang disubmit.</div>
              ) : (
                <div className="space-y-2">
                  {links.map(link => (
                    <div key={link.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      {editingId !== link.id && (
                        <div className="grid grid-cols-[80px_1fr_90px_120px_70px_70px] gap-3 items-center px-3 py-2.5 text-sm">
                          <span className="text-xs font-medium text-gray-500">{PLATFORM_LABEL[link.platform]}</span>
                          <a href={link.url_original} target="_blank" rel="noreferrer"
                            className="text-blue-600 text-xs hover:underline truncate" onClick={e => e.stopPropagation()}>
                            {link.url_normalized}
                          </a>
                          <span className="text-xs text-gray-500">{formatTanggal(link.tanggal_dipost)}</span>
                          <span className={`text-xs font-medium ${link.views ? 'text-gray-900' : 'text-gray-400'}`}>
                            {link.views ? formatNumber(link.views) + ' views' : 'Belum diambil'}
                          </span>
                          <button onClick={e => { e.stopPropagation(); startEdit(link) }}
                            className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded px-2 py-1">
                            Edit
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDeleteLink(link.id) }}
                            className="text-xs text-red-500 hover:text-red-700 border border-red-100 rounded px-2 py-1">
                            Hapus
                          </button>
                        </div>
                      )}
                      {editingId === link.id && (
                        <div className="bg-blue-50 p-3 space-y-2" onClick={e => e.stopPropagation()}>
                          <div className="grid grid-cols-[80px_1fr_110px_auto_auto] gap-2 items-start">
                            <select value={editPlatform} onChange={e => setEditPlatform(e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800">
                              <option value="tiktok">TikTok</option>
                              <option value="instagram">Instagram</option>
                              <option value="youtube">YouTube</option>
                            </select>
                            <div>
                              <input type="text" value={editUrl}
                                onChange={e => { setEditUrl(e.target.value); validateUrl(e.target.value, link.id) }}
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800"
                                placeholder="URL posting" />
                              {editValidation && (
                                <div className={`mt-1 text-xs px-2 py-1 rounded ${editValidation.ok ? 'bg-green-50 text-green-700' : editValidation.canSave ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                                  {editValidation.msg}
                                </div>
                              )}
                            </div>
                            <input type="date" value={editTanggal} onChange={e => setEditTanggal(e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800" />
                            <button onClick={() => handleEditSave(link.id)}
                              disabled={saving || editValidation?.type === 'same_kol'}
                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs px-3 py-1.5 rounded font-medium">
                              Simpan
                            </button>
                            <button onClick={() => { setEditingId(null); setEditValidation(null) }}
                              className="text-gray-500 text-xs border border-gray-200 px-3 py-1.5 rounded">
                              Batal
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {ck.status_kirim === 'sudah' && (
                <div>
                  {!addForm ? (
                    <button onClick={e => { e.stopPropagation(); setAddForm(true) }}
                      className="text-blue-600 text-xs font-medium hover:text-blue-800">
                      + Tambah link posting
                    </button>
                  ) : (
                    <div className="bg-white border border-dashed border-gray-300 rounded-lg p-3 space-y-2"
                      onClick={e => e.stopPropagation()}>
                      <div className="grid grid-cols-[80px_1fr_110px_auto] gap-2 items-start">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400 font-medium">Platform</label>
                          <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800">
                            <option value="tiktok">TikTok</option>
                            <option value="instagram">Instagram</option>
                            <option value="youtube">YouTube</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400 font-medium">URL posting</label>
                          <input type="text" value={newUrl}
                            onChange={e => { setNewUrl(e.target.value); validateUrl(e.target.value) }}
                            placeholder="Paste URL link posting..."
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800" />
                          {urlValidation && !urlValidation.checking && (
                            <div className={`text-xs px-2 py-1 rounded mt-0.5 ${urlValidation.ok ? 'bg-green-50 text-green-700' : urlValidation.canSave ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                              {urlValidation.msg}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400 font-medium">Tanggal dipost</label>
                          <input type="date" value={newTanggal} onChange={e => setNewTanggal(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800" />
                        </div>
                        <div className="flex flex-col gap-1 justify-end">
                          <label className="text-xs text-transparent">.</label>
                          <button onClick={handleAddLink}
                            disabled={saving || !newUrl.trim() || urlValidation?.type === 'same_kol'}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs px-4 py-1.5 rounded font-medium">
                            {saving ? 'Menyimpan...' : 'Simpan'}
                          </button>
                        </div>
                      </div>
                      <button onClick={() => { setAddForm(false); setNewUrl(''); setUrlValidation(null) }}
                        className="text-gray-400 text-xs hover:text-gray-600">
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              )}

              {links.length > 0 && (
                <div className="flex gap-4 items-center bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm w-fit">
                  <div>
                    <div className="text-xs text-gray-400">Total Biaya</div>
                    <div className="font-medium text-sm">{formatRupiah(ck.total_biaya || 0)}</div>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div>
                    <div className="text-xs text-gray-400">Total Views</div>
                    <div className="font-medium text-sm">{totalViews > 0 ? formatNumber(totalViews) : '-'}</div>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div>
                    <div className="text-xs text-gray-400">CPM</div>
                    <div className={`font-medium text-sm ${cpm > 0 ? (cpm < 50000 ? 'text-green-600' : cpm <= 150000 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-400'}`}>
                      {cpm > 0 ? formatCPM(cpm) : '-'}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div>
                    <div className="text-xs text-gray-400">Kategori</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cpmInfo.class}`}>{cpmInfo.label}</span>
                  </div>
                  {linksWithoutViews > 0 && (
                    <>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="text-xs text-gray-400">{linksWithoutViews} link belum ada data views</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── HALAMAN UTAMA ────────────────────────────────────────────
export default function TrackingLaporanPage() {
  const [mode, setMode] = useState('operasional')
  const [viewLaporan, setViewLaporan] = useState('manager')
  const [campaignKols, setCampaignKols] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCampaign, setFilterCampaign] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [ckRes, campRes] = await Promise.all([
        fetch('/api/campaign/kol'),
        fetch('/api/campaign'),
      ])
      const [ckData, campData] = await Promise.all([ckRes.json(), campRes.json()])
      setCampaignKols(Array.isArray(ckData) ? ckData : [])
      setCampaigns(Array.isArray(campData) ? campData : [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const enriched = campaignKols.map(ck => {
    const deadline = ck.tanggal_kirim
      ? new Date(new Date(ck.tanggal_kirim).getTime() + 14 * 86400000)
      : null
    const isOverdue = ck.status_posting !== 'sudah' && deadline && deadline < new Date()
    const diffDays = deadline ? Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)) : null
    const urgency = isOverdue ? 0 : diffDays === 0 ? 1 : diffDays <= 3 ? 2 : diffDays !== null ? 3 : 4
    return { ...ck, deadline, isOverdue, diffDays, urgency }
  })

  const sorted = [...enriched].sort((a, b) => a.urgency - b.urgency)

  const filtered = sorted.filter(ck => {
    if (filterStatus === 'overdue' && !ck.isOverdue) return false
    if (filterStatus === 'belum' && (ck.status_posting === 'sudah' || ck.isOverdue)) return false
    if (filterStatus === 'sudah' && ck.status_posting !== 'sudah') return false
    if (filterStatus === 'belum_kirim' && ck.status_kirim === 'sudah') return false
    if (filterCampaign && ck.campaign_id !== filterCampaign) return false
    return true
  })

  // Stats operasional
  const totalOverdue = enriched.filter(ck => ck.isOverdue).length
  const totalHampir = enriched.filter(ck => !ck.isOverdue && ck.diffDays !== null && ck.diffDays <= 3).length
  const totalBelumKirim = enriched.filter(ck => ck.status_kirim !== 'sudah').length
  const totalSudah = enriched.filter(ck => ck.status_posting === 'sudah').length
  const totalAll = enriched.length
  const pctPosting = totalAll > 0 ? Math.round((totalSudah / totalAll) * 100) : 0

  // Stats laporan
  const sudahPosting = enriched.filter(ck => ck.status_posting === 'sudah')
  const totalViews = sudahPosting.reduce((s, ck) => s + (ck.total_views || 0), 0)
  const totalSpending = enriched.reduce((s, ck) => s + (ck.total_biaya || 0), 0)
  const totalFee = enriched.reduce((s, ck) => s + (ck.fee_kol || 0), 0)
  const totalHpp = enriched.reduce((s, ck) => s + (ck.hpp || 0), 0)
  const totalOngkir = enriched.reduce((s, ck) => s + (ck.ongkir || 0), 0)
  const cpms = sudahPosting.filter(ck => ck.cpm > 0).map(ck => ck.cpm)
  const avgCpm = cpms.length > 0 ? cpms.reduce((a, b) => a + b, 0) / cpms.length : 0

  function handleExportManager() {
    const exportData = filtered.map(ck => ({
      'Nama KOL': ck.kols?.nama || '-',
      'Campaign': ck.campaigns?.nama || '-',
      'Jumlah Link': ck.jumlah_link || 0,
      'Total Views': ck.total_views || 0,
      'Total Likes': ck.total_likes || 0,
      'Komentar': ck.total_komentar || 0,
      'CPM': ck.cpm || 0,
      'Kategori CPM': ck.cpm > 0 ? (ck.cpm < 50000 ? 'Efisien' : ck.cpm <= 150000 ? 'Normal' : 'Mahal') : '-',
      'Status': ck.status_posting,
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Manajer')
    ws['!cols'] = Object.keys(exportData[0] || {}).map(() => ({ wch: 18 }))
    XLSX.writeFile(wb, `Laporan_Manager_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`)
  }

  function handleExportFinance() {
    const exportData = filtered.map(ck => ({
      'Nama KOL': ck.kols?.nama || '-',
      'Campaign': ck.campaigns?.nama || '-',
      'Fee KOL': ck.fee_kol || 0,
      'HPP Produk': ck.hpp || 0,
      'Ongkir': ck.ongkir || 0,
      'Total Biaya': ck.total_biaya || 0,
      'Tgl Kirim': formatTanggal(ck.tanggal_kirim),
      'Status Posting': ck.status_posting,
      'Catatan': ck.isOverdue ? `Terlambat ${Math.abs(ck.diffDays)} hari` : ck.status_kirim !== 'sudah' ? 'Produk belum dikirim' : '-',
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Finance')
    ws['!cols'] = Object.keys(exportData[0] || {}).map(() => ({ wch: 18 }))
    XLSX.writeFile(wb, `Laporan_Finance_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`)
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tracking & Laporan</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
            <button onClick={() => setMode('operasional')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'operasional' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Mode Operasional
            </button>
            <button onClick={() => setMode('laporan')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'laporan' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Mode Laporan
            </button>
          </div>
          <button onClick={mode === 'laporan' && viewLaporan === 'finance' ? handleExportFinance : handleExportManager}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            📥 Export Excel
          </button>
        </div>
      </div>

      {/* ═══ MODE OPERASIONAL ═══ */}
      {mode === 'operasional' && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[
              { val: totalOverdue, lbl: 'Overdue', sub: 'Harus ditangani sekarang', valCls: 'text-red-600', border: 'border-l-red-400' },
              { val: totalHampir, lbl: 'Jatuh tempo H-1 s/d H-3', sub: 'Perlu follow-up segera', valCls: 'text-yellow-600', border: 'border-l-yellow-400' },
              { val: totalBelumKirim, lbl: 'Belum kirim produk', sub: 'Deadline belum berjalan', valCls: 'text-gray-700', border: 'border-l-gray-300' },
              { val: `${totalSudah} / ${totalAll}`, lbl: 'Sudah posting', sub: `${pctPosting}% selesai`, valCls: 'text-green-600', border: 'border-l-green-400' },
            ].map((c, i) => (
              <div key={i} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${c.border} p-4`}>
                <div className={`text-2xl font-bold ${c.valCls}`}>{c.val}</div>
                <div className="text-sm text-gray-600 mt-0.5">{c.lbl}</div>
                <div className={`text-xs mt-1 ${c.valCls} opacity-70`}>{c.sub}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <span className="text-sm text-gray-600 whitespace-nowrap font-medium">Progress bulan ini</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${pctPosting >= 80 ? 'bg-green-500' : pctPosting >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: pctPosting + '%' }} />
            </div>
            <span className={`text-sm font-bold whitespace-nowrap ${pctPosting >= 80 ? 'text-green-600' : pctPosting >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {pctPosting}%
            </span>
            <span className="text-sm text-gray-400 whitespace-nowrap">{totalSudah} / {totalAll} KOL sudah posting</span>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            {[
              { v: 'overdue', l: `Overdue (${totalOverdue})` },
              { v: 'h13',    l: `H-1 s/d H-3 (${totalHampir})` },
              { v: '',       l: 'Semua' },
              { v: 'belum_kirim', l: 'Belum Kirim' },
              { v: 'sudah',  l: 'Sudah Posting' },
            ].map(tab => (
              <button key={tab.v} onClick={() => setFilterStatus(tab.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filterStatus === tab.v
                    ? tab.v === 'overdue' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                {tab.l}
              </button>
            ))}
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700">
              <option value="">Semua Campaign</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-8"></th>
                  {['Nama KOL','Status Kirim','Tgl Kirim','Deadline (auto)','Sisa Waktu','Link','Status Posting','Total Biaya'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">Tidak ada data.</td></tr>
                ) : filtered.map(ck => (
                  <KolRow key={ck.id} ck={ck} onRefresh={fetchAll} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ MODE LAPORAN ═══ */}
      {mode === 'laporan' && (
        <>
          <div className="flex gap-2">
            <button onClick={() => setViewLaporan('manager')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${viewLaporan === 'manager' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              View Manajer
            </button>
            <button onClick={() => setViewLaporan('finance')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${viewLaporan === 'finance' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              View Finance
            </button>
          </div>

          <div className="flex gap-3 items-center flex-wrap">
            <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
              <option value="">Semua Campaign</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
              <option value="">Semua Status</option>
              <option value="sudah">Sudah Posting</option>
              <option value="belum">Belum Posting</option>
            </select>
            {viewLaporan === 'manager' && <ScrapeButton onDone={fetchAll} />}
          </div>

          {/* VIEW MANAJER */}
          {viewLaporan === 'manager' && (
            <>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { val: `${pctPosting}%`, sub: `${totalSudah} / ${totalAll} KOL`, lbl: 'Ratio Posting', cls: 'text-blue-600' },
                  { val: formatNumber(totalViews) || '-', sub: `dari ${totalSudah} KOL posting`, lbl: 'Total Views', cls: 'text-gray-900' },
                  { val: avgCpm > 0 ? formatCPM(avgCpm) : '-', sub: avgCpm > 0 ? (avgCpm < 50000 ? 'Sangat Baik' : avgCpm <= 150000 ? 'Cukup' : 'Kurang') : 'Belum ada data', lbl: 'CPM Rata-rata', cls: avgCpm > 0 ? (avgCpm < 50000 ? 'text-green-600' : avgCpm <= 150000 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-400' },
                  { val: '-', sub: 'belum dihitung', lbl: 'ER Rata-rata', cls: 'text-gray-400' },
                  { val: totalOverdue, sub: 'sudah bayar, belum posting', lbl: 'Overdue', cls: 'text-red-600' },
                ].map((c, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className={`text-2xl font-bold ${c.cls}`}>{c.val}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{c.lbl}</div>
                    <div className={`text-xs mt-1 ${c.cls} opacity-70`}>{c.sub}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Nama KOL','Platform','Campaign','Link','Total Views','Likes','Komentar','ER','CPM','Kategori','Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={11} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
                    ) : filtered.map(ck => {
                      const cpmInfo = kategoriCPM(ck.cpm || 0)
                      const er = ck.total_views > 0
                        ? (((ck.total_likes || 0) + (ck.total_komentar || 0)) / ck.total_views * 100).toFixed(1)
                        : null
                      return (
                        <tr key={ck.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{ck.kols?.nama}</td>
                          <td className="px-4 py-3">
                            <PlatformPills platforms={ck.kols?.platform ? [ck.kols.platform] : []} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge color="blue">{ck.campaigns?.nama || '-'}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-blue-600">{ck.jumlah_link || 0} link</td>
                          <td className="px-4 py-3 text-gray-700">{formatNumber(ck.total_views)}</td>
                          <td className="px-4 py-3 text-gray-700">{formatNumber(ck.total_likes)}</td>
                          <td className="px-4 py-3 text-gray-700">{formatNumber(ck.total_komentar)}</td>
                          <td className="px-4 py-3">{er ? <span className="text-xs font-medium text-gray-700">{er}%</span> : <span className="text-gray-400 text-xs">-</span>}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-xs font-medium ${ck.cpm > 0 ? ck.cpm < 50000 ? 'text-green-600' : ck.cpm <= 150000 ? 'text-yellow-600' : 'text-red-600' : 'text-gray-400'}`}>
                              {ck.cpm > 0 ? formatCPM(ck.cpm) : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cpmInfo.class}`}>{cpmInfo.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            {ck.status_posting === 'sudah' ? <Badge color="green">Sudah</Badge>
                              : ck.isOverdue ? <Badge color="red">Overdue</Badge>
                              : <Badge color="yellow">Belum</Badge>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* VIEW FINANCE */}
          {viewLaporan === 'finance' && (
            <>
              {totalOverdue > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <div className="text-sm text-red-700">
                    <span className="font-semibold">{totalOverdue} KOL sudah dibayar tapi belum ada konten</span>
                    {' '}— Total terekspos:{' '}
                    <span className="font-semibold">
                      {formatRupiah(enriched.filter(ck => ck.isOverdue).reduce((s, ck) => s + (ck.total_biaya || 0), 0))}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-[240px]">
                  <div className="text-xs text-gray-400 font-medium mb-3">Breakdown total spending</div>
                  {[
                    { k: 'Fee KOL', v: formatRupiah(totalFee) },
                    { k: 'HPP Produk', v: formatRupiah(totalHpp) },
                    { k: 'Ongkir', v: formatRupiah(totalOngkir) },
                  ].map(r => (
                    <div key={r.k} className="flex justify-between py-1.5 border-b border-gray-100 text-sm">
                      <span className="text-gray-500">{r.k}</span>
                      <span className="font-medium text-gray-800">{r.v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 text-sm font-semibold">
                    <span>Total</span>
                    <span>{formatRupiah(totalSpending)}</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-[260px]">
                  <div className="text-xs text-gray-400 font-medium mb-3">Sudah posting vs belum — nilai spending</div>
                  {[
                    { k: `Sudah posting (${totalSudah} KOL)`, v: formatRupiah(sudahPosting.reduce((s, ck) => s + (ck.total_biaya || 0), 0)), cls: 'text-green-600' },
                    { k: `Overdue (${totalOverdue} KOL)`, v: formatRupiah(enriched.filter(ck => ck.isOverdue).reduce((s, ck) => s + (ck.total_biaya || 0), 0)), cls: 'text-red-600' },
                  ].map(r => (
                    <div key={r.k} className="flex justify-between py-1.5 border-b border-gray-100 text-sm">
                      <span className="text-gray-500">{r.k}</span>
                      <span className={`font-medium ${r.cls}`}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Nama KOL','Campaign','Fee KOL','HPP Produk','Ongkir','Total Biaya','Tgl Kirim','Status','Catatan'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={9} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
                    ) : filtered.map(ck => (
                      <tr key={ck.id} className={`border-b border-gray-100 ${ck.isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{ck.kols?.nama}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><Badge color="blue">{ck.campaigns?.nama || '-'}</Badge></td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatRupiah(ck.fee_kol)}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatRupiah(ck.hpp)}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{ck.ongkir ? formatRupiah(ck.ongkir) : <span className="text-gray-400 text-xs">-</span>}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatRupiah(ck.total_biaya)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatTanggal(ck.tanggal_kirim)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {ck.status_posting === 'sudah' ? <Badge color="green">Sudah Posting</Badge>
                            : ck.isOverdue ? <Badge color="red">Overdue</Badge>
                            : <Badge color="yellow">Belum Posting</Badge>}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {ck.isOverdue
                            ? <span className="text-red-600">Terlambat {Math.abs(ck.diffDays)} hari</span>
                            : ck.diffDays !== null && ck.diffDays <= 3 && ck.status_posting !== 'sudah'
                              ? <span className="text-yellow-600">Deadline {ck.diffDays === 0 ? 'hari ini' : `${ck.diffDays} hari lagi`}</span>
                              : ck.status_kirim !== 'sudah'
                                ? <span className="text-gray-400">Produk belum dikirim</span>
                                : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}