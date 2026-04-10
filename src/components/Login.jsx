import React, { useState, useEffect } from 'react';
import { login } from '../utils/xtreamApi';
import { Eye, EyeOff } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Pre-fill credentials if they exist in localStorage (either auto-login or remembered)
    const stored = localStorage.getItem('tv_altoke_creds') || localStorage.getItem('tv_altoke_remembered');
    if (stored) {
      try {
        const decoded = JSON.parse(atob(stored));
        if (decoded.url) setUrl(decoded.url);
        if (decoded.username) setUsername(decoded.username);
        if (decoded.password) setPassword(decoded.password);
        if (decoded.rememberMe !== undefined) setRememberMe(decoded.rememberMe);
      } catch (e) {
        console.error('Failed to load stored credentials');
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setError('');
    setLoading(true);

    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://');
      }
      
      const data = await login(url, username, password);
      
      // If successful, pass credentials up to App
      onLogin({ url, username, password, userInfo: data.user_info, rememberMe });
      
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">TV<span>-Altoke</span></h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>URL del Servidor</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="http://domain.com:port"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Usuario</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Tu usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Contraseña</label>
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                className="form-control" 
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '45px' }}
                disabled={loading}
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="checkbox" 
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ accentColor: 'var(--color-accent)', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="rememberMe" style={{ margin: 0, cursor: 'pointer' }}>Recordar mi cuenta</label>
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Conectando...' : 'Entrar'}
          </button>
          
          {error && <div className="error-message">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default Login;
