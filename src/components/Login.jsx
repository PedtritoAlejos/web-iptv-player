import React, { useState } from 'react';
import { login } from '../utils/xtreamApi';

const Login = ({ onLogin }) => {
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
            />
          </div>
          
          <div className="form-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
