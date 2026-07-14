import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import { useCart } from '../context/CartContext.jsx'

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()

  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [activeImage, setActiveImage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)

  // Inquiry Form State
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch current product
        const res = await fetch(`/api/products/${slug}`)
        if (!res.ok) {
          throw new Error('Product not found')
        }
        const data = await res.json()
        setProduct(data)
        setActiveImage(data.images && data.images.length > 0 ? data.images[0] : '')
        setQuantity(1) // Reset quantity on product change

        // Set default message for inquiry form
        setFormState((prev) => ({
          ...prev,
          message: `Hi, I am interested in ${data.name}. Please send me more details and pricing.`
        }))

        // Fetch related products in the same category
        const apiBase = import.meta.env.VITE_API_URL || ''
        const catalogRes = await fetch(`${apiBase}/api/products`)
        if (catalogRes.ok) {
          const allProducts = await catalogRes.json()
          const filtered = allProducts.filter(
            (p) => p.category === data.category && p.slug !== data.slug
          )
          setRelatedProducts(filtered.slice(0, 4))
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [slug])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${apiBase}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formState,
          items: [
            {
              name: product.name,
              slug: product.slug,
              price: product.price,
              quantity: Number(quantity)
            }
          ]
        })
      })

      if (!res.ok) throw new Error('Failed to submit')
      navigate('/success')
    } catch (err) {
      console.error(err)
      navigate('/fail')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="text-center py-5" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Loading product...</span>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (error || !product) {
    return (
      <>
        <Header />
        <div className="container py-5 text-center" style={{ minHeight: '60vh', color: '#fff' }}>
          <h3>Product failed to load</h3>
          <p style={{ opacity: 0.8 }}>{error || 'Unknown error'}</p>
          <Link to="/products" className="btn btn-primary mt-3">Back to Products</Link>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />

      {/* Breadcrumbs */}
      <section
        id="ori-breadcrumbs"
        className="ori-breadcrumbs-section position-relative"
        style={{ backgroundImage: "url('/assets/img/bg/bread-bg.png')", backgroundSize: 'cover' }}
      >
        <div className="container">
          <div className="ori-breadcrumb-content text-center ul-li">
            <h1>{product.name}</h1>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/products">Products</Link></li>
              <li>{product.name}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Shop Details */}
      <section id="ori-shop-details" className="ori-shop-details-section position-relative" style={{ padding: '60px 0', color: '#fff' }}>
        <div className="container">
          <div className="ori-shop-details-content">
            <div className="row">
              
              {/* Image Gallery */}
              <div className="col-lg-6 mb-4 mb-lg-0">
                <div className="ori-shop-details-slider-wrapper">
                  <div className="slider-inner-img text-center" style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '20px', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={activeImage || '/assets/img/shop/shop1.png'}
                      alt={product.name}
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  
                  {/* Thumbnail Selectors */}
                  {product.images && product.images.length > 1 && (
                    <div className="d-flex gap-2 mt-3 overflow-auto pb-2">
                      {product.images.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveImage(img)}
                          style={{
                            width: '80px',
                            height: '80px',
                            border: `2px solid ${activeImage === img ? '#00ffcc' : '#333'}`,
                            borderRadius: '4px',
                            padding: '4px',
                            background: '#0a0a0a',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <img src={img} alt="" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="col-lg-6">
                <div className="ori-shop-details-text-wrapper" style={{ paddingLeft: '15px' }}>
                  <div className="ori-shop-details-title" style={{ borderBottom: '1px solid #222', paddingBottom: '20px', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '32px', color: '#fff', fontWeight: 'bold' }}>{product.name}</h2>
                    <span className="pro_price" style={{ color: '#00ffcc', fontSize: '24px', fontWeight: 'bold', display: 'block', marginTop: '10px' }}>
                      {product.price}
                    </span>
                  </div>
                  
                  <div className="ori-shop-details-desc" style={{ fontSize: '16px', lineHeight: '1.7', opacity: 0.9, marginBottom: '20px' }}>
                    {product.description || "No description provided."}
                  </div>

                  {/* Add to Cart Options */}
                  <div className="d-flex align-items-center gap-3 mb-4 flex-wrap" style={{ borderBottom: '1px solid #222', paddingBottom: '20px' }}>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted" style={{ fontSize: '14px' }}>Quantity:</span>
                      <button 
                        type="button" 
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        style={{ width: '30px', height: '30px', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '16px', minWidth: '25px', textAlign: 'center', fontWeight: 'bold' }}>{quantity}</span>
                      <button 
                        type="button" 
                        onClick={() => setQuantity(q => q + 1)}
                        style={{ width: '30px', height: '30px', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => addToCart(product, quantity)}
                      className="btn animate-btn"
                      style={{ background: '#00ffcc', color: '#000', padding: '8px 20px', fontWeight: 'bold', border: 'none', borderRadius: '4px' }}
                    >
                      <i className="fas fa-cart-plus me-2" /> Add to Cart
                    </button>
                  </div>

                  {/* Specifications */}
                  {product.specs && product.specs.length > 0 && (
                    <div className="ori-code-category ul-li-block" style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #222' }}>
                      <h4 style={{ fontSize: '18px', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '15px', color: '#00ffcc' }}>Product Specifications</h4>
                      <table className="table table-dark table-striped" style={{ margin: 0, fontSize: '14px' }}>
                        <tbody>
                          {product.specs.map((spec, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 'bold', width: '35%', color: '#aaa', border: 'none' }}>{spec.key}</td>
                              <td style={{ color: '#fff', border: 'none' }}>{spec.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>

          {/* Inquiry Form Block */}
          <div className="inquiry-form-wrapper mt-5 p-4" style={{ background: '#111', border: '1px solid #222', borderRadius: '8px' }}>
            <h3 style={{ borderBottom: '1px solid #222', paddingBottom: '15px', marginBottom: '25px', color: '#00ffcc' }}>Send Inquiry for this Product</h3>
            <form onSubmit={handleFormSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label" style={{ color: '#aaa' }}>Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formState.name}
                    onChange={handleInputChange}
                    className="form-control bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label" style={{ color: '#aaa' }}>Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formState.email}
                    onChange={handleInputChange}
                    className="form-control bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label" style={{ color: '#aaa' }}>Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={formState.phone}
                    onChange={handleInputChange}
                    className="form-control bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label" style={{ color: '#aaa' }}>Company (Optional)</label>
                  <input
                    type="text"
                    name="company"
                    value={formState.company}
                    onChange={handleInputChange}
                    className="form-control bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label" style={{ color: '#aaa' }}>Message *</label>
                  <textarea
                    name="message"
                    required
                    rows="4"
                    value={formState.message}
                    onChange={handleInputChange}
                    className="form-control bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-12 text-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{ background: '#00ffcc', border: 'none', color: '#000', padding: '10px 25px', fontWeight: 'bold' }}
                  >
                    {isSubmitting ? 'Sending...' : 'Submit Inquiry'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="ori-shop-related-product mt-5">
              <h3 style={{ borderBottom: '1px solid #222', paddingBottom: '15px', marginBottom: '25px', color: '#00ffcc' }}>Related Products</h3>
              <div className="ori-related-product-content">
                <div className="row">
                  {relatedProducts.map((relProd) => (
                    <div key={relProd.slug} className="col-lg-3 col-md-6 mb-4">
                      <div className="ori-shop-inner-item text-center" style={{ background: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #222' }}>
                        <div className="shop-img-cart-btn position-relative" style={{ overflow: 'hidden', borderRadius: '4px' }}>
                          <div className="shop-img" style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
                            <img
                              src={relProd.images && relProd.images.length > 0 ? relProd.images[0] : '/assets/img/shop/shop1.png'}
                              alt={relProd.name}
                              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>
                          <div className="add-cart-btn text-uppercase text-center">
                            <Link to={`/products/${relProd.slug}`}>View</Link>
                          </div>
                        </div>
                        <div className="shop-text mt-3">
                          <h3 style={{ fontSize: '16px', margin: '5px 0' }}>
                            <Link to={`/products/${relProd.slug}`} style={{ color: '#fff', textDecoration: 'none' }}>
                              {relProd.name}
                            </Link>
                          </h3>
                          <span className="pro_price" style={{ color: '#00ffcc', fontWeight: 'bold' }}>
                            {relProd.price}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      <Footer />
    </>
  )
}
