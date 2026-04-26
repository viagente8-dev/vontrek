import { useEffect, useState } from 'react';
import { supabase, Trip } from '../lib/supabase';
import { useAuth } from './AuthProvider';

interface TripsSidebarProps {
  currentTripId: string | null;
  onSelectTrip: (trip: Trip) => void;
  onNewTrip: () => void;
}

export default function TripsSidebar({ currentTripId, onSelectTrip, onNewTrip }: TripsSidebarProps) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadTrips();
  }, [user]);

  const loadTrips = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false });
    setTrips(data || []);
    setLoading(false);
  };

  const deleteTrip = async (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    await supabase.from('trips').delete().eq('id', tripId);
    setTrips(prev => prev.filter(t => t.id !== tripId));
  };

  return (
    <div style={{
      width: '220px',
      minWidth: '220px',
      background: 'rgba(7,15,28,0.95)',
      borderRight: '1px solid rgba(0,180,216,0.1)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(0,180,216,0.1)' }}>
        <p style={{ fontSize: '11px', color: '#8892b0', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
          Mis viajes
        </p>
        <button
          onClick={onNewTrip}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'rgba(0,180,216,0.1)',
            border: '1px solid rgba(0,180,216,0.3)',
            borderRadius: '8px',
            color: '#00b4d8',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <span>✏️</span> Nuevo viaje
        </button>
      </div>

      {/* Trip list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {loading ? (
          <p style={{ fontSize: '12px', color: '#8892b0', textAlign: 'center', marginTop: '20px' }}>Cargando...</p>
        ) : trips.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#8892b0', textAlign: 'center', marginTop: '20px', padding: '0 12px', lineHeight: 1.5 }}>
            Aún no tienes viajes guardados
          </p>
        ) : (
          trips.map(trip => (
            <div
              key={trip.id}
              onClick={() => onSelectTrip(trip)}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '4px',
                cursor: 'pointer',
                background: currentTripId === trip.id ? 'rgba(0,180,216,0.15)' : 'transparent',
                border: currentTripId === trip.id ? '1px solid rgba(0,180,216,0.3)' : '1px solid transparent',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '6px',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '13px',
                  color: currentTripId === trip.id ? '#00b4d8' : '#ccd6f6',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '2px',
                }}>
                  {trip.destination || trip.title || 'Nuevo viaje'}
                </p>
                <p style={{ fontSize: '11px', color: '#8892b0' }}>
                  {new Date(trip.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <button
                onClick={e => deleteTrip(e, trip.id)}
                style={{
                  background: 'none', border: 'none',
                  color: '#4a5568', cursor: 'pointer',
                  fontSize: '14px', padding: '0', flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
