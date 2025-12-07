import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';
import fs from 'fs';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Initialize
const app = express();
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Types
interface SendOTPRequest {
  email: string;
}

interface VerifyOTPRequest {
  email: string;
  code: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
  };
}

// Helper: Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Generate session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Helper: Generate API key
function generateAPIKey(): string {
  return 'sk_dabotcentral_' + crypto.randomBytes(32).toString('hex');
}

// Helper: Validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Middleware: Authenticate with API key or session token
async function authenticate(req: any, res: any, next: any) {
  try {
    // Check for API key first (in header or query param)
    const apiKey = req.headers.authorization?.replace('Bearer ', '') || req.query.api_key;
    
    if (apiKey && apiKey.startsWith('sk_dabotcentral_')) {
      // Verify API key
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('user_id, is_active')
        .eq('key', apiKey)
        .single();

      if (keyError || !keyData || !keyData.is_active) {
        return res.status(401).json({ error: 'Invalid or inactive API key' });
      }

      // Update last used timestamp
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('key', apiKey);

      // Get user data
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', keyData.user_id)
        .single();

      req.user = userData;
      return next();
    }

    // Fall back to session token authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Find session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (sessionError || !sessionData) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Check if session has expired
    if (new Date(sessionData.expires_at) < new Date()) {
      await supabase.from('sessions').delete().eq('token', token);
      return res.status(401).json({ error: 'Session expired' });
    }

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', sessionData.user_id)
      .single();

    req.user = userData;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Endpoint: Send OTP
app.post('/api/auth/send-otp', async (req: Request, res: Response<AuthResponse>) => {
  try {
    const { email } = req.body as SendOTPRequest;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Generate OTP code
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store OTP in database
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

    // Send email via Resend
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
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while sending OTP',
    });
  }
});

// Endpoint: Verify OTP
app.post('/api/auth/verify-otp', async (req: Request, res: Response<AuthResponse>) => {
  try {
    const { email, code } = req.body as VerifyOTPRequest;

    // Validate inputs
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and code are required',
      });
    }

    // Find OTP code
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

    // Mark OTP as used
    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('id', otpData.id);

    // Find or create user
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create one
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
      // Update last_login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id);
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create session
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
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during verification',
    });
  }
});

// Endpoint: Get current user
app.get('/api/auth/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    // Find session
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
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred',
    });
  }
});

// Endpoint: Logout
app.post('/api/auth/logout', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No token provided',
      });
    }

    // Delete session
    await supabase
      .from('sessions')
      .delete()
      .eq('token', token);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during logout',
    });
  }
});
// ==============================================================================
// ADD THESE ENDPOINTS TO YOUR DABOTCENTRAL server.ts
// Add them right BEFORE the "// Health check" line
// ==============================================================================

// ============================================================================
// API KEY MANAGEMENT ENDPOINTS
// ============================================================================

// POST /api/admin/api-keys - Generate new API key (Admin only)
app.post('/api/admin/api-keys', authenticate, async (req: any, res: Response) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Key name is required' });
    }

    // Generate new API key
    const apiKey = generateAPIKey();

    // Store in database
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: req.user.id,
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
  } catch (error) {
    console.error('Error in create API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// GET /api/admin/api-keys - List all API keys (without showing full key)
app.get('/api/admin/api-keys', authenticate, async (req: any, res: Response) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, created_at, last_used_at, is_active')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      return res.status(500).json({ error: 'Failed to fetch API keys' });
    }

    res.json({
      success: true,
      keys: keys,
    });
  } catch (error) {
    console.error('Error in list API keys:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// DELETE /api/admin/api-keys/:id - Revoke API key
app.delete('/api/admin/api-keys/:id', authenticate, async (req: any, res: Response) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Error revoking API key:', error);
      return res.status(500).json({ error: 'Failed to revoke API key' });
    }

    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('Error in revoke API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// ============================================================================
// DAILY TODO ENDPOINT
// ============================================================================

const TODO_FILE_PATH = 'D:\\JK\\Projects\\research\\daily_todo.md';

// GET /api/daily-todo - Get daily todo content
app.get('/api/daily-todo', authenticate, async (req: any, res: Response) => {
  try {
    // Check if file exists
    if (!fs.existsSync(TODO_FILE_PATH)) {
      return res.status(404).json({ 
        success: false,
        error: 'Daily todo file not found. Please upload one first.' 
      });
    }

    // Read the file
    const todoContent = fs.readFileSync(TODO_FILE_PATH, 'utf-8');

    res.json({
      success: true,
      content: todoContent,
      user: req.user.email,
      last_modified: fs.statSync(TODO_FILE_PATH).mtime,
    });
  } catch (error) {
    console.error('Error reading daily-todo:', error);
    res.status(500).json({ error: 'Failed to fetch daily todo' });
  }
});

// POST /api/daily-todo - Update daily todo content (Admin only)
app.post('/api/daily-todo', authenticate, async (req: any, res: Response) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Write to file
    fs.writeFileSync(TODO_FILE_PATH, content, 'utf-8');

    res.json({
      success: true,
      message: 'Daily todo updated successfully',
      last_modified: fs.statSync(TODO_FILE_PATH).mtime,
    });
  } catch (error) {
    console.error('Error updating daily-todo:', error);
    res.status(500).json({ error: 'Failed to update daily todo' });
  }
});
// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`DabotCentral backend running on port ${PORT}`);
});

export default app;
