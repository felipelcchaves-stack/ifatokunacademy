import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MFAVerification from '@/components/auth/MFAVerification';
import { supabase } from '@/integrations/supabase/client';

const MFAVerify: React.FC = () => {
  const navigate = useNavigate();

  const handleVerified = () => {
    navigate('/dashboard', { replace: true });
  };

  const handleCancel = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Verification Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-gold">
              <span className="font-serif text-lg font-bold text-secondary">O</span>
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold text-foreground">Offe Orunmila</h1>
              <p className="text-xs text-muted-foreground -mt-1">Learning</p>
            </div>
          </Link>

          <MFAVerification 
            onVerified={handleVerified}
            onCancel={handleCancel}
          />
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex flex-1 gradient-hero pattern-adinkra items-center justify-center p-12">
        <div className="max-w-lg text-center text-white">
          <h2 className="font-serif text-4xl font-bold mb-6">
            "A segurança é a fortaleza do sábio."
          </h2>
          <p className="text-white/70 text-lg">
            — Provérbio Yorubá
          </p>
        </div>
      </div>
    </div>
  );
};

export default MFAVerify;
