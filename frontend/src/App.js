import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google'; // ADD THIS
import Login from './components/Login';
import TodoList from './components/TodoList';
import logo from './cei-logo.png';

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('todo_username');
    if (storedUser) {
      setCurrentUser(storedUser);
    }
  }, []);

  const handleLogin = (username) => {
    setCurrentUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('todo_username');
    setCurrentUser(null);
  };

  return (
    // PASTE YOUR CLIENT ID BELOW
    <GoogleOAuthProvider clientId="576317451415-4olghptl840fvkaqjn485k2hson2n936.apps.googleusercontent.com">
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          {currentUser ? (
            <TodoList
              username={currentUser}
              onLogout={handleLogout}
              logo={logo}
            />
          ) : (
            <Login onLogin={handleLogin} logo={logo} />
          )}
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;