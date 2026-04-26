// components/Chat.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const TrekMap = dynamic(() => import('./TrekMap'), { ssr: false });

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MapData {
  destination: string;
  center: [number, number];
  zoom: number;
  places: Array<{
    id: string;
    name: string;
    description: string;
    coordinates: [number, number];
    type: string;
    day?: number;
  }>;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: '¡Hola! Bienvenid@ a VONTREK, tu aventura comienza aquí. 🌍✈️\n\n¿Ya tienes decidido un destino soñado al que quieras viajar?',
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

  // Simple markdown-like rendering
  const renderText = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Bold **text**
      const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Emoji lines starting with 📍
      const isPlace = line.startsWith('📍');
      
      return (
        <span key={i}>
          {i > 0 && <br />}
          {isPlace ? (
            <span
              style={{ display: 'inline-block', marginTop: '4px' }}
              dangerouslySetInnerHTML={{ __html: boldLine }}
            />
          ) : (
            <span dangerouslySetInnerHTML={{ __html: boldLine }} />
          )}
        </span>
      );
    });
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '12px',
      animation: 'fadeInUp 0.3s ease',
    }}>
      {!isUser && (
        <div style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00b4d8, #0077b6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          marginRight: '10px',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,180,216,0.3)',
        }}>
          🧭
        </div>
      )}
      <div style={{
        maxWidth: '80%',
        padding: '12px 16px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser
          ? 'linear-gradient(135deg, #00b4d8, #0077b6)'
          : 'rgba(17,34,64,0.9)',
        border: isUser ? 'none' : '1px solid rgba(0,180,216,0.2)',
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#e8f4f8',
        position: 'relative',
        backdropFilter: 'blur(10px)',
      }}>
        {renderText(cleanText)}
        {isStreaming && (
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '14px',
            background: '#00b4d8',
            marginLeft: '4px',
            borderRadius: '2px',
            animation: 'pulse 0.8s ease infinite',
            verticalAlign: 'middle',
          }} />
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    abortRef.current = new AbortController();

    try {
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortRef.current.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                fullContent += data.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullContent,
                  };
                  return updated;
                });
              } catch {}
            }
          }
        }
      }

      // Extract map data from final message
      const { mapData: newMapData } = parseMapData(fullContent);
      if (newMapData) {
        setMapData(newMapData);
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo 🙏',
          };
          return updated;
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#0a1628',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* LEFT: Chat Panel */}
      <div style={{
        width: '420px',
        minWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(0,180,216,0.15)',
        background: 'rgba(10,22,40,0.95)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(0,180,216,0.15)',
          background: 'rgba(17,34,64,0.6)',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00b4d8, #0077b6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 4px 16px rgba(0,180,216,0.3)',
            }}>
              🧭
            </div>
            <div>
              <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '22px',
                fontWeight: 700,
                color: '#e8f4f8',
                letterSpacing: '-0.5px',
              }}>
                VONTREK
              </h1>
              <p style={{ fontSize: '11px', color: '#00b4d8', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Tu aventura comienza aquí
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              isStreaming={isLoading && i === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(0,180,216,0.15)',
          background: 'rgba(17,34,64,0.4)',
        }}>
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-end',
            background: 'rgba(17,34,64,0.8)',
            border: '1px solid rgba(0,180,216,0.3)',
            borderRadius: '14px',
            padding: '10px 14px',
            transition: 'border-color 0.2s',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe aquí tu destino soñado..."
              rows={1}
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e8f4f8',
                fontSize: '14px',
                resize: 'none',
                fontFamily: "'DM Sans', sans-serif",
                lineHeight: '1.5',
                maxHeight: '120px',
                overflowY: 'auto',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: isLoading || !input.trim()
                  ? 'rgba(0,180,216,0.2)'
                  : 'linear-gradient(135deg, #00b4d8, #0077b6)',
                border: 'none',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0,
                transition: 'all 0.2s',
                boxShadow: isLoading || !input.trim() ? 'none' : '0 2px 10px rgba(0,180,216,0.4)',
              }}
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
          <p style={{
            fontSize: '11px',
            color: '#4a5568',
            textAlign: 'center',
            marginTop: '8px',
          }}>
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>

      {/* RIGHT: Map Panel */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Map header overlay */}
        {mapData && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 1000,
            background: 'rgba(10,22,40,0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0,180,216,0.3)',
            borderRadius: '12px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '18px' }}>🌍</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#e8f4f8' }}>
                {mapData.destination}
              </p>
              <p style={{ fontSize: '11px', color: '#00b4d8' }}>
                {mapData.places.length} lugares seleccionados
              </p>
            </div>
          </div>
        )}

        {/* Legend */}
        {mapData && mapData.places.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '24px',
            right: '16px',
            zIndex: 1000,
            background: 'rgba(10,22,40,0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0,180,216,0.2)',
            borderRadius: '12px',
            padding: '12px 16px',
          }}>
            <p style={{ fontSize: '11px', color: '#8892b0', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Leyenda
            </p>
            {[
              { type: 'attraction', label: 'Atracción', emoji: '🏛️', color: '#00b4d8' },
              { type: 'hotel', label: 'Hotel', emoji: '🏨', color: '#f4a261' },
              { type: 'restaurant', label: 'Restaurante', emoji: '🍽️', color: '#e9c46a' },
              { type: 'beach', label: 'Playa', emoji: '🏖️', color: '#4cc9f0' },
              { type: 'nature', label: 'Naturaleza', emoji: '🌿', color: '#52b788' },
            ]
              .filter(l => mapData.places.some(p => p.type === l.type))
              .map(l => (
                <div key={l.type} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: l.color,
                  }} />
                  <span style={{ fontSize: '12px', color: '#ccd6f6' }}>{l.emoji} {l.label}</span>
                </div>
              ))
            }
          </div>
        )}

        <TrekMap mapData={mapData} />
      </div>
    </div>
  );
}
