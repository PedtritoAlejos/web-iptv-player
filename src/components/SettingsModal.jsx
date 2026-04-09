import React from 'react';
import { X } from 'lucide-react';
import '../styles/Modals.css';

const SettingsModal = ({ credentials, onClose, onChangeAccent }) => {
  const { userInfo } = credentials;
  
  // Format dates appropriately if available
  const expDate = userInfo?.exp_date ? new Date(userInfo.exp_date * 1000).toLocaleDateString() : 'N/A';

  return (
    <div className="modal-overlay">
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}><X size={28} /></button>
        <h2 style={{fontSize: '1.8rem', fontWeight: 800}}>Ajustes de Cuenta</h2>
        
        <div className="settings-info">
          <div className="info-item">
            <span className="info-label">Usuario</span>
            <span className="info-value">{userInfo?.username || credentials.username}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Servidor</span>
            <span className="info-value">{credentials.url}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Estado</span>
            <span className="info-value" style={{color: userInfo?.status === 'Active' ? '#00E676' : 'var(--color-text-main)'}}>
              {userInfo?.status || 'Active'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Conexiones Activas / Max</span>
            <span className="info-value">{userInfo?.active_cons || 0} / {userInfo?.max_connections || 1}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Vencimiento</span>
            <span className="info-value">{expDate}</span>
          </div>
        </div>

        <h3 style={{marginTop: '30px', fontSize:'1.1rem', color:'var(--color-text-muted)'}}>Color de Acento</h3>
        <div className="color-picker">
          <button className="color-btn" style={{backgroundColor: '#FFEA00'}} onClick={() => onChangeAccent('#FFEA00')} title="Amarillo Eléctrico"></button>
          <button className="color-btn" style={{backgroundColor: '#FF6200'}} onClick={() => onChangeAccent('#FF6200')} title="Naranja Vibrante"></button>
          <button className="color-btn" style={{backgroundColor: '#00E5FF'}} onClick={() => onChangeAccent('#00E5FF')} title="Cian Neón"></button>
          <button className="color-btn" style={{backgroundColor: '#FF0055'}} onClick={() => onChangeAccent('#FF0055')} title="Rosa Magenta"></button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
