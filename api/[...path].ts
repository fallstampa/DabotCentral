import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper functions
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateAPIKey(): string {
  return 'sk_dabotcentral_' + crypto.randomBytes(32).toString('hex');
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const path = req.url?.replace('/api/', '') || '';

  try {
    // Route to appropriate handler
    if (path === 'health') {
      return res.status(200).json({ status: 'ok' });
    }

    if (path === 'auth/send-otp' && req.method === 'POST') {
      return handleSendOTP(req, res);
    }

    if (path === 'auth/verify-otp' && req.method === 'POST') {
      return handleVerifyOTP(req, res);
    }

    if (path === 'auth/me' && req.method === 'GET') {
      return handleGetUser(req, res);
    }

    if (path === 'auth/logout' && req.method === 'POST') {
      return handleLogout(req, res);
    }

    if (path === 'admin/api-keys' && req.method === 'POST') {
      return handleCreateAPIKey(req, res);
    }

    if (path === 'admin/api-keys' && req.method === 'GET') {
      return handleListAPIKeys(req, res);
    }

    if (path.startsWith('admin/api-keys/') && req.method === 'DELETE') {
      return handleRevokeAPIKey(req, res);
    }

    if (path === 'daily-todo' && req.method === 'GET') {
      return handleGetDailyTodo(req, res);
    }

    if (path === 'daily-todo' && req.method === 'POST') {
      return handleUpdateDailyTodo(req, res);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Authentication middleware
async function authenticate(req: VercelRequest): Promise<any> {
  const apiKey = req.headers.authorization?.toString().replace('Bearer ', '');
  
  if (apiKey && apiKey.startsWith('sk_dabotcentral_')) {
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id, is_active')
      .eq('key', apiKey)
      .single();

    if (keyError || !keyData || !keyData.is_active) {
      throw new Error('Invalid or inactive API key');
    }

    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key', apiKey);

    const { data: userData } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', keyData.user_id)
      .single();

    return userData;
  }

  const token = req.headers.authorization?.toString().replace('Bearer ', '');
  if (!token) {
    throw new Error('Authentication required');
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from('sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .single();

  if (sessionError || !sessionData) {
    throw new Error('Invalid session');
  }

  if (new Date(sessionData.expires_at) < new Date()) {
    await supabase.from('sessions').delete().eq('token', token);
    throw new Error('Session expired');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', sessionData.user_id)
    .single();

  return userData;
}

// Handler functions
async function handleSendOTP(req: VercelRequest, res: VercelResponse) {
  const { email } = req.body as any;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address',
    });
  }

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const { error: dbError } = await supabase
    .from('otp_codes')
    .insert({
      email,
      code,
      expires_at: expiresAt.toISOString(),
    });

  if (dbError) {
    console.error('Database error:', dbError);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate OTP code',
    });
  }

  try {
    await resend.emails.send({
      from: 'DabotCentral <onboarding@resend.dev>',
      to: email,
      subject: 'Your DabotCentral Login Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to DabotCentral</h2>
          <p>Your login code is:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="letter-spacing: 5px; margin: 0; font-size: 32px; color: #333;">${code}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error('Email sending error:', emailError);
    return res.status(500).json({
      success: false,
      message: 'Failed to send email',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'OTP code sent to your email',
  });
}

async function handleVerifyOTP(req: VercelRequest, res: VercelResponse) {
  const { email, code } = req.body as any;

  if (!email || !code) {
    return res.status(400).json({
      success: false,
      message: 'Email and code are required',
    });
  }

  const { data: otpData, error: otpError } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', email)
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (otpError || !otpData) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired code',
    });
  }

  await supabase
    .from('otp_codes')
    .update({ used: true })
    .eq('id', otpData.id);

  let { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (userError && userError.code === 'PGRST116') {
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        last_login: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create user',
      });
    }

    userData = newUser;
  } else if (userError) {
    return res.status(500).json({
      success: false,
      message: 'Database error',
    });
  } else {
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userData.id);
  }

  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const { error: sessionError } = await supabase
    .from('sessions')
    .insert({
      user_id: userData.id,
      token: sessionToken,
      expires_at: expiresAt.toISOString(),
    });

  if (sessionError) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create session',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Authentication successful',
    token: sessionToken,
    user: {
      id: userData.id,
      email: userData.email,
    },
  });
}

async function handleGetUser(req: VercelRequest, res: VercelResponse) {
  const token = req.headers.authorization?.toString().replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
    });
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from('sessions')
    .select('*, users(*)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (sessionError || !sessionData) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  return res.status(200).json({
    success: true,
    user: sessionData.users,
  });
}

async function handleLogout(req: VercelRequest, res: VercelResponse) {
  const token = req.headers.authorization?.toString().replace('Bearer ', '');

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'No token provided',
    });
  }

  await supabase
    .from('sessions')
    .delete()
    .eq('token', token);

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}

async function handleCreateAPIKey(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await authenticate(req);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name } = req.body as any;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Key name is required' });
    }

    const apiKey = generateAPIKey();

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key: apiKey,
        name: name,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating API key:', error);
      return res.status(500).json({ error: 'Failed to create API key' });
    }

    res.json({
      success: true,
      key: apiKey,
      id: data.id,
      name: data.name,
      created_at: data.created_at,
    });
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
}

async function handleListAPIKeys(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await authenticate(req);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, created_at, last_used_at, is_active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      return res.status(500).json({ error: 'Failed to fetch API keys' });
    }

    res.json({
      success: true,
      keys: keys,
    });
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
}

async function handleRevokeAPIKey(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await authenticate(req);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const id = req.url?.split('/').pop();

    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error revoking API key:', error);
      return res.status(500).json({ error: 'Failed to revoke API key' });
    }

    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
}

// NEW: Daily Todo Handlers using Supabase
async function handleGetDailyTodo(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await authenticate(req);

    // Get the user's most recent daily todo
    const { data: todo, error } = await supabase
      .from('daily_todos')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching daily todo:', error);
      return res.status(500).json({ error: 'Failed to fetch daily todo' });
    }

    if (!todo) {
      return res.status(404).json({
        success: false,
        error: 'No daily todo found. Please create one first.',
      });
    }

    res.json({
      success: true,
      content: todo.content,
      user: user.email,
      last_modified: todo.updated_at,
    });
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
}

async function handleUpdateDailyTodo(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await authenticate(req);

    const { content } = req.body as any;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check if user already has a todo
    const { data: existingTodo } = await supabase
      .from('daily_todos')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let result;
    if (existingTodo) {
      // Update existing todo
      result = await supabase
        .from('daily_todos')
        .update({ content })
        .eq('id', existingTodo.id)
        .select()
        .single();
    } else {
      // Create new todo
      result = await supabase
        .from('daily_todos')
        .insert({ user_id: user.id, content })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating daily todo:', result.error);
      return res.status(500).json({ error: 'Failed to update daily todo' });
    }

    res.json({
      success: true,
      message: 'Daily todo updated successfully',
      last_modified: result.data.updated_at,
    });
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
}
