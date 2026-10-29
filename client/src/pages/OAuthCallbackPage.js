import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './AuthPage.css';

export default function OAuthCallbackPage() {
  const { completeOAuthLogin } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = new URLSearchParams(location.hash.slice(1)).get('token');
    if (token && completeOAuthLogin(token)) {
      navigate('/dashboard', { replace: true });
      return;
    }
    const message = new URLSearchParams(location.search).get('oauth_error');
    setError(message || 'Social sign-in could not be completed.');
  }, [completeOAuthLogin, location.hash, location.search, navigate]);

  if (!error) {
    return <main className="auth-root"><div className="auth-wrap auth-callback-state">Completing secure sign-in…</div></main>;
  }

  return (
    <main className="auth-root">
      <div className="auth-wrap auth-callback-state">
        <p className="auth-error-label">SIGN-IN UNAVAILABLE</p>
        <p className="auth-subtitle">{error}</p>
        <Link className="auth-btn-outline auth-callback-link" to="/login">Return to sign in</Link>
      </div>
    </main>
  );
}
