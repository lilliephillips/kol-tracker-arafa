export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const campaign_id = searchParams.get('campaign_id')

  try {
    let query = supabase
      .from('postings')
      .select(`
        *,
        kols (id, nama, platform, handle, niche, total_biaya)
      `)
      .order('tanggal_deadline', { ascending: true })

    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) {
      console.error('Posting query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(Array.isArray(data) ? data : [])

  } catch (err) {
    console.error('Posting GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}