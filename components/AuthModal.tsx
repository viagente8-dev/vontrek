import { useState } from 'react';
import { useAuth } from './AuthProvider';

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const { signIn, signUp } = useAuth();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError('Email o contraseña incorrectos');
      else onClose();
    } else {
      if (!fullName.trim()) { setError('Introduce tu nombre'); setLoading(false); return; }
      const { error } = await signUp(email, password, fullName);
      if (error) setError(error.message);
      else setSuccess('¡Cuenta creada! Revisa tu email para confirmar.');
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(10,22,40,0.8)',
    border: '1px solid rgba(0,180,216,0.3)',
    borderRadius: '10px',
    color: '#e8f4f8',
    fontSize: '14px',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#112240',
        border: '1px solid rgba(0,180,216,0.3)',
        borderRadius: '20px',
        padding: '36px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧭</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', color: '#e8f4f8', marginBottom: '4px' }}>
            {mode === 'login' ? 'Bienvenido de nuevo' : 'Crear cuenta'}
          </h2>
          <p style={{ fontSize: '13px', color: '#8892b0' }}>
            {mode === 'login' ? 'Accede a tus viajes guardados' : 'Empieza a planificar tus aventuras'}
          </p>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Tu nombre"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={inputStyle}
          />
        </div>

        {/* Error / Success */}
        {error && (
          <p style={{ color: '#ff6b6b', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>{error}</p>
        )}
        {success && (
          <p style={{ color: '#52b788', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>{success}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '14px',
            background: loading ? 'rgba(0,180,216,0.3)' : 'linear-gradient(135deg, #00b4d8, #0077b6)',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {loading ? '...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>

        {/* Toggle */}
        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#8892b0' }}>
          {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <span
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
            style={{ color: '#00b4d8', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </span>
        </p>
      </div>
    </div>
  );
}
