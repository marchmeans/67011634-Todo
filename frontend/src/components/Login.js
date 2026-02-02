import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import ReCAPTCHA from "react-google-recaptcha";

const API_URL = 'http://localhost:5001/api';

function Login({ onLogin, logo }) {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');

    if (!captchaToken) {
      setError('Please complete captcha');
      return;
    }

    console.log('🔐 Captcha token:', captchaToken.substring(0, 50) + '...');

    const body = isRegister
      ? { username, password, full_name: fullName, captchaToken }
      : { username, password, captchaToken };

    const endpoint = isRegister ? '/register' : '/login';

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message);
      return;
    }

    if (!isRegister) {
      localStorage.setItem('token', data.token);
      onLogin(data.user.username);
    } else {
      alert('Registration successful!');
      setIsRegister(false);
    }
  };

  const handleGoogleSuccess = async (cred) => {
    try {
      const decoded = jwtDecode(cred.credential);

      const res = await fetch(`${API_URL}/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: decoded.email.split('@')[0],
          full_name: decoded.name,
          profile_image: decoded.picture
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.message || 'Google login failed');
        return;
      }

      localStorage.setItem('token', data.token);
      onLogin(data.user.username);
    } catch (err) {
      setError('Google login error');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <img src={logo} alt="logo" className="mx-auto h-12" />

      <form onSubmit={handleAuth} className="space-y-4 mt-4">
        {isRegister && (
          <input
            placeholder="Full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full border p-2"
          />
        )}

        <input
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full border p-2"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border p-2"
        />

        <ReCAPTCHA
          sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
          onChange={(token) => setCaptchaToken(token)}
        />

        <button className="w-full bg-blue-600 text-white p-2 rounded">
          {isRegister ? 'Register' : 'Login'}
        </button>
      </form>

      <button
        className="text-blue-600 text-sm mt-4"
        onClick={() => setIsRegister(!isRegister)}
      >
        {isRegister ? 'Switch to Login' : 'Create account'}
      </button>

      <div className="mt-4">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google login failed')}
        />
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}

export default Login;
