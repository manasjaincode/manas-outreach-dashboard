export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

// ==========================================================================
// AI BACKEND — Groq (primary, free, 30 RPM) + Claude (fallback)
// ==========================================================================
// Get free Groq key: console.groq.com → API Keys → Create
// Add 1-5 keys to .env:
// VITE_GROQ_KEY_1=gsk_aaa...
// VITE_GROQ_KEY_2=gsk_bbb...  (get free keys at console.groq.com)
// VITE_GROQ_KEY_3=gsk_ccc...
// VITE_GROQ_KEY_4=gsk_ddd...
// VITE_GROQ_KEY_5=gsk_eee...

const GROQ_MODEL = 'llama-3.3-70b-versatile'

const _groqKeys = [
  import.meta.env.VITE_GROQ_KEY_1,
  import.meta.env.VITE_GROQ_KEY_2,
  import.meta.env.VITE_GROQ_KEY_3,
  import.meta.env.VITE_GROQ_KEY_4,
  import.meta.env.VITE_GROQ_KEY_5,
].filter(k => k && k.startsWith('gsk_'))

// Per-key timestamps for independent rate limiting (30 RPM per key = 2s gap)
const _groqLastCall = {}
// Start from a random key so multiple tabs don't all hammer key #0
let _groqIndex = Math.floor(Math.random() * Math.max(_groqKeys.length, 1))

export const getKeyStats = () => ({
  total: _groqKeys.length,
  currentIndex: _groqIndex,
  backend: `Groq (${GROQ_MODEL})`,
  status: _groqKeys.length > 0
    ? `✅ ${_groqKeys.length} keys loaded`
    : '⚠️ No Groq keys — add VITE_GROQ_KEY_1 to VITE_GROQ_KEY_5 in .env',
  keys: _groqKeys.map((k, i) => ({
    index: i,
    preview: k.slice(0, 12) + '...' + k.slice(-4),
    active: i === _groqIndex,
  })),
})

// ---------- Main AI Call — Groq first, Claude fallback ----------

export const geminiCall = async (prompt, maxTokens = 800) => {
  // Try Groq with key rotation (5 keys × 30 RPM = up to 150 RPM combined)
  if (_groqKeys.length > 0) {
    // Try every key once, rotating on 429
    for (let attempt = 0; attempt < _groqKeys.length; attempt++) {
      const keyIdx = _groqIndex % _groqKeys.length
      const key = _groqKeys[keyIdx]

      // Per-key rate limit: 2.1s between calls on same key
      const now = Date.now()
      const lastCall = _groqLastCall[keyIdx] || 0
      const wait = Math.max(0, lastCall + 2100 - now)
      if (wait > 0) {
        console.log(`⏳ Key #${keyIdx} cooling — waiting ${wait}ms`)
        await new Promise(r => setTimeout(r, wait))
      }
      _groqLastCall[keyIdx] = Date.now()

      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            max_tokens: maxTokens,
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content: 'You are a precise data extraction assistant. Always return valid JSON only, no markdown, no explanation.',
              },
              { role: 'user', content: prompt },
            ],
          }),
        })

        if (res.status === 429) {
          console.warn(`⚠️ Key #${keyIdx} rate limited — rotating to next key`)
          _groqIndex = (keyIdx + 1) % _groqKeys.length
          continue // try next key immediately
        } else if (res.ok) {
          const data = await res.json()
          const text = data.choices?.[0]?.message?.content || ''
          console.log(`✅ Groq key #${keyIdx} responded (${text.length} chars) [${_groqKeys.length} keys loaded]`)
          // Advance index for next call (round-robin)
          _groqIndex = (keyIdx + 1) % _groqKeys.length
          return text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
        } else {
          console.warn(`⚠️ Groq key #${keyIdx} error ${res.status} — rotating`)
          _groqIndex = (keyIdx + 1) % _groqKeys.length
          continue
        }
      } catch (e) {
        console.warn(`⚠️ Groq key #${keyIdx} failed:`, e.message)
        _groqIndex = (keyIdx + 1) % _groqKeys.length
        continue
      }
    }
    console.warn('⚠️ All Groq keys exhausted — falling back to Claude')
  }

  // All keys exhausted — return null, enrichment will show empty points
  console.warn('❌ All Groq keys failed — check VITE_GROQ_KEY_1..5 in .env and restart dev server')
  return null
}

// ==========================================================================
// GOOGLE MAPS
// ==========================================================================

export const searchPlaces = async (query, pageToken = null) => {
  let url = `/maps-api/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_KEY}`
  if (pageToken) url += `&pagetoken=${encodeURIComponent(pageToken)}`
  const res = await fetch(url)
  return res.json()
}

export const getPlaceDetails = async (placeId) => {
  const fields = 'name,formatted_phone_number,international_phone_number,website,formatted_address'
  const res = await fetch(`/maps-api/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_MAPS_KEY}`)
  return res.json()
}

const AREA_SUFFIXES = [
  '', 'north', 'south', 'east', 'west', 'central',
  'zone 1', 'zone 2', 'zone 3', 'zone 4',
  'new area', 'old city', 'sector 1', 'sector 2',
  'nagar', 'colony', 'market', 'industrial area',
]

export const searchPlacesMulti = async (category, city, targetCount, onProgress) => {
  const allPlaces = new Map()
  for (const suffix of AREA_SUFFIXES) {
    if (allPlaces.size >= targetCount) break
    const queryCity = suffix ? `${city} ${suffix}` : city
    const query = `${category} in ${queryCity} India`
    if (onProgress) onProgress(`Searching: ${query}...`)
    try {
      let pageToken = null
      let pagesLeft = 3
      do {
        if (pageToken) await new Promise(r => setTimeout(r, 2200))
        const data = await searchPlaces(query, pageToken)
        if (data.status === 'REQUEST_DENIED') throw new Error('REQUEST_DENIED')
        ;(data.results || []).forEach(p => { if (!allPlaces.has(p.place_id)) allPlaces.set(p.place_id, p) })
        pageToken = data.next_page_token || null
        pagesLeft--
        if (allPlaces.size >= targetCount) break
      } while (pageToken && pagesLeft > 0)
    } catch (err) {
      if (err.message === 'REQUEST_DENIED') throw err
    }
    await new Promise(r => setTimeout(r, 500))
  }
  return [...allPlaces.values()].slice(0, targetCount)
}

// ==========================================================================
// CORS PROXIES
// ==========================================================================

const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
]

const fetchWithProxyFallback = async (targetUrl, timeoutMs = 10000) => {
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(targetUrl), { signal: AbortSignal.timeout(timeoutMs) })
      if (res.ok) { const text = await res.text(); if (text && text.length > 100) return text }
    } catch {}
  }
  return null
}

const fetchGoogleNewsRSS = async (googleNewsUrl) => {
  try {
    const params = new URL(googleNewsUrl).search
    const res = await fetch(`/gnews-api${params}`, { signal: AbortSignal.timeout(12000) })
    if (res.ok) { const text = await res.text(); if (text && text.length > 100) return text }
  } catch {}
  return null
}

// ==========================================================================
// WEBSITE CRAWLING
// ==========================================================================

const htmlToText = (html) =>
  html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

export const crawlWebsite = async (baseUrl) => {
  if (!baseUrl) return { text: '', emails: [], phones: [] }
  let origin
  try { origin = new URL(baseUrl).origin } catch { origin = baseUrl.replace(/\/$/, '') }

  let rawText = ''

  // Jina — reads full page as clean text, works for SPA/WordPress/static
  try {
    const res = await fetch(`/jina-api/${origin}`, {
      signal: AbortSignal.timeout(15000),
      headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' }
    })
    if (res.ok) {
      const text = await res.text()
      if (text && text.length > 300) rawText = text
    }
  } catch {}

  // Fallback: raw HTML via CORS proxy
  if (!rawText || rawText.length < 300) {
    const html = await fetchWithProxyFallback(origin, 10000)
    if (html) rawText = htmlToText(html)
  }

  console.log(`✅ Crawled ${origin}: ${rawText.length} chars`)

  const emails = extractEmails(rawText)
  const phoneMatches = rawText.match(/(?:\+91[\s\-]?)?[6-9]\d{9}|\+91[\s\-]?\d{10}|0\d{2,4}[\s\-]?\d{6,8}/g) || []
  const phones = [...new Set(phoneMatches.map(p => p.trim()))]

  return { text: rawText.slice(0, 10000), emails, phones }
}

// ==========================================================================
// EMAIL UTILITIES
// ==========================================================================

const GENERIC_PREFIXES = ['info', 'contact', 'support', 'admin', 'sales', 'hello', 'enquiry', 'help', 'office']

export const extractEmails = (text) => {
  if (!text) return []
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
  return Array.from(new Set(
    matches.map(e => e.toLowerCase().replace(/\.(png|jpg|jpeg|gif|svg|webp)$/, ''))
      .filter(e => !/(example|domain|sentry|wixpress|godaddy|placeholder|yourname|email\.com|\.png|\.jpg)/.test(e))
  ))
}

export const rankEmails = (emails) => [...emails].sort((a, b) => {
  const aG = GENERIC_PREFIXES.some(p => a.startsWith(p + '@') || a.startsWith(p + '.'))
  const bG = GENERIC_PREFIXES.some(p => b.startsWith(p + '@') || b.startsWith(p + '.'))
  return aG === bG ? 0 : aG ? 1 : -1
})

// ==========================================================================
// LEAD ENRICHMENT — AI Insights
// ==========================================================================

const safeParseJSON = (str, fallback) => {
  if (!str) return fallback
  try { return JSON.parse(str) } catch {}
  const objMatch = str.match(/\{[\s\S]*\}/)
  if (objMatch) { try { return JSON.parse(objMatch[0]) } catch {} }
  const arrMatch = str.match(/\[[\s\S]*\]/)
  if (arrMatch) { try { return JSON.parse(arrMatch[0]) } catch {} }
  return fallback
}

export const enrichWithGemini = async (companyName, websiteText) => {
  if (!websiteText || websiteText.length < 50) return { points: [], people: [], phones: [], tagline: '' }

  const raw = await geminiCall(`You are a B2B sales intelligence extractor. Your job: read this company's website and pull out SPECIFIC facts that a salesperson can use in a cold pitch to sound like they've done their homework.

Company: "${companyName}"

Website text (read every word carefully):
${websiteText.slice(0, 7000)}

Return ONLY this exact JSON structure — no markdown, no explanation, nothing else:
{
  "tagline": "copy their EXACT homepage headline or tagline word for word",
  "points": [
    "CORE SERVICE: [what exactly they sell/do — use their product/service name verbatim]",
    "TARGET CUSTOMER: [who they serve — use their exact words e.g. 'D2C brands', 'MSMEs', 'IT teams', 'CA firms', 'mid-market retailers']",
    "DELIVERY METHOD: [how they do it — platform, technology, process, or methodology in their words]",
    "PROOF / CREDIBILITY: [specific number, stat, or claim — '200+ clients', '₹50Cr revenue', '15 years experience', 'ISO certified']",
    "UNIQUE ANGLE: [what makes them different — their actual differentiator or USP from the site]",
    "HOOK FOR PITCH: [one sharp observation about their business that a salesperson could open a conversation with]"
  ],
  "people": [
    {"name": "full name", "title": "exact title", "email": "email if found else empty"}
  ],
  "phones": ["every phone number found on site"]
}

STRICT RULES:
- Copy THEIR vocabulary exactly. 'Vernacular commerce' stays as is. 'Cloud-first ERP' stays as is. Never paraphrase.
- Every point must be 100% specific to ${companyName}. If it could apply to any company, rewrite it.
- HOOK FOR PITCH: this is the most important point — make it genuinely useful for opening a cold email or call
- people array: only Founder, CEO, Co-founder, MD, Director, Owner, Partner — nobody else
- If something is not on the site, write: "Not found — inferred: [your best guess]"
- Return ONLY the JSON. First character must be {`, 1200)

  const result = safeParseJSON(raw, { points: [], people: [], phones: [], tagline: '' })
  if (result.points) {
    result.points = result.points
      .filter(p => p && p.length > 10)
      .map(p => p.replace(/^["']|["']$/g, '').trim())
  }
  return result
}

export const findLinkedInUrl = async (companyName, city) => {
  if (!companyName) return ''
  const query = `${companyName} ${city || ''} site:linkedin.com/company`
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  try {
    const html = await fetchWithProxyFallback(ddgUrl, 6000)
    if (!html) return ''
    const regex = /uddg=([^&"]+)/g
    let match
    while ((match = regex.exec(html)) !== null) {
      const decoded = decodeURIComponent(match[1])
      if (decoded.includes('linkedin.com/company/')) return decoded.split('?')[0]
    }
    const direct = html.match(/https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/company\/[a-zA-Z0-9\-_%]+/i)
    if (direct) return direct[0]
  } catch {}
  return ''
}

export const enrichLead = async (lead) => {
  let linkedinUrl = ''
  try { linkedinUrl = await findLinkedInUrl(lead.name, lead.city) } catch {}
  if (!lead.website) return { ...lead, points: [], people: [], allEmails: [], phones: [], tagline: '', linkedinUrl }

  const { text, emails, phones: crawledPhones } = await crawlWebsite(lead.website)
  const ranked = rankEmails(emails)

  let aiResult = { points: [], people: [], phones: [], tagline: '' }
  if (text && text.length > 100) {
    aiResult = await enrichWithGemini(lead.name, text)
  } else {
    console.warn(`⚠️ No text crawled for ${lead.name} — ${lead.website}`)
  }

  const peopleEmails = (aiResult.people || []).map(p => p.email).filter(Boolean)
  const allEmails = Array.from(new Set([...ranked, ...peopleEmails]))
  const phones = Array.from(new Set([...crawledPhones, ...(aiResult.phones || [])]))

  return {
    ...lead,
    email: peopleEmails[0] || allEmails[0] || '',
    allEmails,
    phones,
    points: aiResult.points || [],
    people: aiResult.people || [],
    tagline: aiResult.tagline || '',
    linkedinUrl,
    enriched: true,
  }
}

// ==========================================================================
// STARTUP FUNDING NEWS
// ==========================================================================

export const ALL_FUNDING_SOURCES = ['Inc42', 'YourStory', 'ET Startup', 'MoneyControl', 'TechCrunch', 'VCCircle']

const SOURCE_URLS = {
  'Inc42':        'https://news.google.com/rss/search?q=startup+funding+raised+crore+million+site:inc42.com&hl=en-IN&gl=IN&ceid=IN:en',
  'YourStory':    'https://news.google.com/rss/search?q=startup+funding+raised+crore+million+site:yourstory.com&hl=en-IN&gl=IN&ceid=IN:en',
  'ET Startup':   'https://news.google.com/rss/search?q=startup+funding+raised+crore+million+site:economictimes.indiatimes.com&hl=en-IN&gl=IN&ceid=IN:en',
  'MoneyControl': 'https://news.google.com/rss/search?q=startup+funding+raised+site:moneycontrol.com&hl=en-IN&gl=IN&ceid=IN:en',
  'TechCrunch':   'https://news.google.com/rss/search?q=startup+funding+raises+series+seed&hl=en&gl=US&ceid=US:en',
  'VCCircle':     'https://news.google.com/rss/search?q=startup+funding+raised+site:vccircle.com&hl=en-IN&gl=IN&ceid=IN:en',
}

const parseRSSXML = (xml) => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    return Array.from(doc.querySelectorAll('item')).map(item => {
      let link = ''
      const linkEl = item.querySelector('link')
      if (linkEl) link = linkEl.nextSibling?.textContent?.trim() || linkEl.textContent?.trim() || ''
      if (!link) link = item.querySelector('guid')?.textContent?.trim() || ''
      return {
        title: item.querySelector('title')?.textContent?.trim() || '',
        link,
        pubDate: item.querySelector('pubDate')?.textContent?.trim() || '',
        description: (item.querySelector('description')?.textContent || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      }
    })
  } catch { return [] }
}

export const fetchFundingNews = async (industry, selectedSources, onProgress) => {
  const allItems = []
  const seen = new Set()
  for (const srcName of selectedSources) {
    if (onProgress) onProgress(`Fetching ${srcName}...`)
    const rssUrl = industry
      ? `https://news.google.com/rss/search?q=${encodeURIComponent(industry + ' startup funding raised india')}&hl=en-IN&gl=IN&ceid=IN:en`
      : SOURCE_URLS[srcName]
    try {
      const xml = await fetchGoogleNewsRSS(rssUrl)
      if (xml) {
        parseRSSXML(xml).forEach(item => {
          if (!item.title) return
          const key = item.title.toLowerCase().slice(0, 55)
          if (seen.has(key)) return
          seen.add(key)
          allItems.push({ ...item, source: srcName })
        })
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200))
  }
  return allItems
}

export const extractStartupFromNews = async (newsItems, onProgress) => {
  if (!newsItems.length) return []

  if (onProgress) onProgress(`AI extracting ${newsItems.length} headlines...`)
  const headlines = newsItems.map((item, i) => `[${i}] ${item.title}`).join('\n')

  let extracted = []
  const raw = await geminiCall(`Extract startup funding data from these news headlines. Return ONLY a JSON array:
[{"index":0,"company":"startup name","amount":"funding amount","round":"Seed/Series A/B/C","sector":"Fintech/Edtech/SaaS/AI/Healthtech/Ecommerce/Logistics/D2C/Other","investors":"investor names","summary":"one line what the startup does","website":"company website if obvious else empty"}]

Return exactly ${newsItems.length} objects. Guess company name for every headline even if not explicit.

Headlines:
${headlines}`, 4000)

  if (raw) {
    let parsed = null
    try { parsed = JSON.parse(raw) } catch {}
    if (!parsed) { const m = raw.match(/\[[\s\S]*\]/); if (m) try { parsed = JSON.parse(m[0]) } catch {} }
    if (Array.isArray(parsed)) extracted = parsed
  }

  return newsItems.map((item, i) => {
    const ext = extracted.find(e => e.index === i) || extracted[i] || {}
    return {
      ...item,
      company: ext.company || '',
      amount: ext.amount || '',
      round: ext.round || '',
      sector: ext.sector || '',
      investors: ext.investors || '',
      summary: ext.summary || item.description?.slice(0, 120) || '',
      founder: '', founderTitle: '', email: '', phone: '',
      website: ext.website || '', enriched: false,
    }
  })
}

export const enrichSingleStartup = async (item, onProgress) => {
  let website = item.website || ''
  let email = ''
  let phones = []
  let founder = ''
  let founderTitle = ''

  if (!website && item.company) {
    if (onProgress) onProgress(`Finding website for ${item.company}...`)
    try {
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(item.company + ' startup official site india')}`
      const html = await fetchWithProxyFallback(ddgUrl, 8000)
      if (html) {
        const regex = /uddg=([^&"]+)/g; let match
        while ((match = regex.exec(html)) !== null) {
          const decoded = decodeURIComponent(match[1])
          if (decoded.startsWith('http') && !/(linkedin|facebook|twitter|instagram|youtube|google|inc42|yourstory|techcrunch|moneycontrol|economictimes|wikipedia|crunchbase)/.test(decoded)) {
            website = decoded.split('?')[0].replace(/\/$/, '')
            break
          }
        }
      }
    } catch {}
  }

  if (website) {
    if (onProgress) onProgress(`Crawling ${website}...`)
    const { text, emails, phones: crawledPhones } = await crawlWebsite(website)
    phones = crawledPhones
    if (emails.length) email = rankEmails(emails)[0]

    if (text) {
      if (onProgress) onProgress(`Extracting insights for ${item.company}...`)
      const raw = await geminiCall(`From this website text of startup "${item.company}", extract:
1. Founder/CEO/Co-founder name and title
2. Contact email and phone if present

Return ONLY JSON: {"founder":"name or empty","title":"exact title or empty","email":"email or empty","phone":"phone or empty"}

Text: ${text.slice(0, 3500)}`, 300)

      const parsed = safeParseJSON(raw, {})
      if (parsed.founder) {
        founder = parsed.founder
        founderTitle = parsed.title || ''
        if (parsed.email && !email) email = parsed.email
        if (parsed.phone && !phones.includes(parsed.phone)) phones.push(parsed.phone)
      }
    }
  }

  return { ...item, website, email, phones, founder, founderTitle, enriched: true }
}

// ==========================================================================
// FREELANCE JOBS
// ==========================================================================

const fetchRemotive = async (keyword) => {
  try {
    const params = keyword ? `?search=${encodeURIComponent(keyword)}&limit=50` : `?limit=50`
    const res = await fetch(`/remotive-api${params}`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs || []).map(j => ({
      title: j.title || '', company: j.company_name || '', link: j.url || '',
      pubDate: j.publication_date || '', budget: j.salary || '', hourly: '',
      skills: (j.tags || []).join(', '), country: j.candidate_required_location || 'Remote',
      description: (j.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400),
      source: 'Remotive',
    }))
  } catch { return [] }
}

const fetchArbeitnow = async (keyword) => {
  try {
    const res = await fetch(`/arbeitnow-api`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []
    const data = await res.json()
    const jobs = data.data || []
    const filtered = keyword
      ? jobs.filter(j => (j.title + j.description + (j.tags || []).join(' ')).toLowerCase().includes(keyword.toLowerCase()))
      : jobs
    return filtered.slice(0, 30).map(j => ({
      title: j.title || '', company: j.company_name || '', link: j.url || '',
      pubDate: j.created_at || '', budget: '', hourly: '',
      skills: (j.tags || []).join(', '), country: j.location || 'Remote',
      description: (j.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400),
      source: 'Arbeitnow',
    }))
  } catch { return [] }
}

const fetchHimalayas = async (keyword) => {
  try {
    const params = keyword ? `?q=${encodeURIComponent(keyword)}&limit=30` : `?limit=30`
    const res = await fetch(`/himalayas-api${params}`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs || []).map(j => ({
      title: j.title || '', company: j.companyName || '',
      link: j.applicationLink || j.url || '', pubDate: j.createdAt || '',
      budget: j.salaryRange || '', hourly: '',
      skills: (j.skills || []).map(s => s.title || s).join(', '),
      country: j.locationRestrictions?.join(', ') || 'Remote',
      description: (j.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400),
      source: 'Himalayas',
    }))
  } catch { return [] }
}

export const fetchUpworkJobs = async (keyword, category, onProgress) => {
  if (onProgress) onProgress('Fetching from Remotive, Arbeitnow, Himalayas...')
  const [remotive, arbeitnow, himalayas] = await Promise.all([
    fetchRemotive(keyword), fetchArbeitnow(keyword), fetchHimalayas(keyword),
  ])
  if (onProgress) onProgress(null)
  const all = [...remotive, ...arbeitnow, ...himalayas]
  const seen = new Set()
  return all.filter(j => {
    const key = (j.title + j.company).toLowerCase().replace(/\s+/g, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const UPWORK_CATEGORIES = [
  'Any', 'React / Next.js', 'Node.js / Backend', 'Python', 'Mobile / Flutter',
  'Design / UI-UX', 'DevOps / Cloud', 'Data Science / ML', 'SEO / Marketing',
  'Content Writing', 'WordPress / PHP', 'Java / Kotlin', 'iOS / Swift',
  'Blockchain / Web3', 'Game Development',
]

export const getUpworkSearchUrl = (keyword, category) => {
  const q = [keyword, category !== 'Any' ? category : ''].filter(Boolean).join(' ')
  return `https://www.upwork.com/nx/search/jobs/?q=${encodeURIComponent(q)}&sort=recency`
}
// ==========================================================================
// INBOX PLACEMENT PREDICTOR — separate Groq key pool (3 keys, own rotation)
// ==========================================================================
const INBOX_GROQ_MODEL = 'llama-3.3-70b-versatile'

const _inboxGroqKeys = [
  import.meta.env.VITE_INBOX_GROQ_KEY_1,
  import.meta.env.VITE_INBOX_GROQ_KEY_2,
  import.meta.env.VITE_INBOX_GROQ_KEY_3,
].filter(k => k && k.startsWith('gsk_'))

let _inboxGroqIndex = Math.floor(Math.random() * Math.max(_inboxGroqKeys.length, 1))
const _inboxGroqLastCall = {}

export const getInboxPredictorStats = () => ({
  total: _inboxGroqKeys.length,
  status: _inboxGroqKeys.length > 0
    ? `✅ ${_inboxGroqKeys.length} keys loaded`
    : '⚠️ VITE_INBOX_GROQ_KEY_1..3 missing in .env',
})

export const predictInboxPlacement = async (subject, body) => {
  if (_inboxGroqKeys.length === 0) {
    return { error: 'Koi key nahi mili — .env mein VITE_INBOX_GROQ_KEY_1..3 daalo' }
  }

  const prompt = `You are simulating Gmail's inbox categorization model (Primary vs Promotions vs Updates vs Social tab).

Analyze this cold outreach email and predict which tab Gmail is MOST LIKELY to place it in, based on real Gmail signals:
- Promotional/marketing language ("% off", "limited time", "click here", "buy now", excessive CTAs)
- Bulk/templated feel vs personal 1-to-1 tone
- Sales-pitch structure (bullet lists of features, "we offer", numbered value props)
- Unsubscribe-style phrasing, tracking-pixel-like patterns, heavy HTML-ish formatting
- Subject line style (spammy words, emojis, ALL CAPS, excessive punctuation, generic broadcast phrasing)
- Personalization signals (specific person/company addressed vs generic "Dear Sir/Madam")
- Length and paragraph structure (long marketing copy vs short conversational email)

Subject: "${subject}"

Body:
${body}

Return ONLY this JSON, nothing else:
{
  "predicted_tab": "Primary" | "Promotions" | "Updates" | "Social",
  "primary_probability": <0-100 integer>,
  "risk_factors": ["specific phrase/pattern in THIS email hurting Primary placement", ...max 5],
  "suggestions": ["specific actionable rewrite suggestion for THIS email", ...max 5],
  "subject_verdict": "one line on whether subject line itself is risky and why"
}`

  for (let attempt = 0; attempt < _inboxGroqKeys.length; attempt++) {
    const keyIdx = _inboxGroqIndex % _inboxGroqKeys.length
    const key = _inboxGroqKeys[keyIdx]

    const now = Date.now()
    const wait = Math.max(0, (_inboxGroqLastCall[keyIdx] || 0) + 2100 - now)
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    _inboxGroqLastCall[keyIdx] = Date.now()

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: INBOX_GROQ_MODEL,
          max_tokens: 700,
          temperature: 0.2,
          messages: [
            { role: 'system', content: 'You are a precise email deliverability analyst. Return valid JSON only, no markdown.' },
            { role: 'user', content: prompt },
          ],
        }),
      })

      if (res.status === 429 || !res.ok) {
        _inboxGroqIndex = (keyIdx + 1) % _inboxGroqKeys.length
        continue
      }

      const data = await res.json()
      const text = (data.choices?.[0]?.message?.content || '').replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
      _inboxGroqIndex = (keyIdx + 1) % _inboxGroqKeys.length

      try { return JSON.parse(text) }
      catch {
        const m = text.match(/\{[\s\S]*\}/)
        if (m) { try { return JSON.parse(m[0]) } catch {} }
        return { error: 'AI response parse nahi hua, dobara try karo' }
      }
    } catch {
      _inboxGroqIndex = (keyIdx + 1) % _inboxGroqKeys.length
      continue
    }
  }
  return { error: 'Saare 3 keys fail/rate-limited — thodi der mein try karo' }
}