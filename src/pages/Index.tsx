import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import { LoginModal } from '@/components/LoginModal';
import { LoggedInAnimation } from '@/components/LoggedInAnimation';

const Index = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const email = localStorage.getItem('user_email');
    if (token && email) {
      setIsLoggedIn(true);
      setUserEmail(email);
    }
  }, []);

  const handleLoginSuccess = (token: string, email: string) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_email', email);
    setUserEmail(email);
    setShowAnimation(true);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    setIsLoggedIn(false);
    setUserEmail('');
  };

  return (
    <>
      {showAnimation && (
        <LoggedInAnimation
          email={userEmail}
          onAnimationComplete={() => setShowAnimation(false)}
        />
      )}

      <main className="min-h-screen bg-background">
        {/* Header with login button */}
        <div className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
            <h1 className="text-xl font-bold">DabotCentral</h1>
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">{userEmail}</span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setLoginOpen(true)}>
                Login
              </Button>
            )}
          </div>
        </div>

        {/* Main content */}
        {isLoggedIn ? (
          <div className="container py-12">
            <h2 className="text-3xl font-bold mb-4">Welcome, {userEmail}!</h2>
            <p className="text-lg text-muted-foreground mb-8">
              You are now logged in to DabotCentral. This is where your content will be!
            </p>
          </div>
        ) : (
          <>
            <HeroSection onLoginClick={() => setLoginOpen(true)} />
            <FeaturesSection />
          </>
        )}
      </main>

      {/* Login Modal */}
      <LoginModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
};

export default Index;
