import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import PremiumChrome from './components/PremiumChrome.jsx'
import LegacyPage from './pages/LegacyPage.jsx'
import NotFound from './pages/NotFound.jsx'
import { LEGACY_PAGE_ROUTES } from './utils/legacyRoutes.js'
import ProductsCatalog from './pages/ProductsCatalog.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import { CartProvider } from './context/CartContext.jsx'

const LEGACY_PAGE_MAP = Object.fromEntries(
  [...LEGACY_PAGE_ROUTES.entries()].map(([file, route]) => [file.replace(/\.html$/, ''), route]),
)

function LegacyProductHtmlRedirect() {
  const { slug } = useParams()
  const target = LEGACY_PAGE_MAP[slug] || `/products/${slug}`
  return <Navigate to={target} replace />
}

function ProductSlugHtmlRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/products/${slug}`} replace />
}

function ScrollToHashAndTop() {
  const location = useLocation()

  useEffect(() => {
    const { hash } = location
    if (hash) {
      try {
        // Ensure the hash is a valid CSS id selector (starts with # and followed by valid characters)
        if (/^#[a-zA-Z_][a-zA-Z0-9_-]*$/.test(hash)) {
          const el = document.querySelector(hash)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            return
          }
        }
      } catch (err) {
        console.warn('Invalid hash selector:', hash, err)
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location])

  return null
}

function HomePlaceholder() {
  return <LegacyPage file="index.html" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePlaceholder />} />
      <Route path="/products" element={<ProductsCatalog />} />
      <Route path="/products/:slug.html" element={<ProductSlugHtmlRedirect />} />
      <Route path="/products/:slug" element={<ProductDetail />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/contact" element={<LegacyPage file="contact.html" />} />
      <Route path="/about" element={<LegacyPage file="about.html" />} />
      <Route path="/mission" element={<LegacyPage file="mission.html" />} />
      <Route path="/landing" element={<LegacyPage file="landing.html" />} />
      <Route path="/privacy" element={<LegacyPage file="privacypolicy.html" />} />
      <Route path="/terms" element={<LegacyPage file="terms&conditions.html" />} />
      <Route path="/success" element={<LegacyPage file="success.html" />} />
      <Route path="/fail" element={<LegacyPage file="fail.html" />} />

      {/* Back-compat for old .html URLs */}
      <Route path="/index.html" element={<Navigate to="/" replace />} />
      <Route path="/product.html" element={<Navigate to="/products" replace />} />
      <Route path="/contact.html" element={<Navigate to="/contact" replace />} />
      <Route path="/about.html" element={<Navigate to="/about" replace />} />
      <Route path="/mission.html" element={<Navigate to="/mission" replace />} />
      <Route path="/landing.html" element={<Navigate to="/landing" replace />} />
      <Route path="/privacypolicy.html" element={<Navigate to="/privacy" replace />} />
      <Route path="/terms&conditions.html" element={<Navigate to="/terms" replace />} />
      <Route path="/:slug.html" element={<LegacyProductHtmlRedirect />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  const location = useLocation()

  return (
    <CartProvider>
      <PremiumChrome>
        <ScrollToHashAndTop />
        <div className="se-route-shell" key={location.pathname}>
          <AppRoutes />
        </div>
      </PremiumChrome>
    </CartProvider>
  )
}
