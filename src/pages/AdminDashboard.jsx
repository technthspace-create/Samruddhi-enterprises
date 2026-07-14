import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { supabase } from '../utils/supabaseClient.js'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [activeTab, setActiveTab] = useState('products')
  
  // Data State
  const [products, setProducts] = useState([])
  const [inquiries, setInquiries] = useState([])
  
  // UI Loading / Error
  const [isLoading, setIsLoading] = useState(true)
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' })
  
  // Product Form State
  const [isEditing, setIsEditing] = useState(false) // true if editing or adding
  const [editProduct, setEditProduct] = useState(null) // null = adding, object = editing
  const [formFields, setFormFields] = useState({
    name: '',
    slug: '',
    category: 'seals',
    price: '',
    description: '',
    images: [''],
    specs: []
  })
  
  // Spec Form helpers
  const [newSpecKey, setNewSpecKey] = useState('')
  const [newSpecVal, setNewSpecVal] = useState('')

  // 1. Verify Authentication on Mount
  useEffect(() => {
    async function checkAuth() {
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setToken(session.access_token)
            loadData(session.access_token)
            return
          }
        } catch (err) {
          console.warn('Supabase session fetch error:', err)
        }
      }
      
      const savedToken = localStorage.getItem('adminToken')
      if (savedToken) {
        setToken(savedToken)
        loadData(savedToken)
      } else {
        navigate('/admin/login')
      }
    }
    checkAuth()
  }, [navigate])

  // 2. Fetch Data helper
  async function loadData(authToken) {
    setIsLoading(true)
    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      // Load Products
      const prodRes = await fetch(`${apiBase}/api/products`)
      if (prodRes.ok) {
        const prodData = await prodRes.json()
        setProducts(prodData)
      }
      
      // Load Inquiries
      const inqRes = await fetch(`${apiBase}/api/inquiries`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
      if (inqRes.ok) {
        const inqData = await inqRes.json()
        setInquiries(inqData)
      }
    } catch (err) {
      console.error(err)
      showFeedback('danger', 'Failed to load backend data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    localStorage.removeItem('adminToken')
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.warn('Supabase signout error:', err)
      }
    }
    navigate('/admin/login')
  }

  const showFeedback = (type, text) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 5000)
  }

  // Generate slug dynamically from Name
  const handleNameChange = (e) => {
    const val = e.target.value
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // remove special chars
      .replace(/\s+/g, '-') // spaces to dashes
      .replace(/-+/g, '-') // collapse multiple dashes
      
    setFormFields(prev => ({
      ...prev,
      name: val,
      slug: editProduct ? prev.slug : autoSlug // Only auto-fill slug if adding a new product
    }))
  }

  // --- PRODUCT CRUD WORKFLOWS ---

  const handleStartAdd = () => {
    setEditProduct(null)
    setFormFields({
      name: '',
      slug: '',
      category: 'seals',
      price: '',
      description: '',
      images: [''],
      specs: []
    })
    setIsEditing(true)
  }

  const handleStartEdit = (product) => {
    setEditProduct(product)
    setFormFields({
      name: product.name,
      slug: product.slug,
      category: product.category,
      price: product.price,
      description: product.description || '',
      images: product.images && product.images.length > 0 ? [...product.images] : [''],
      specs: product.specs ? [...product.specs] : []
    })
    setIsEditing(true)
  }

  const handleDeleteProduct = async (slug) => {
    if (!window.confirm(`Are you sure you want to delete product "${slug}"?`)) return
    
    try {
      const res = await fetch(`/api/products/${slug}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        showFeedback('success', 'Product deleted successfully')
        loadData(token)
      } else {
        const err = await res.json()
        showFeedback('danger', err.error || 'Failed to delete product')
      }
    } catch (err) {
      console.error(err)
      showFeedback('danger', 'Network error deleting product')
    }
  }

  // Spec operations
  const handleAddSpec = () => {
    if (!newSpecKey.trim() || !newSpecVal.trim()) return
    setFormFields(prev => ({
      ...prev,
      specs: [...prev.specs, { key: newSpecKey.trim(), value: newSpecVal.trim() }]
    }))
    setNewSpecKey('')
    setNewSpecVal('')
  }

  const handleRemoveSpec = (index) => {
    setFormFields(prev => ({
      ...prev,
      specs: prev.specs.filter((_, idx) => idx !== index)
    }))
  }

  // Base64 Image Upload handler
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || ''
        const res = await fetch(`${apiBase}/api/admin/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: file.name,
            base64Data: reader.result
          })
        })

        const data = await res.json()
        if (res.ok && data.ok) {
          // Set uploaded URL as the primary image (first image slot)
          setFormFields(prev => {
            const updatedImgs = [...prev.images]
            updatedImgs[0] = data.url
            return { ...prev, images: updatedImgs }
          })
          showFeedback('success', 'Image uploaded successfully!')
        } else {
          showFeedback('danger', data.error || 'Upload failed')
        }
      } catch (err) {
        console.error(err)
        showFeedback('danger', 'Error uploading image')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    
    // Clean up empty images list
    const cleanedImages = formFields.images.filter(img => img.trim() !== '')
    if (cleanedImages.length === 0) {
      cleanedImages.push('/assets/img/shop/shop1.png') // fallback placeholder
    }
    
    const payload = {
      ...formFields,
      images: cleanedImages
    }

    try {
      const url = editProduct ? `/api/products/${editProduct.slug}` : '/api/products'
      const method = editProduct ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        showFeedback('success', editProduct ? 'Product updated successfully' : 'Product created successfully')
        setIsEditing(false)
        setEditProduct(null)
        loadData(token)
      } else {
        const err = await res.json()
        showFeedback('danger', err.error || 'Failed to save product')
      }
    } catch (err) {
      console.error(err)
      showFeedback('danger', 'Network error saving product')
    }
  }

  // --- INQUIRY ACTIONS ---

  const handleDeleteInquiry = async (id) => {
    if (!window.confirm('Delete this inquiry?')) return
    
    try {
      const res = await fetch(`/api/inquiries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        showFeedback('success', 'Inquiry deleted')
        loadData(token)
      } else {
        const err = await res.json()
        showFeedback('danger', err.error || 'Failed to delete inquiry')
      }
    } catch (err) {
      console.error(err)
      showFeedback('danger', 'Network error deleting inquiry')
    }
  }

  // --- RENDERING PARTIALS ---

  const renderProductsTable = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 style={{ color: '#00ffcc', margin: 0 }}>Products List ({products.length})</h4>
        <button className="btn btn-sm" onClick={handleStartAdd} style={{ background: '#00ffcc', color: '#000', fontWeight: 'bold' }}>
          <i className="fas fa-plus me-2" />Add New Product
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-dark table-hover" style={{ borderColor: '#222' }}>
          <thead>
            <tr>
              <th style={{ color: '#aaa', width: '80px' }}>Image</th>
              <th style={{ color: '#aaa' }}>Name</th>
              <th style={{ color: '#aaa', width: '150px' }}>Category</th>
              <th style={{ color: '#aaa', width: '150px' }}>Price</th>
              <th style={{ color: '#aaa', width: '180px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(prod => (
              <tr key={prod.slug} style={{ verticalAlign: 'middle' }}>
                <td>
                  <img
                    src={prod.images && prod.images.length > 0 ? prod.images[0] : '/assets/img/shop/shop1.png'}
                    alt=""
                    style={{ width: '50px', height: '50px', objectFit: 'contain', background: '#080808', borderRadius: '4px' }}
                  />
                </td>
                <td style={{ fontWeight: 'bold' }}>
                  <Link to={`/products/${prod.slug}`} target="_blank" style={{ color: '#fff', textDecoration: 'none' }}>
                    {prod.name}
                  </Link>
                  <div style={{ fontSize: '11px', color: '#888' }}>slug: {prod.slug}</div>
                </td>
                <td>
                  <span className="badge bg-secondary" style={{ textTransform: 'capitalize' }}>{prod.category}</span>
                </td>
                <td style={{ color: '#00ffcc' }}>{prod.price}</td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn btn-sm btn-outline-info me-2" onClick={() => handleStartEdit(prod)}>
                    <i className="fas fa-edit" /> Edit
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteProduct(prod.slug)}>
                    <i className="fas fa-trash-alt" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderProductForm = () => (
    <div style={{ background: '#161616', padding: '30px', borderRadius: '8px', border: '1px solid #222' }}>
      <h4 style={{ color: '#00ffcc', marginBottom: '25px' }}>
        {editProduct ? `Edit Product: ${editProduct.name}` : 'Add New Product'}
      </h4>

      <form onSubmit={handleSaveProduct}>
        <div className="row">
          {/* Name */}
          <div className="col-md-6 mb-3">
            <label className="form-label text-muted">Product Name *</label>
            <input
              type="text"
              required
              value={formFields.name}
              onChange={handleNameChange}
              className="form-control bg-dark text-white border-secondary"
            />
          </div>

          {/* Slug */}
          <div className="col-md-6 mb-3">
            <label className="form-label text-muted">Slug (URL endpoint) *</label>
            <input
              type="text"
              required
              disabled={!!editProduct} // Do not allow editing slug for existing products to maintain bookmarks
              value={formFields.slug}
              onChange={(e) => setFormFields(prev => ({ ...prev, slug: e.target.value }))}
              className="form-control bg-dark text-white border-secondary"
            />
          </div>

          {/* Category */}
          <div className="col-md-6 mb-3">
            <label className="form-label text-muted">Category *</label>
            <select
              value={formFields.category}
              onChange={(e) => setFormFields(prev => ({ ...prev, category: e.target.value }))}
              className="form-select bg-dark text-white border-secondary"
            >
              <option value="seals">Seals</option>
              <option value="hardware">Hardware</option>
              <option value="interlocking">Interlocking</option>
              <option value="doors">Clean Room Doors</option>
              <option value="pass-box">Pass Box</option>
            </select>
          </div>

          {/* Price */}
          <div className="col-md-6 mb-3">
            <label className="form-label text-muted">Price Display (e.g. "₹65 / Meter" or "Get Quotation")</label>
            <input
              type="text"
              value={formFields.price}
              onChange={(e) => setFormFields(prev => ({ ...prev, price: e.target.value }))}
              className="form-control bg-dark text-white border-secondary"
            />
          </div>

          {/* Description */}
          <div className="col-12 mb-3">
            <label className="form-label text-muted">Description</label>
            <textarea
              rows="3"
              value={formFields.description}
              onChange={(e) => setFormFields(prev => ({ ...prev, description: e.target.value }))}
              className="form-control bg-dark text-white border-secondary"
            />
          </div>

          {/* Image Upload / URL */}
          <div className="col-12 mb-4">
            <label className="form-label text-muted">Product Image</label>
            <div className="row align-items-center">
              <div className="col-md-8 mb-2 mb-md-0">
                <input
                  type="text"
                  placeholder="/assets/img/shop/shop1.png"
                  value={formFields.images[0]}
                  onChange={(e) => {
                    const val = e.target.value
                    setFormFields(prev => {
                      const updated = [...prev.images]
                      updated[0] = val
                      return { ...prev, images: updated }
                    })
                  }}
                  className="form-control bg-dark text-white border-secondary"
                />
              </div>
              <div className="col-md-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  id="product-image-upload"
                />
                <label
                  htmlFor="product-image-upload"
                  className="btn btn-outline-info w-100"
                  style={{ cursor: 'pointer', margin: 0, padding: '9px' }}
                >
                  <i className="fas fa-upload me-2" />Upload Local Image
                </label>
              </div>
            </div>
          </div>

          {/* Specifications Table Editor */}
          <div className="col-12 mb-4">
            <h5 style={{ color: '#00ffcc', fontSize: '16px', borderBottom: '1px solid #333', paddingBottom: '8px', marginBottom: '15px' }}>Product Specifications</h5>
            
            {/* Added specs list */}
            {formFields.specs.length > 0 ? (
              <table className="table table-sm table-dark mb-3">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {formFields.specs.map((spec, index) => (
                    <tr key={index}>
                      <td>{spec.key}</td>
                      <td>{spec.value}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button type="button" className="btn btn-link text-danger p-0" onClick={() => handleRemoveSpec(index)}>
                          <i className="fas fa-minus-circle" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted" style={{ fontSize: '13px' }}>No specifications added yet.</p>
            )}

            {/* Spec inputs */}
            <div className="d-flex gap-2">
              <input
                type="text"
                placeholder="Key (e.g. Material)"
                value={newSpecKey}
                onChange={(e) => setNewSpecKey(e.target.value)}
                className="form-control bg-dark text-white border-secondary"
                style={{ width: '40%' }}
              />
              <input
                type="text"
                placeholder="Value (e.g. Rubber)"
                value={newSpecVal}
                onChange={(e) => setNewSpecVal(e.target.value)}
                className="form-control bg-dark text-white border-secondary"
                style={{ width: '45%' }}
              />
              <button type="button" className="btn btn-outline-info" onClick={handleAddSpec} style={{ width: '15%' }}>
                Add Spec
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="col-12 text-end mt-3">
            <button
              type="button"
              className="btn btn-outline-secondary me-2"
              onClick={() => {
                setIsEditing(false)
                setEditProduct(null)
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: '#00ffcc', border: 'none', color: '#000', fontWeight: 'bold' }}>
              Save Product
            </button>
          </div>

        </div>
      </form>
    </div>
  )

  const renderInquiriesTable = () => (
    <div>
      <h4 style={{ color: '#00ffcc', marginBottom: '20px' }}>Submitted Customer Inquiries ({inquiries.length})</h4>

      {inquiries.length === 0 ? (
        <div className="text-center py-5" style={{ color: '#aaa', background: '#111', borderRadius: '8px', border: '1px solid #222' }}>
          <h3>No inquiries found</h3>
          <p>Contact forms filled by visitors will appear here.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-dark table-striped table-hover" style={{ borderColor: '#222', fontSize: '14px' }}>
            <thead>
              <tr>
                <th style={{ color: '#aaa', width: '150px' }}>Date</th>
                <th style={{ color: '#aaa', width: '150px' }}>Name</th>
                <th style={{ color: '#aaa', width: '200px' }}>Contact Info</th>
                <th style={{ color: '#aaa', width: '150px' }}>Company</th>
                <th style={{ color: '#aaa' }}>Message</th>
                <th style={{ color: '#aaa', width: '80px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map(inq => (
                <tr key={inq.id}>
                  <td>{new Date(inq.createdAt).toLocaleString()}</td>
                  <td style={{ fontWeight: 'bold', color: '#00ffcc' }}>{inq.name}</td>
                  <td>
                    <div><i className="far fa-envelope me-1" /> {inq.email}</div>
                    <div><i className="fas fa-phone-alt me-1" /> {inq.phone}</div>
                  </td>
                  <td>{inq.company || <span className="text-muted">-</span>}</td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>
                    {inq.items && inq.items.length > 0 && (
                      <div className="mb-2 p-2" style={{ background: '#080808', border: '1px solid #222', borderRadius: '4px' }}>
                        <strong style={{ color: '#00ffcc', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                          <i className="fas fa-boxes me-1" /> Requested Products / Requirements:
                        </strong>
                        <ul className="m-0 pl-3" style={{ fontSize: '13px', color: '#fff', listStyleType: 'square' }}>
                          {inq.items.map((item, idx) => (
                            <li key={idx}>
                              {item.name} <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>(Qty: {item.quantity || 1})</span> {item.price ? ` - ${item.price}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>{inq.message}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteInquiry(inq.id)}>
                      <i className="fas fa-trash-alt" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <>
      <section style={{ minHeight: '80vh', background: '#0a0a0a', padding: '40px 0', color: '#fff' }}>
        <div className="container">
          
          {/* Dashboard Header Bar */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3" style={{ borderBottom: '1px solid #222' }}>
            <div className="d-flex align-items-center gap-3">
              <img src="/assets/img/logo/logo1.png" alt="Logo" style={{ maxHeight: '55px', width: 'auto' }} />
              <div>
                <h2 style={{ fontWeight: 'bold', color: '#fff', margin: 0 }}>Admin Control Panel</h2>
                <span className="text-muted" style={{ fontSize: '13px' }}>Manage website products and incoming customer inquiries</span>
              </div>
            </div>
            <div className="d-flex align-items-center gap-3 mt-3 mt-md-0">
              <span style={{ fontSize: '14px', color: '#bbb' }}><i className="fas fa-user-shield text-info me-2" />Logged in</span>
              <button className="btn btn-sm btn-outline-danger" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt me-2" />Logout
              </button>
            </div>
          </div>

          {/* Feedback message banner */}
          {feedbackMsg.text && (
            <div className={`alert alert-${feedbackMsg.type} mb-4`} role="alert" style={{ fontSize: '15px' }}>
              {feedbackMsg.type === 'success' ? <i className="fas fa-check-circle me-2" /> : <i className="fas fa-exclamation-circle me-2" />}
              {feedbackMsg.text}
            </div>
          )}

          {/* Main Layout Tabs */}
          {!isEditing && (
            <div className="mb-4">
              <div className="d-flex border-bottom" style={{ borderColor: '#333' }}>
                <button
                  onClick={() => setActiveTab('products')}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    background: 'transparent',
                    color: activeTab === 'products' ? '#00ffcc' : '#aaa',
                    borderBottom: activeTab === 'products' ? '3px solid #00ffcc' : 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  <i className="fas fa-boxes me-2" />Product Catalog
                </button>
                <button
                  onClick={() => setActiveTab('inquiries')}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    background: 'transparent',
                    color: activeTab === 'inquiries' ? '#00ffcc' : '#aaa',
                    borderBottom: activeTab === 'inquiries' ? '3px solid #00ffcc' : 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  <i className="far fa-envelope me-2" />Inquiries Leads
                </button>
              </div>
            </div>
          )}

          {/* Content Loading State */}
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-info" role="status">
                <span className="visually-hidden">Loading data...</span>
              </div>
            </div>
          ) : isEditing ? (
            renderProductForm()
          ) : activeTab === 'products' ? (
            renderProductsTable()
          ) : (
            renderInquiriesTable()
          )}

        </div>
      </section>
    </>
  )
}
