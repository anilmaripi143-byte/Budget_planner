import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { parseBankSms, categorise } from './smsParser.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
export const supabase = createClient(supabaseUrl, supabaseKey);

// Rate Limiting Map: key -> timestamps array
const rateLimitMap = new Map();

function checkRateLimit(key, maxRequests = 30, windowMs = 60000) {
  const now = Date.now();
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }
  const timestamps = rateLimitMap.get(key).filter(t => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Smart Budget Planner Serverless Backend',
    timestamp: new Date().toISOString()
  });
});

// Authentication Middleware
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  req.user = user;
  next();
}

// User Profile Endpoint
app.get('/api/user/profile', authenticateUser, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }
  res.json({ profile: data, user: req.user });
});

// SMS Webhook Endpoint (30 reqs/min rate limit per key)
app.post('/api/sms-webhook', async (req, res) => {
  const { key, sms_text, received_at } = req.body || {};

  if (!key || typeof key !== 'string') {
    return res.status(401).json({ error: 'Missing or invalid webhook key' });
  }

  // Rate Limiting Check
  if (!checkRateLimit(key)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Maximum 30 requests per minute.' });
  }

  // Look up user profile by webhook_key
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('webhook_key', key)
    .maybeSingle();

  // If Supabase profile not found, fallback to test demo key
  const userId = profile?.user_id || profile?.id || 'demo_user_32key';

  if (profileErr && key !== 'test_demo_webhook_key_32chars_sample') {
    return res.status(401).json({ error: 'Unauthorized webhook key' });
  }

  // Run Bank SMS Parser (Do NOT log or store raw sms_text)
  const parsed = parseBankSms(sms_text);
  if (!parsed) {
    return res.status(200).json({ ignored: true, reason: 'Message is not a financial transaction or is an alert/OTP' });
  }

  // Fetch custom merchant rules for user
  const { data: userRules } = await supabase
    .from('merchant_rules')
    .select('*')
    .eq('user_id', userId);

  // Categorize
  const catResult = categorise(userId, parsed.merchant, userRules || []);

  // Deduplication Check (Same user, same amount within 2 minutes)
  const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: existingTx } = await supabase
    .from('expenses')
    .select('id')
    .eq('user_id', userId)
    .eq('amount', parsed.amount)
    .gte('created_at', twoMinsAgo)
    .maybeSingle();

  if (existingTx) {
    return res.status(200).json({ ignored: true, reason: 'Duplicate transaction within 2-minute window' });
  }

  // Insert into DB
  const { data: newTx, error: insertErr } = await supabase
    .from('expenses')
    .insert([
      {
        user_id: userId,
        title: parsed.merchant,
        merchant: parsed.merchant,
        amount: parsed.amount,
        category: catResult.category,
        source: 'sms',
        status: catResult.status,
        account_last4: parsed.accountLast4,
        created_at: received_at || new Date().toISOString()
      }
    ])
    .select();

  return res.status(200).json({
    saved: true,
    category: catResult.category,
    amount: parsed.amount,
    merchant: parsed.merchant,
    status: catResult.status,
    transaction: newTx ? newTx[0] : null
  });
});

// Expenses Endpoints
app.get('/api/expenses', authenticateUser, async (req, res) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }
  res.json({ expenses: data });
});

app.post('/api/expenses', authenticateUser, async (req, res) => {
  const { title, amount, category, currency } = req.body;
  if (!title || !amount) {
    return res.status(400).json({ error: 'Title and amount are required' });
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert([
      {
        user_id: req.user.id,
        title,
        amount,
        category: category || 'General',
        currency: currency || 'USD'
      }
    ])
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }
  res.status(201).json({ expense: data[0] });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Smart Budget Planner Backend running on port ${PORT}`);
});

