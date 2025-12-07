import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface LoggedInAnimationProps {
  email: string;
  onAnimationComplete?: () => void;
}

export const LoggedInAnimation = ({ email, onAnimationComplete }: LoggedInAnimationProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Animation plays for 3 seconds then fades out
    const timer = setTimeout(() => {
      setShow(false);
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
        <div className="relative">
          {/* Outer circle animation */}
          <div className="absolute inset-0 animate-pulse">
            <CheckCircle2 className="w-24 h-24 text-green-500" />
          </div>

          {/* Inner checkmark */}
          <CheckCircle2 className="w-24 h-24 text-green-500 animate-bounce" />
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2 animate-in slide-in-from-bottom duration-700">
            Welcome Back!
          </h2>
          <p className="text-lg text-gray-200 animate-in slide-in-from-bottom duration-700 delay-100">
            Logged in as {email}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoggedInAnimation;
