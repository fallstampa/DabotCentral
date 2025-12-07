import { useState } from 'react';
import { AdminPanel } from '@/components/AdminPanel';
import { LoginModal } from '@/components/LoginModal';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function Admin() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { isAuthenticated, user, token, login } = useAuth();

  const handleLoginSuccess = (token: string, email: string) => {
    // Create a user object from the email
    const userData = { 
      id: email, // We can use email as ID for now, or fetch from backend
      email 
    };
    login(userData, token);
    setIsLoginOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">DabotCentral Admin</h1>
          <div className="flex items-center gap-4">
            {isAuthenticated && user && (
              <span className="text-sm text-gray-600">{user.email}</span>
            )}
            <a href="/" className="text-sm text-blue-600 hover:underline">
              ← Back to Home
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Panel</h1>
        
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto text-center py-12">
            <p className="text-gray-600 mb-4">Please login to access the admin panel</p>
            <Button onClick={() => setIsLoginOpen(true)}>
              Login
            </Button>
          </div>
        ) : user && token ? (
          <AdminPanel token={token} user={user} />
        ) : null}
      </main>

      <LoginModal
        open={isLoginOpen}
        onOpenChange={setIsLoginOpen}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
