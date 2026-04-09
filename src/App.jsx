import React, { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import Toast from './components/Toast.jsx';

function App() {
  const [credentials, setCredentials] = useState(null);

  useEffect(() => {
    // Check local storage or session storage for credentials
    const stored = localStorage.getItem('tv_altoke_creds') || sessionStorage.getItem('tv_altoke_creds');
    if (stored) {
      try {
        const decoded = JSON.parse(atob(stored));
        if (decoded.url && decoded.username && decoded.password) {
          setCredentials(decoded);
        }
      } catch (e) {
        console.error('Invalid stored credentials');
      }
    }
  }, []);

  const handleLogin = (creds) => {
    // Basic base64 obfuscation
    const encoded = btoa(JSON.stringify(creds));
    if (creds.rememberMe) {
       localStorage.setItem('tv_altoke_creds', encoded);
    } else {
       sessionStorage.setItem('tv_altoke_creds', encoded);
    }
    setCredentials(creds);
  };

  const handleLogout = () => {
    localStorage.removeItem('tv_altoke_creds');
    sessionStorage.removeItem('tv_altoke_creds');
    setCredentials(null);
  };

  return (
    <div className="app-container">
      {credentials ? (
        <Dashboard credentials={credentials} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
      <Toast />
    </div>
  );
}

export default App;
