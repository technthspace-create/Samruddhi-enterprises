import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { 
    cartItems, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    isCartOpen, 
    setIsCartOpen, 
    totalItemsCount 
  } = useCart()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  })

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false)
  }

  const handleCheckoutChange = (e) => {
    const { name, value } = e.target
    setCheckoutForm(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        name: checkoutForm.name,
        email: checkoutForm.email,
        phone: checkoutForm.phone,
        company: checkoutForm.company,
        message: checkoutForm.message || 'Quotation request for selected items.',
        items: cartItems.map(item => ({
          name: item.name,
          slug: item.slug,
          price: item.price,
          quantity: item.quantity
        }))
      }

      const apiBase = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${apiBase}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        clearCart()
        setIsCartOpen(false)
        setCheckoutForm({ name: '', email: '', phone: '', company: '', message: '' })
        navigate('/success')
      } else {
        throw new Error('Inquiry failed')
      }
    } catch (err) {
      console.error(err)
      navigate('/fail')
    } finally {
      setIsSubmitting(false)
    }
  }

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Products', path: '/products' },
    { label: 'Testimonials', path: '/#ori-testimonial-1' },
    { label: 'Contact Us', path: '/contact' }
  ]

  return (
    <>
      <header id="ori-header" className="ori-header-section header-style-one">
        <div className="ori-header-content-area">
          <div className="ori-header-content d-flex align-items-center justify-content-between">
            <div className="brand-logo">
              <Link to="/">
                <img src="/assets/img/logo/logo1.png" alt="Samruddhi Enterprises Logo" />
              </Link>
            </div>
            
            <div className="d-flex align-items-center gap-4">
              <div className="ori-main-navigation-area">
                <nav className="ori-main-navigation clearfix ul-li">
                  <ul id="main-nav" className="nav navbar-nav clearfix">
                    {navLinks.map((link) => {
                      const isHash = link.path.startsWith('/#')
                      const isActive = !isHash && location.pathname === link.path
                      return (
                        <li key={link.path} className={isActive ? 'active' : ''}>
                          {isHash ? (
                            <a href={link.path}>{link.label}</a>
                          ) : (
                            <Link to={link.path}>{link.label}</Link>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              </div>

              {/* Cart Icon (Desktop) */}
              <div 
                onClick={() => setIsCartOpen(true)}
                className="d-none d-lg-flex align-items-center"
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#fff',
                  padding: '10px'
                }}
                title="View Quote Cart"
              >
                <i className="fas fa-shopping-cart" />
                {totalItemsCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '0px',
                    right: '0px',
                    background: '#00ffcc',
                    color: '#000',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {totalItemsCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mobile_menu position-relative">
            <div className="d-flex align-items-center gap-3" style={{ float: 'right', marginTop: '10px' }}>
              {/* Cart Icon (Mobile) */}
              <div 
                onClick={() => setIsCartOpen(true)}
                className="d-lg-none"
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#fff',
                  padding: '5px'
                }}
              >
                <i className="fas fa-shopping-cart" />
                {totalItemsCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: '#00ffcc',
                    color: '#000',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {totalItemsCount}
                  </span>
                )}
              </div>

              <div className="mobile_menu_button open_mobile_menu" onClick={toggleMobileMenu}>
                <i className="fal fa-bars"></i>
              </div>
            </div>
            
            <div className={`mobile_menu_wrap ${isMobileMenuOpen ? 'mobile_menu_open' : ''}`} 
                 style={{ 
                   opacity: isMobileMenuOpen ? 1 : 0, 
                   visibility: isMobileMenuOpen ? 'visible' : 'hidden',
                   transition: 'all 0.3s ease-in-out',
                   position: 'fixed',
                   top: 0,
                   right: 0,
                   width: '300px',
                   height: '100vh',
                   zIndex: 99999,
                   background: '#1a1a1a',
                   padding: '30px'
                 }}>
              <div className="mobile_menu_overlay open_mobile_menu" 
                   onClick={toggleMobileMenu} 
                   style={{
                     position: 'fixed',
                     top: 0,
                     left: 0,
                     width: '100vw',
                     height: '100vh',
                     background: 'rgba(0,0,0,0.5)',
                     zIndex: -1,
                     display: isMobileMenuOpen ? 'block' : 'none'
                   }}></div>
              <div className="mobile_menu_content">
                <div className="mobile_menu_close open_mobile_menu" onClick={toggleMobileMenu} style={{ cursor: 'pointer', textAlign: 'right', marginBottom: '20px' }}>
                  <i className="fal fa-times" style={{ fontSize: '24px', color: '#fff' }}></i>
                </div>
                <div className="m-brand-logo" style={{ marginBottom: '40px' }}>
                  <Link to="/" onClick={handleLinkClick}>
                    <img src="/assets/img/logo/logo1.png" alt="Logo" style={{ maxWidth: '180px' }} />
                  </Link>
                </div>
                <nav className="mobile-main-navigation clearfix ul-li">
                  <ul id="m-main-nav" className="nav navbar-nav clearfix" style={{ listStyle: 'none', padding: 0 }}>
                    {navLinks.map((link) => {
                      const isHash = link.path.startsWith('/#')
                      return (
                        <li key={link.path} style={{ marginBottom: '15px' }}>
                          {isHash ? (
                            <a href={link.path} onClick={handleLinkClick} style={{ color: '#fff', fontSize: '18px', textDecoration: 'none' }}>{link.label}</a>
                          ) : (
                            <Link to={link.path} onClick={handleLinkClick} style={{ color: '#fff', fontSize: '18px', textDecoration: 'none' }}>{link.label}</Link>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Slide-out Cart Drawer Overlay */}
      {isCartOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 999999,
            display: 'flex',
            justifyContent: 'flex-end',
            transition: 'opacity 0.3s ease'
          }}
        >
          {/* Overlay click to close */}
          <div style={{ flex: 1 }} onClick={() => setIsCartOpen(false)} />
          
          {/* Drawer Body */}
          <div 
            style={{
              width: '100%',
              maxWidth: '450px',
              height: '100%',
              background: '#111',
              borderLeft: '1px solid #222',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              padding: '30px',
              color: '#fff',
              overflowY: 'auto'
            }}
          >
            {/* Drawer Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2" style={{ borderBottom: '1px solid #222' }}>
              <h4 style={{ color: '#00ffcc', fontWeight: 'bold', margin: 0 }}>Requirement Cart</h4>
              <button 
                onClick={() => setIsCartOpen(false)} 
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Cart Items List */}
            {cartItems.length === 0 ? (
              <div className="text-center py-5" style={{ flex: 1 }}>
                <i className="fas fa-shopping-basket mb-3" style={{ fontSize: '48px', color: '#444' }} />
                <h5 className="text-muted">Your cart is empty</h5>
                <p style={{ fontSize: '13px', color: '#777' }}>Browse products and add them to request a quote.</p>
                <button 
                  className="btn btn-outline-info mt-3" 
                  onClick={() => setIsCartOpen(false)}
                >
                  Continue Browsing
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ overflowY: 'auto', maxHeight: '300px', marginBottom: '20px' }}>
                  {cartItems.map((item) => (
                    <div 
                      key={item.slug} 
                      className="d-flex align-items-center gap-3 mb-3 p-2" 
                      style={{ background: '#161616', borderRadius: '6px', border: '1px solid #222' }}
                    >
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        style={{ width: '50px', height: '50px', objectFit: 'contain', background: '#0a0a0a', borderRadius: '4px' }} 
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: '#00ffcc' }}>{item.price}</div>
                        
                        {/* Quantity Controls */}
                        <div className="d-flex align-items-center gap-2 mt-1">
                          <button 
                            type="button" 
                            onClick={() => updateQuantity(item.slug, item.quantity - 1)}
                            style={{ width: '20px', height: '20px', background: '#333', border: 'none', color: '#fff', borderRadius: '3px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '13px', minWidth: '15px', textAlign: 'center' }}>{item.quantity}</span>
                          <button 
                            type="button" 
                            onClick={() => updateQuantity(item.slug, item.quantity + 1)}
                            style={{ width: '20px', height: '20px', background: '#333', border: 'none', color: '#fff', borderRadius: '3px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      {/* Delete */}
                      <button 
                        onClick={() => removeFromCart(item.slug)} 
                        style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '16px' }}
                      >
                        <i className="far fa-trash-alt" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Checkout/Quote Form */}
                <div style={{ borderTop: '1px solid #222', paddingTop: '20px' }}>
                  <h5 style={{ color: '#00ffcc', fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Request Quotation</h5>
                  <form onSubmit={handleCheckoutSubmit}>
                    <div className="mb-2">
                      <input 
                        type="text" 
                        name="name" 
                        required 
                        placeholder="Your Name *"
                        value={checkoutForm.name} 
                        onChange={handleCheckoutChange} 
                        className="form-control form-control-sm bg-dark text-white border-secondary"
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                    <div className="mb-2">
                      <input 
                        type="email" 
                        name="email" 
                        required 
                        placeholder="Email Address *"
                        value={checkoutForm.email} 
                        onChange={handleCheckoutChange} 
                        className="form-control form-control-sm bg-dark text-white border-secondary"
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                    <div className="mb-2">
                      <input 
                        type="text" 
                        name="phone" 
                        required 
                        placeholder="Phone Number *"
                        value={checkoutForm.phone} 
                        onChange={handleCheckoutChange} 
                        className="form-control form-control-sm bg-dark text-white border-secondary"
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                    <div className="mb-2">
                      <input 
                        type="text" 
                        name="company" 
                        placeholder="Company Name (Optional)"
                        value={checkoutForm.company} 
                        onChange={handleCheckoutChange} 
                        className="form-control form-control-sm bg-dark text-white border-secondary"
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                    <div className="mb-3">
                      <textarea 
                        name="message" 
                        rows="2" 
                        placeholder="Additional notes/requirements (Optional)..."
                        value={checkoutForm.message} 
                        onChange={handleCheckoutChange} 
                        className="form-control form-control-sm bg-dark text-white border-secondary"
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="btn btn-primary btn-sm w-100"
                      style={{ background: '#00ffcc', border: 'none', color: '#000', fontWeight: 'bold', padding: '8px' }}
                    >
                      {isSubmitting ? 'Sending Request...' : 'Submit Quote Request'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
