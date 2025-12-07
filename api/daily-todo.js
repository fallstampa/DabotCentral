import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function authenticate(req) {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  
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

  const token = req.headers.authorization?.replace('Bearer ', '');
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = await authenticate(req);

    if (req.method === 'GET') {
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

      return res.json({
        success: true,
        content: todo.content,
        user: user.email,
        last_modified: todo.updated_at,
      });
    }

    if (req.method === 'POST') {
      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Content is required' });
      }

      const { data: existingTodo } = await supabase
        .from('daily_todos')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let result;
      if (existingTodo) {
        result = await supabase
          .from('daily_todos')
          .update({ content })
          .eq('id', existingTodo.id)
          .select()
          .single();
      } else {
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

      return res.json({
        success: true,
        message: 'Daily todo updated successfully',
        last_modified: result.data.updated_at,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}
