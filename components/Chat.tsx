import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from './AuthProvider';
import AuthModal from './AuthModal';
import TripsSidebar from './TripsSidebar';
import { supabase, Trip, Message, MapData } from '../lib/supabase';

const TrekMap = dynamic(() => import('./TrekMap'), { ssr: false });

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: '¡Hola! Bienvenid@ a VONTREK, tu aventura comienza aquí. 🌍✈️\n\nPara empezar a planificar tu viaje perfecto, cuéntame:\n\n📍 **¿A dónde quieres ir?**\n👥 **¿Con quién viajas?** (solo, en pareja, familia, amigos)\n🗓️ **¿Cuántos días tienes?**\n👤 **¿Cuántas personas sois en total?**\n\nPuedes responder todo de golpe o ir poco a poco, ¡como prefieras!',
};

function parseMapData(text: string): { cleanText: string; mapData: MapData | null } {
  const mapRegex = /<MAP_DATA>([\s\S]*?)<\/MAP_DATA>/;
  const match = text.match(mapRegex);
  if (match) {
    try {
      const mapData = JSON.parse(match[1].trim());
      const cleanText = text.replace(mapRegex, '').trim();
      return { cleanText, mapData };
    } catch {
      return { cleanText: text, mapData: null };
    }
  }
  return { cleanText: text, mapData: null };
}

function MessageBubble({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === 'user';
  const { cleanText } = parseMapData(message.content);

  const renderText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const isPlace = line.startsWith('📍');
      return (
        <span key={i}>
          {i > 0 && <br />}
          <span
            style={isPlace ? { display: 'inline-block', marginTop: '4px' } : {}}
            dangerouslySetInnerHTML={{ __html: boldLine }}
          />
        </span>
      );
    });
  };

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
      {!isUser && (
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #00b4d8, #0077b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', marginRight: '10px', flexShrink: 0 }}>
          🧭
        </div>
      )}
      <div style={{
        maxWidth: '80%', padding: '12px 16px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? 'linear-gradient(135deg, #00b4d8, #0077b6)' : 'rgba(17,34,64,0.9)',
        border: isUser ? 'none' : '1px solid rgba(0,180,216,0.2)',
        fontSize: '14px', lineHeight: '1.6', color: '#e8f4f8',
      }}>
        {renderText(cleanText)}
        {isStreaming && (
          <span style={{ display: 'inline-block', width: '8px', height: '14px', background: '#00b4d8', marginLeft: '4px', borderRadius: '2px', animation: 'pulse 0.8s ease infinite', verticalAlign: 'middle' }} />
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<any>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-save trip when messages change
  useEffect(() => {
    if (!user || messages.length <= 1) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveTrip(), 2000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [messages, mapData, user]);

  const saveTrip = async () => {
    if (!user) return;
    const destination = mapData?.destination || extractDestination(messages);
    const title = destination || 'Nuevo viaje';

    if (currentTripId) {
      await supabase.from('trips').update({
        messages,
        map_data: mapData,
        destination,
        title,
        updated_at: new Date().toISOString(),
      }).eq('id', currentTripId);
    } else {
      const { data } = await supabase.from('trips').insert({
        user_id: user.id,
        messages,
        map_data: mapData,
        destination,
        title,
      }).select().single();
      if (data) setCurrentTripId(data.id);
    }
  };

  const extractDestination = (msgs: Message[]): string => {
    const assistantMsgs = msgs.filter(m => m.role === 'assistant' && m.content.length > 50);
    if (assistantMsgs.length > 1) {
      const match = assistantMsgs[1]?.content.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/);
      return match?.[1] || '';
    }
    return '';
  };

  const loadTrip = (trip: Trip) => {
    setMessages(trip.messages);
    setMapData(trip.map_data);
    setCurrentTripId(trip.id);
    setShowSidebar(false);
  };

  const newTrip = () => {
    setMessages([INITIAL_MESSAGE]);
    setMapData(null);
    setCurrentTripId(null);
    setShowSidebar(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                fullContent += data.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: fullContent };
                  return updated;
                });
              } catch {}
            }
          }
        }
      }

      const { mapData: newMapData } = parseMapData(fullContent);
      if (newMapData) setMapData(newMapData);
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo 🙏' };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1628' }}>
        <div style={{ color: '#00b4d8', fontSize: '14px' }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a1628', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Trips sidebar (only when logged in) */}
      {user && showSidebar && (
        <TripsSidebar
          currentTripId={currentTripId}
          onSelectTrip={loadTrip}
          onNewTrip={newTrip}
        />
      )}

      {/* Chat panel */}
      <div style={{ width: '420px', minWidth: '380px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(0,180,216,0.15)', background: 'rgba(10,22,40,0.95)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,180,216,0.15)', background: 'rgba(17,34,64,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {user && (
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                style={{ background: 'none', border: 'none', color: '#8892b0', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
                title="Mis viajes"
              >
                ☰
              </button>
            )}
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'linear-gradient(135deg, #00b4d8, #0077b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              🧭
            </div>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, color: '#e8f4f8' }}>VONTREK</h1>
              <p style={{ fontSize: '10px', color: '#00b4d8', letterSpacing: '2px', textTransform: 'uppercase' }}>Tu aventura comienza aquí</p>
            </div>
          </div>

          {/* Auth button */}
          <div>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8892b0' }}>{user.full_name || user.email?.split('@')[0]}</span>
                <button
                  onClick={signOut}
                  style={{ background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: '8px', color: '#8892b0', fontSize: '12px', padding: '4px 10px', cursor: 'pointer' }}
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                style={{ background: 'linear-gradient(135deg, #00b4d8, #0077b6)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}
              >
                Entrar
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} isStreaming={isLoading && i === messages.length - 1 && msg.role === 'assistant'} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Save indicator */}
        {user && currentTripId && (
          <div style={{ padding: '4px 16px', background: 'rgba(0,180,216,0.05)', borderTop: '1px solid rgba(0,180,216,0.1)' }}>
            <p style={{ fontSize: '11px', color: '#4a5568', textAlign: 'center' }}>✓ Viaje guardado automáticamente</p>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(0,180,216,0.15)', background: 'rgba(17,34,64,0.4)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', background: 'rgba(17,34,64,0.8)', border: '1px solid rgba(0,180,216,0.3)', borderRadius: '14px', padding: '10px 14px' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe aquí tu destino soñado..."
              rows={1}
              disabled={isLoading}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e8f4f8', fontSize: '14px', resize: 'none', fontFamily: "'DM Sans', sans-serif", lineHeight: '1.5', maxHeight: '120px' }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              style={{ width: 36, height: 36, borderRadius: '10px', background: isLoading || !input.trim() ? 'rgba(0,180,216,0.2)' : 'linear-gradient(135deg, #00b4d8, #0077b6)', border: 'none', cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#4a5568', textAlign: 'center', marginTop: '8px' }}>Enter para enviar · Shift+Enter para nueva línea</p>
        </div>
      </div>

      {/* Map panel */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {mapData && (
          <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 1000, background: 'rgba(10,22,40,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,180,216,0.3)', borderRadius: '12px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🌍</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#e8f4f8' }}>{mapData.destination}</p>
              <p style={{ fontSize: '11px', color: '#00b4d8' }}>{mapData.places.length} lugares seleccionados</p>
            </div>
          </div>
        )}
        <TrekMap mapData={mapData} />
      </div>

      {/* Auth modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
