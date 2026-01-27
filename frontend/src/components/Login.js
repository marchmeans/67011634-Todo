import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

const API_URL = 'http://localhost:5001/api';

function Login({ onLogin, logo }) {
    const [isRegister, setIsRegister] = useState(false);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [captcha, setCaptcha] = useState({ q: '', a: 0 });
    const [userCaptcha, setUserCaptcha] = useState('');
    const [error, setError] = useState('');

    const generateCaptcha = () => {
        const num1 = Math.floor(Math.random() * 10);
        const num2 = Math.floor(Math.random() * 10);
        setCaptcha({ q: `${num1} + ${num2}`, a: num1 + num2 });
    };

    useEffect(() => {
        generateCaptcha();
    }, [isRegister]);

    // --- Google Login Handler [Fixed for A5 Sync] ---
    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            setError(''); 
            // Decode token to get user details
            const decoded = jwtDecode(credentialResponse.credential);
            
            // Map Google data to match your database columns
            const googleUser = {
                username: decoded.email.split('@')[0], 
                full_name: decoded.name,
                google_id: decoded.sub
            };

            // Synchronize with your backend /api/google-login
            const response = await fetch(`${API_URL}/google-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(googleUser),
            });

            // If the server returns an error page (HTML) instead of JSON, 
            // this is where the "Unexpected token <" error comes from.
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('todo_username', data.user.username);
                onLogin(data.user.username);
            } else {
                setError(data.message || 'Google synchronization failed.');
            }
        } catch (err) {
            console.error('Connection error:', err);
            setError('Google synchronization failed. Ensure server.js is running on port 5001.');
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        if (parseInt(userCaptcha) !== captcha.a) {
            setError('Incorrect CAPTCHA answer.');
            generateCaptcha();
            return;
        }

        try {
            let response;
            if (isRegister) {
                const formData = new FormData();
                formData.append('full_name', fullName);
                formData.append('username', username);
                formData.append('password', password);
                if (profileImage) formData.append('profile_image', profileImage);
                response = await fetch(`${API_URL}/register`, { method: 'POST', body: formData });
            } else {
                response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        username, 
                        password, 
                        captcha_answer: captcha.a, 
                        user_captcha_input: userCaptcha 
                    }),
                });
            }

            const data = await response.json();
            if (response.ok) {
                if (isRegister) {
                    setIsRegister(false);
                    alert('Registration successful!');
                } else {
                    localStorage.setItem('todo_username', data.user.username);
                    onLogin(data.user.username);
                }
            } else {
                setError(data.message || 'Auth failed.');
                generateCaptcha();
            }
        } catch (err) { setError('Connection error. Check your backend terminal.'); }
    };

    return (
        <div className="bg-white w-full max-w-md mx-auto rounded-xl shadow-lg p-8">
            <div className="flex flex-col items-center mb-6">
                <img src={logo} alt="CEI" className="h-16 w-16 mb-2" />
                <h1 className="text-2xl font-black text-gray-800 tracking-tight">CEI TODO</h1>
                <p className="text-gray-500 text-xs">{isRegister ? 'Create account' : 'Welcome back'}</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                {isRegister && (
                    <>
                        <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                        <input type="file" accept="image/*" onChange={(e) => setProfileImage(e.target.files[0])}
                            className="w-full text-xs text-gray-400" />
                    </>
                )}
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />

                <div className="bg-gray-50 p-3 rounded-lg border flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-600">Solve: {captcha.q} = ?</span>
                    <input type="number" value={userCaptcha} onChange={(e) => setUserCaptcha(e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-center" placeholder="Ans" required />
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                    {isRegister ? 'Sign Up' : 'Login'}
                </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-3">
                <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-blue-600 hover:underline">
                    {isRegister ? 'Switch to Login' : 'Need an account? Register'}
                </button>
                
                <div className="w-full border-t border-gray-100 pt-4 flex justify-center">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Google Login Failed')}
                        useOneTap
                        theme="outline"
                        size="large"
                        text="signin_with"
                        shape="pill"
                    />
                </div>
            </div>

            {error && <p className="text-red-500 text-xs mt-4 text-center bg-red-50 py-2 rounded font-medium">{error}</p>}
        </div>
    );
}

export default Login;