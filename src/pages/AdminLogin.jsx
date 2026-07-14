import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient.js'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loginMode, setLoginMode] = useState('supabase') // 'supabase' | 'signup' | 'passcode'
  const [showPassword, setShowPassword] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  
  // Reset Password states
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const navigate = useNavigate()

  useEffect(() => {
    // If already logged in, redirect to admin dashboard (unless it is a password recovery link)
    const checkSession = async () => {
      const hash = window.location.hash
      const isRecovery = hash && hash.includes('type=recovery')

      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          if (isRecovery) {
            setIsResettingPassword(true)
          } else {
            localStorage.setItem('adminToken', session.access_token)
            navigate('/admin')
          }
        }
      }
    }
    checkSession()
  }, [navigate])

  useEffect(() => {
    // Listen for the password recovery event from Supabase auth redirects
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsResettingPassword(true)
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [])

  const handleSupabaseLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.')
      setIsLoading(false)
      return
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        setError(authError.message)
      } else if (data?.session) {
        localStorage.setItem('adminToken', data.session.access_token)
        navigate('/admin')
      } else {
        setError('Login failed. No active session returned.')
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred during authentication.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured.')
      setIsLoading(false)
      return
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      })

      if (signUpError) {
        setError(signUpError.message)
      } else if (data?.user) {
        setSuccessMessage('Account created successfully! You can now sign in.')
        setLoginMode('supabase')
      } else {
        setError('Signup failed.')
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred during sign up.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasscodeLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      const response = await fetch(`${apiBase}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      })

      const data = await response.json()
      if (response.ok && data.ok) {
        localStorage.setItem('adminToken', data.token)
        navigate('/admin')
      } else {
        setError(data.error || 'Invalid passcode')
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred during authentication.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured.')
      setIsLoading(false)
      return
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/admin/login'
      })

      if (resetError) {
        setError(resetError.message)
      } else {
        setSuccessMessage('Password reset link sent! Please check your email.')
        setIsForgotPassword(false)
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred during password reset request.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      setIsLoading(false)
      return
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured.')
      setIsLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccessMessage('Password updated successfully! You can now sign in with your new password.')
        setIsResettingPassword(false)
        setNewPassword('')
        setConfirmPassword('')
        setLoginMode('supabase')
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred during password update.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <section style={{ 
        minHeight: '80vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#0a0a0a',
        padding: '40px 15px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: '#111',
          border: '1px solid #222',
          borderRadius: '12px',
          padding: '40px 30px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          color: '#fff'
        }}>
          <div className="text-center mb-4">
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#00ffcc' }}>Admin Portal</h2>
            <p style={{ fontSize: '14px', color: '#aaa', marginTop: '5px' }}>
              {isResettingPassword ? 'Enter your new password' : isForgotPassword ? 'Reset your admin password' : 'Access the Samruddhi Admin Dashboard'}
            </p>
          </div>

          {/* Premium Tab Navigation (Only visible when NOT in Forgot Password or Resetting Password mode) */}
          {!isForgotPassword && !isResettingPassword && (
            <div style={{
              display: 'flex',
              borderBottom: '2px solid #222',
              marginBottom: '25px',
              gap: '10px'
            }}>
              <button
                onClick={() => { setLoginMode('supabase'); setError(''); setSuccessMessage(''); setShowPassword(false); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: loginMode === 'supabase' ? '2px solid #00ffcc' : '2px solid transparent',
                  color: loginMode === 'supabase' ? '#00ffcc' : '#888',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  marginBottom: '-2px'
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => { setLoginMode('signup'); setError(''); setSuccessMessage(''); setShowPassword(false); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: loginMode === 'signup' ? '2px solid #00ffcc' : '2px solid transparent',
                  color: loginMode === 'signup' ? '#00ffcc' : '#888',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  marginBottom: '-2px'
                }}
              >
                Sign Up
              </button>
              <button
                onClick={() => { setLoginMode('passcode'); setError(''); setSuccessMessage(''); setShowPassword(false); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: loginMode === 'passcode' ? '2px solid #00ffcc' : '2px solid transparent',
                  color: loginMode === 'passcode' ? '#00ffcc' : '#888',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  marginBottom: '-2px'
                }}
              >
                Passcode
              </button>
            </div>
          )}

          {!isSupabaseConfigured && (loginMode === 'supabase' || loginMode === 'signup' || isForgotPassword || isResettingPassword) && (
            <div className="alert alert-warning mb-4" role="alert" style={{ fontSize: '13px', background: '#3b2f1c', border: '1px solid #ffcc4d', color: '#ffe6a3', borderRadius: '6px', padding: '10px 15px' }}>
              <i className="fas fa-exclamation-triangle me-2" />
              <strong>Supabase Config Missing:</strong> Please add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file.
            </div>
          )}

          {error && (
            <div className="alert alert-danger" role="alert" style={{ fontSize: '13px', background: '#3b1c1c', border: '1px solid #ff4d4d', color: '#ffb3b3', borderRadius: '6px', padding: '10px 15px', marginBottom: '20px' }}>
              <i className="fas fa-exclamation-circle me-2" />
              {error}
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success" role="alert" style={{ fontSize: '13px', background: '#1c3b24', border: '1px solid #4dff88', color: '#b3ffcc', borderRadius: '6px', padding: '10px 15px', marginBottom: '20px' }}>
              <i className="fas fa-check-circle me-2" />
              {successMessage}
            </div>
          )}

          {isResettingPassword ? (
            <form onSubmit={handleUpdatePassword}>
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '12px 45px 12px 16px',
                      borderRadius: '6px',
                      border: '1px solid #333',
                      background: '#1d1d1d',
                      color: '#fff',
                      fontSize: '15px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '12px 45px 12px 16px',
                      borderRadius: '6px',
                      border: '1px solid #333',
                      background: '#1d1d1d',
                      color: '#fff',
                      fontSize: '15px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#00ffcc',
                  color: '#000',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: isLoading ? 0.7 : 1,
                  marginBottom: '15px'
                }}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setIsResettingPassword(false); setError(''); setSuccessMessage(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#aaa',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#00ffcc'}
                  onMouseOut={(e) => e.target.style.color = '#aaa'}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : isForgotPassword ? (
            <form onSubmit={handleForgotPassword}>
              <div className="mb-4">
                <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  disabled={!isSupabaseConfigured}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    border: '1px solid #333',
                    background: !isSupabaseConfigured ? '#111' : '#1d1d1d',
                    color: '#fff',
                    fontSize: '15px'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !isSupabaseConfigured}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#00ffcc',
                  color: '#000',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isSupabaseConfigured ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  opacity: (isLoading || !isSupabaseConfigured) ? 0.7 : 1,
                  marginBottom: '15px'
                }}
              >
                {isLoading ? 'Sending Link...' : 'Send Reset Link'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMessage(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#aaa',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#00ffcc'}
                  onMouseOut={(e) => e.target.style.color = '#aaa'}
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <>
              {loginMode === 'supabase' && (
                <form onSubmit={handleSupabaseLogin}>
                  <div className="mb-3">
                    <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      disabled={!isSupabaseConfigured}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        border: '1px solid #333',
                        background: !isSupabaseConfigured ? '#111' : '#1d1d1d',
                        color: '#fff',
                        fontSize: '15px'
                      }}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMessage(''); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#00ffcc',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        disabled={!isSupabaseConfigured}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          padding: '12px 45px 12px 16px',
                          borderRadius: '6px',
                          border: '1px solid #333',
                          background: !isSupabaseConfigured ? '#111' : '#1d1d1d',
                          color: '#fff',
                          fontSize: '15px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !isSupabaseConfigured}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#00ffcc',
                      color: '#000',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: isSupabaseConfigured ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      opacity: (isLoading || !isSupabaseConfigured) ? 0.7 : 1
                    }}
                  >
                    {isLoading ? 'Verifying...' : 'Access Dashboard'}
                  </button>
                </form>
              )}

              {loginMode === 'signup' && (
                <form onSubmit={handleSignUp}>
                  <div className="mb-3">
                    <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      disabled={!isSupabaseConfigured}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        border: '1px solid #333',
                        background: !isSupabaseConfigured ? '#111' : '#1d1d1d',
                        color: '#fff',
                        fontSize: '15px'
                      }}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Create Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        disabled={!isSupabaseConfigured}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          padding: '12px 45px 12px 16px',
                          borderRadius: '6px',
                          border: '1px solid #333',
                          background: !isSupabaseConfigured ? '#111' : '#1d1d1d',
                          color: '#fff',
                          fontSize: '15px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !isSupabaseConfigured}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#00ffcc',
                      color: '#000',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: isSupabaseConfigured ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      opacity: (isLoading || !isSupabaseConfigured) ? 0.7 : 1
                    }}
                  >
                    {isLoading ? 'Creating Account...' : 'Register Admin Account'}
                  </button>
                </form>
              )}

              {loginMode === 'passcode' && (
                <form onSubmit={handlePasscodeLogin}>
                  <div className="mb-4">
                    <label className="form-label" style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Admin Passcode
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="Enter passcode (e.g. admin123)"
                        style={{
                          width: '100%',
                          padding: '12px 45px 12px 16px',
                          borderRadius: '6px',
                          border: '1px solid #333',
                          background: '#1d1d1d',
                          color: '#fff',
                          fontSize: '15px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#00ffcc',
                      color: '#000',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      opacity: isLoading ? 0.7 : 1
                    }}
                  >
                    {isLoading ? 'Verifying...' : 'Access Dashboard'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
