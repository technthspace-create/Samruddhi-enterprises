import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { Resend } from 'resend'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseUrl.includes('your-project-id')

const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' })) // Increase limit to handle base64 image uploads

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json')
const INQUIRIES_FILE = path.join(__dirname, 'data', 'inquiries.json')

// Helper to read JSON data safely
function readJsonFile(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8')
      return defaultValue
    }
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err)
    return defaultValue
  }
}

// Helper to write JSON data safely
function writeJsonFile(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err)
  }
}

// Admin Auth Middleware
async function checkAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  const passcode = authHeader && authHeader.split(' ')[1]
  
  if (!passcode) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: No token provided' })
  }

  // 1. Verify with Supabase if configured
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(passcode)
      if (user && !error) {
        req.user = user
        return next()
      }
    } catch (err) {
      console.warn('Supabase auth verification failed:', err.message)
    }
  }

  // 2. Fallback to expected passcode
  const expectedPasscode = process.env.ADMIN_PASSCODE || 'admin123'
  if (passcode === expectedPasscode) {
    return next()
  }
  
  res.status(401).json({ ok: false, error: 'Unauthorized: Invalid credentials' })
}

function requiredEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// --- PRODUCT ENDPOINTS ---

// Get all products
app.get('/api/products', (req, res) => {
  const products = readJsonFile(PRODUCTS_FILE, [])
  res.json(products)
})

// Get single product
app.get('/api/products/:slug', (req, res) => {
  const products = readJsonFile(PRODUCTS_FILE, [])
  const product = products.find(p => p.slug === req.params.slug)
  if (!product) {
    return res.status(404).json({ ok: false, error: 'Product not found' })
  }
  res.json(product)
})

// Create product (Admin)
app.post('/api/products', checkAdminAuth, (req, res) => {
  const products = readJsonFile(PRODUCTS_FILE, [])
  const newProduct = req.body
  
  if (!newProduct.name || !newProduct.slug || !newProduct.category) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' })
  }
  
  // Check duplicate slug
  if (products.some(p => p.slug === newProduct.slug)) {
    return res.status(400).json({ ok: false, error: 'Product slug already exists' })
  }
  
  products.push(newProduct)
  writeJsonFile(PRODUCTS_FILE, products)
  res.json({ ok: true, product: newProduct })
})

// Update product (Admin)
app.put('/api/products/:slug', checkAdminAuth, (req, res) => {
  const products = readJsonFile(PRODUCTS_FILE, [])
  const idx = products.findIndex(p => p.slug === req.params.slug)
  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Product not found' })
  }
  
  const updatedProduct = { ...products[idx], ...req.body }
  // Ensure slug hasn't changed to duplicate another product
  if (updatedProduct.slug !== req.params.slug && products.some(p => p.slug === updatedProduct.slug)) {
    return res.status(400).json({ ok: false, error: 'Target slug already exists' })
  }
  
  products[idx] = updatedProduct
  writeJsonFile(PRODUCTS_FILE, products)
  res.json({ ok: true, product: updatedProduct })
})

// Delete product (Admin)
app.delete('/api/products/:slug', checkAdminAuth, (req, res) => {
  const products = readJsonFile(PRODUCTS_FILE, [])
  const filtered = products.filter(p => p.slug !== req.params.slug)
  if (filtered.length === products.length) {
    return res.status(404).json({ ok: false, error: 'Product not found' })
  }
  writeJsonFile(PRODUCTS_FILE, filtered)
  res.json({ ok: true })
})

// --- INQUIRY ENDPOINTS ---

// Get all inquiries (Admin)
app.get('/api/inquiries', checkAdminAuth, (req, res) => {
  const inquiries = readJsonFile(INQUIRIES_FILE, [])
  inquiries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json(inquiries)
})

// Delete inquiry (Admin)
app.delete('/api/inquiries/:id', checkAdminAuth, (req, res) => {
  const inquiries = readJsonFile(INQUIRIES_FILE, [])
  const filtered = inquiries.filter(i => i.id !== req.params.id)
  if (filtered.length === inquiries.length) {
    return res.status(404).json({ ok: false, error: 'Inquiry not found' })
  }
  writeJsonFile(INQUIRIES_FILE, filtered)
  res.json({ ok: true })
})

// --- ADMIN LOGIN & UTILS ---

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { passcode } = req.body || {}
  const expectedPasscode = process.env.ADMIN_PASSCODE || 'admin123'
  if (passcode === expectedPasscode) {
    res.json({ ok: true, token: passcode })
  } else {
    res.status(401).json({ ok: false, error: 'Invalid passcode' })
  }
})

// Upload Image (Admin)
app.post('/api/admin/upload', checkAdminAuth, (req, res) => {
  const { fileName, base64Data } = req.body || {}
  if (!fileName || !base64Data) {
    return res.status(400).json({ ok: false, error: 'Missing file data' })
  }

  try {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(cleanBase64, 'base64')
    
    const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9.-]/g, '_')
    const relativePath = `/uploads/${Date.now()}_${safeName}`
    const absolutePath = path.join(projectRoot, 'public', relativePath)
    
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
    fs.writeFileSync(absolutePath, buffer)
    
    res.json({ ok: true, url: relativePath })
  } catch (err) {
    console.error('File write failed:', err)
    res.status(500).json({ ok: false, error: 'Failed to save image file' })
  }
})

// --- PUBLIC INQUIRY SUBMISSION ---

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, company, message, items } = req.body || {}

  const clean = {
    name: String(name || '').trim(),
    email: String(email || '').trim(),
    phone: String(phone || '').trim(),
    company: String(company || '').trim(),
    message: String(message || '').trim(),
  }

  if (!clean.name || !clean.email || !clean.phone || !clean.message) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email' })
  }

  // 1. Save to local JSON database
  try {
    const inquiries = readJsonFile(INQUIRIES_FILE, [])
    inquiries.push({
      id: String(Date.now()),
      name: clean.name,
      email: clean.email,
      phone: clean.phone,
      company: clean.company,
      message: clean.message,
      items: Array.isArray(items) ? items : [], // Save cart items / product requirements
      createdAt: new Date().toISOString(),
    })
    writeJsonFile(INQUIRIES_FILE, inquiries)
  } catch (saveErr) {
    console.error('Failed to save inquiry to file:', saveErr)
  }

  // 2. Email Notification (Resend)
  try {
    const resend = new Resend(requiredEnv('RESEND_API_KEY'))
    const toEmail = requiredEnv('RESEND_TO_EMAIL')
    const fromEmail = requiredEnv('RESEND_FROM_EMAIL')

    const subject = `New lead: ${clean.name}`
    const companyLine = clean.company ? `<strong>Company:</strong> ${escapeHtml(clean.company)}<br>` : ''

    // Format requested items list for email
    let itemsHtml = ''
    if (Array.isArray(items) && items.length > 0) {
      itemsHtml = '<h3>Requested Items / Requirements:</h3><ul>'
      items.forEach(item => {
        itemsHtml += `<li><strong>${escapeHtml(item.name)}</strong> (Qty: ${item.quantity || 1}) ${item.price ? ` - ${escapeHtml(item.price)}` : ''}</li>`
      })
      itemsHtml += '</ul><br>'
    }

    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: clean.email,
      subject,
      html:
        `<p><strong>New enquiry from the website</strong></p>` +
        `<p>` +
        `<strong>Name:</strong> ${escapeHtml(clean.name)}<br>` +
        companyLine +
        `<strong>Email:</strong> ${escapeHtml(clean.email)}<br>` +
        `<strong>Phone:</strong> ${escapeHtml(clean.phone)}<br>` +
        `</p>` +
        itemsHtml +
        `<p><strong>Message / Notes:</strong><br>${escapeHtml(clean.message).replace(/\n/g, '<br>')}</p>`,
    })

    if (process.env.RESEND_ENABLE_AUTOREPLY !== 'false') {
      await resend.emails.send({
        from: fromEmail,
        to: clean.email,
        subject: 'We received your enquiry - Samruddhi Enterprises',
        html:
          `<p>Dear ${escapeHtml(clean.name)},</p>` +
          `<p>Thank you for contacting Samruddhi Enterprises. We have received your message and will get back to you soon.</p>` +
          `<p>Phone: +91 9900454111 / 9036111365<br>Email: samruddhi.575@gmail.com</p>` +
          `<p><small>Please do not reply to this automated email.</small></p>`,
      })
    }

    return res.json({ ok: true })
  } catch (err) {
    console.error('Contact email send failed:', err?.message || err)
    // Return success to the client because it is saved in the local inquiries database
    return res.json({ ok: true, warning: 'Email notification could not be sent' })
  }
})

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// Serve static assets in production (if built)
const distPath = path.join(projectRoot, 'dist')
app.use(express.static(distPath))

// Catch-all route to serve React app for frontend navigation
app.get(/.*/, (req, res) => {
  if (!req.path.startsWith('/api/')) {
    const indexPath = path.join(distPath, 'index.html')
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath)
    } else {
      res.status(404).send('Frontend build not found. Run "npm run build" first.')
    }
  }
})

const port = Number(process.env.PORT || 8787)
app.listen(port, () => {
  console.log(`API server listening on http://127.0.0.1:${port}`)
})

