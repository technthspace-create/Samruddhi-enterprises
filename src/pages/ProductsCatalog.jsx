import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import { useCart } from '../context/CartContext.jsx'

export default function ProductsCatalog() {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Requirement Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [targetProduct, setTargetProduct] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formFields, setFormFields] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    quantity: 1,
    message: ''
  })

  useEffect(() => {
    async function fetchProducts() {
      try {
        const apiBase = import.meta.env.VITE_API_URL || ''
        const res = await fetch(`${apiBase}/api/products`)
        if (res.ok) {
          const data = await res.json()
          setProducts(data)
          setFilteredProducts(data)
        }
      } catch (err) {
        console.error('Failed to fetch products:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    let result = products

    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory)
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q))
    }

    setFilteredProducts(result)
  }, [selectedCategory, searchQuery, products])

  const handleOpenModal = (product) => {
    setTargetProduct(product)
    setFormFields({
      name: '',
      email: '',
      phone: '',
      company: '',
      quantity: 1,
      message: `Hi, I am interested in ${product.name}. Please provide a quotation.`
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTargetProduct(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormFields(prev => ({ ...prev, [name]: value }))
  }

  const handleModalSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        name: formFields.name,
        email: formFields.email,
        phone: formFields.phone,
        company: formFields.company,
        message: formFields.message,
        items: [
          {
            name: targetProduct.name,
            slug: targetProduct.slug,
            price: targetProduct.price,
            quantity: Number(formFields.quantity || 1)
          }
        ]
      }

      const apiBase = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${apiBase}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        handleCloseModal()
        navigate('/success')
      } else {
        throw new Error('Submission failed')
      }
    } catch (err) {
      console.error(err)
      navigate('/fail')
    } finally {
      setIsSubmitting(false)
    }
  }

  const categories = [
    { key: 'all', label: 'All Products' },
    { key: 'seals', label: 'Seals' },
    { key: 'hardware', label: 'Hardware' },
    { key: 'interlocking', label: 'Interlocking' },
    { key: 'doors', label: 'Clean Room Doors' },
    { key: 'pass-box', label: 'Pass Box' }
  ]

  return (
    <>
      <Header />
      
      {/* Breadcrumbs Section */}
      <section
        id="ori-breadcrumbs"
        className="ori-breadcrumbs-section position-relative"
        style={{ backgroundImage: "url('/assets/img/bg/bread-bg.png')", backgroundSize: 'cover' }}
      >
        <div className="container">
          <div className="ori-breadcrumb-content text-center ul-li">
            <h1>Products Catalog</h1>
            <ul>
              <li><Link to="/">Samruddhi Enterprise</Link></li>
              <li>Products</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Catalog Grid Section */}
      <section id="ori-shop-feed" className="ori-shop-feed-section" style={{ padding: '60px 0' }}>
        <div className="container">
          <div className="ori-shop-feed-content">
            
            {/* Search and Category Filters */}
            <div className="row justify-content-between align-items-center mb-4">
              <div className="col-md-7 mb-3 mb-md-0">
                <div className="se-category-chips d-flex flex-wrap gap-2" role="tablist">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      className={`se-chip ${selectedCategory === cat.key ? 'is-active' : ''}`}
                      onClick={() => setSelectedCategory(cat.key)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-md-4">
                <div className="search-box" style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      borderRadius: '5px',
                      border: '1px solid #333',
                      background: '#1a1a1a',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                  <i className="fas fa-search" style={{ position: 'absolute', right: '15px', top: '13px', color: '#888' }} />
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="ori-shop-feed-post-content mt-4">
              {isLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-light" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-5" style={{ color: '#aaa' }}>
                  <h3>No products found</h3>
                  <p>Try resetting the category filter or changing your search term.</p>
                </div>
              ) : (
                <div className="row">
                  {filteredProducts.map((product) => (
                    <div key={product.slug} className="col-lg-4 col-md-6 col-sm-12 mb-4">
                      <div className="ori-shop-inner-item text-center" style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #222' }}>
                        <div className="shop-img-cart-btn position-relative" style={{ overflow: 'hidden', borderRadius: '4px' }}>
                          <div className="shop-img" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
                            <Link to={`/products/${product.slug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
                              <img
                                src={product.images && product.images.length > 0 ? product.images[0] : '/assets/img/shop/shop1.png'}
                                alt={product.name}
                                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                              />
                            </Link>
                          </div>
                        </div>
                        <div className="shop-text mt-3">
                          <h3 style={{ fontSize: '18px', margin: '5px 0', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Link to={`/products/${product.slug}`} style={{ color: '#fff', textDecoration: 'none' }}>
                              {product.name}
                            </Link>
                          </h3>
                          <div style={{ color: '#00ffcc', fontWeight: 'bold', fontSize: '15px', marginBottom: '15px' }}>
                            {product.price}
                          </div>
                          
                          {/* Cart, Details & Requirement Buttons */}
                          <div className="d-flex flex-wrap gap-2 justify-content-center mt-3">
                            <Link
                              to={`/products/${product.slug}`}
                              className="btn btn-sm"
                              style={{ 
                                background: '#222', 
                                border: '1px solid #444', 
                                color: '#fff', 
                                fontSize: '11px', 
                                padding: '6px 10px', 
                                fontWeight: 'bold', 
                                borderRadius: '4px',
                                textDecoration: 'none' 
                              }}
                            >
                              <i className="fas fa-info-circle me-1" /> Details
                            </Link>
                            <button
                              onClick={() => addToCart(product, 1)}
                              className="btn btn-sm"
                              style={{ 
                                background: 'transparent', 
                                border: '1px solid #00ffcc', 
                                color: '#00ffcc', 
                                fontSize: '11px', 
                                padding: '6px 10px', 
                                fontWeight: 'bold', 
                                borderRadius: '4px' 
                              }}
                            >
                              <i className="fas fa-cart-plus me-1" /> + Cart
                            </button>
                            <button
                              onClick={() => handleOpenModal(product)}
                              className="btn btn-sm"
                              style={{ 
                                background: '#00ffcc', 
                                color: '#000', 
                                fontSize: '11px', 
                                padding: '6px 10px', 
                                fontWeight: 'bold', 
                                border: 'none', 
                                borderRadius: '4px' 
                              }}
                            >
                              <i className="far fa-paper-plane me-1" /> Send Req
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* Single Product Requirement Modal Overlay */}
      {isModalOpen && targetProduct && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px'
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '550px',
              background: '#111',
              border: '1px solid #222',
              borderRadius: '10px',
              padding: '30px',
              color: '#fff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              position: 'relative'
            }}
          >
            {/* Close Button */}
            <button 
              onClick={handleCloseModal}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
            >
              <i className="fas fa-times" />
            </button>

            <h4 style={{ color: '#00ffcc', fontWeight: 'bold', marginBottom: '5px' }}>Send Requirement</h4>
            <p className="text-muted" style={{ fontSize: '13px', marginBottom: '20px' }}>
              Product: <span style={{ color: '#fff', fontWeight: 'bold' }}>{targetProduct.name}</span>
            </p>

            <form onSubmit={handleModalSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label" style={{ color: '#aaa', fontSize: '13px' }}>Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formFields.name}
                    onChange={handleInputChange}
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label" style={{ color: '#aaa', fontSize: '13px' }}>Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formFields.email}
                    onChange={handleInputChange}
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label" style={{ color: '#aaa', fontSize: '13px' }}>Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={formFields.phone}
                    onChange={handleInputChange}
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label" style={{ color: '#aaa', fontSize: '13px' }}>Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="1"
                    value={formFields.quantity}
                    onChange={handleInputChange}
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label" style={{ color: '#aaa', fontSize: '13px' }}>Company</label>
                  <input
                    type="text"
                    name="company"
                    value={formFields.company}
                    onChange={handleInputChange}
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                  />
                </div>
                <div className="col-12 mb-4">
                  <label className="form-label" style={{ color: '#aaa', fontSize: '13px' }}>Requirements / Specifications</label>
                  <textarea
                    name="message"
                    required
                    rows="3"
                    value={formFields.message}
                    onChange={handleInputChange}
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                  />
                </div>
              </div>

              <div className="text-end">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="btn btn-sm btn-outline-secondary me-2"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn btn-sm btn-primary"
                  style={{ background: '#00ffcc', border: 'none', color: '#000', fontWeight: 'bold' }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </>
  )
}
