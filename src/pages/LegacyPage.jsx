import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { mapLegacyHrefToRoute } from '../utils/legacyRoutes.js'
import {
  destroyLegacyTheme,
  normalizeLegacyHtml,
  reinitializeLegacyTheme,
} from '../utils/legacyTheme.js'
import LegacyPageSkeleton from '../components/LegacyPageSkeleton.jsx'

function extractBodyInnerHtml(fullHtml) {
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const inner = bodyMatch?.[1] || fullHtml
  return normalizeLegacyHtml(inner)
}

const THEME_SCRIPT_URLS = [
  // Keep this list minimal; jQuery + Slick are loaded via npm in `src/legacyVendor.js`.
  // Add more scripts here only if we need specific plugins later.
]

let themeScriptsPromise = null

function loadScriptSequential(src) {
  return new Promise((resolve, reject) => {
    // Already present?
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) return resolve()

    const s = document.createElement('script')
    s.src = src
    s.async = false
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(s)
  })
}

async function ensureThemeScriptsLoaded() {
  if (themeScriptsPromise) return themeScriptsPromise
  themeScriptsPromise = (async () => {
    for (const src of THEME_SCRIPT_URLS) {
      // eslint-disable-next-line no-await-in-loop
      await loadScriptSequential(src)
    }
  })()
  return themeScriptsPromise
}

export default function LegacyPage({ file }) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const containerRef = useRef(null)
  const [html, setHtml] = useState('')
  const [loadError, setLoadError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const legacyFile = useMemo(() => {
    if (file) return file
    if (params?.slug) return `${params.slug}.html`
    return null
  }, [file, params])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!legacyFile) return
      setLoadError(null)
      setIsLoading(true)
      setHtml('')
      try {
        const res = await fetch(`/legacy/${legacyFile}`, { cache: 'no-cache' })
        if (!res.ok) throw new Error(`Failed to load legacy page: ${legacyFile}`)
        const text = await res.text()
        if (cancelled) return
        setHtml(extractBodyInnerHtml(text))
      } catch (e) {
        if (cancelled) return
        setLoadError(e)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [legacyFile])

  // Intercept internal links (so navigation stays in React Router)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onClick(e) {
      const a = e.target?.closest?.('a')
      if (!a) return

      const href = a.getAttribute('href')
      const mapped = mapLegacyHrefToRoute(href)
      if (!mapped) return

      e.preventDefault()
      navigate(mapped)
    }

    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [navigate, location.pathname])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.querySelector('#preloader')?.remove()
  }, [html])

  // Load theme JS AFTER content is in the DOM, then re-init sliders/widgets per page.
  useEffect(() => {
    if (!html) return

    let cancelled = false
    let frameId = 0

    async function run() {
      try {
        await ensureThemeScriptsLoaded()
        if (cancelled) return

        const initTheme = () => {
          if (cancelled || !containerRef.current) return
          try {
            reinitializeLegacyTheme(containerRef.current)

            const { hash } = window.location
            if (hash) {
              const target = containerRef.current.querySelector(hash)
              if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          } catch (err) {
            console.warn('Legacy theme init failed:', err)
          }
        }

        initTheme()
        frameId = window.setTimeout(initTheme, 250)
      } catch {
        // Theme JS failed — page HTML still renders
      }
    }
    run()

    return () => {
      cancelled = true
      if (frameId) window.clearTimeout(frameId)
      if (containerRef.current) destroyLegacyTheme(containerRef.current)
    }
  }, [html])

  // Intercept old contact forms that POST to send.php
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const forms = Array.from(el.querySelectorAll('form'))
    const targetForms = forms.filter((f) => {
      const action = (f.getAttribute('action') || '').trim()
      return action === 'send.php' || action.endsWith('/send.php') || action === './send.php'
    })

    if (targetForms.length === 0) return

    function setLoading(isLoading) {
      const modal = el.querySelector('#loadingModal')
      if (!modal) return
      modal.style.display = isLoading ? 'flex' : 'none'
    }

    async function onSubmit(e) {
      const form = e.target
      if (!(form instanceof HTMLFormElement)) return
      if (!targetForms.includes(form)) return

      e.preventDefault()
      setLoading(true)

      try {
        const formData = new FormData(form)
        const payload = {
          name: String(formData.get('name') || '').trim(),
          email: String(formData.get('email') || '').trim(),
          phone: String(formData.get('phone') || formData.get('text') || '').trim(),
          company: String(formData.get('company') || '').trim(),
          message: String(formData.get('message') || '').trim(),
        }

        const apiBase = import.meta.env.VITE_API_URL || ''
        const res = await fetch(`${apiBase}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) throw new Error('Contact request failed')

        navigate('/success')
      } catch {
        navigate('/fail')
      } finally {
        setLoading(false)
      }
    }

    for (const f of targetForms) f.addEventListener('submit', onSubmit)
    return () => {
      for (const f of targetForms) f.removeEventListener('submit', onSubmit)
    }
  }, [html, navigate])

  if (loadError) {
    return (
      <div style={{ padding: 24, color: '#fff' }}>
        <h3>Page failed to load</h3>
        <p style={{ opacity: 0.8 }}>
          Could not load <code>{legacyFile}</code> from <code>/public/legacy</code>.
        </p>
      </div>
    )
  }

  if (isLoading || !html) {
    return <LegacyPageSkeleton />
  }

  return (
    <div
      key={legacyFile}
      ref={containerRef}
      className="se-legacy-page"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

