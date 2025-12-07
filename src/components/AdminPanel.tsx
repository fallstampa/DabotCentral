import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Copy, Trash2, Key } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3001';

interface APIKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

interface AdminPanelProps {
  token: string;
  user: { id: string; email: string };
}

export function AdminPanel({ token, user }: AdminPanelProps) {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/api-keys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setKeys(data.keys);
      } else {
        setError(data.error || 'Failed to fetch API keys');
      }
    } catch (err) {
      setError('Failed to fetch API keys');
      console.error(err);
    }
  };

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setNewKey('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newKeyName }),
      });

      const data = await response.json();
      if (response.ok) {
        setNewKey(data.key);
        setNewKeyName('');
        fetchKeys();
      } else {
        setError(data.error || 'Failed to create API key');
      }
    } catch (err) {
      setError('Failed to create API key');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchKeys();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to revoke API key');
      }
    } catch (err) {
      setError('Failed to revoke API key');
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Management
          </CardTitle>
          <CardDescription>
            Generate API keys for Claude to access your daily todo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {newKey && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="space-y-2">
                <p className="font-semibold text-green-800">
                  API Key Created Successfully!
                </p>
                <div className="flex items-center gap-2 bg-white p-3 rounded border">
                  <code className="flex-1 text-sm break-all">{newKey}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(newKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-green-700">
                  ⚠️ Save this key securely - it won't be shown again!
                </p>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={createKey} className="flex gap-2">
            <Input
              placeholder="Key name (e.g., 'Claude Mobile')"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              disabled={loading}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Generate Key'}
            </Button>
          </form>

          <div className="space-y-2">
            <h3 className="font-semibold">Your API Keys</h3>
            {keys.length === 0 ? (
              <p className="text-sm text-gray-500">No API keys yet. Create one above!</p>
            ) : (
              <div className="space-y-2">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 border rounded bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">{key.name}</p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at && (
                          <> • Last used: {new Date(key.last_used_at).toLocaleDateString()}</>
                        )}
                      </p>
                      <p className="text-sm">
                        Status: {key.is_active ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-red-600">Revoked</span>
                        )}
                      </p>
                    </div>
                    {key.is_active && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => revokeKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {copied && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg">
          Copied to clipboard!
        </div>
      )}
    </div>
  );
}
