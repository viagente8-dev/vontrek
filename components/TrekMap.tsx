import { useEffect, useRef } from 'react';

interface Place {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number];
  type: string;
  day?: number;
}

interface MapData {
  destination: string;
  center: [number, number];
  zoom: number;
  places: Place[];
}

interface TrekMapProps {
  mapData: MapData | null;
}

const typeColors: Record<string, string> = {
  attraction: '#00b4d8',
  hotel: '#f4a261',
  restaurant: '#e9c46a',
  beach: '#4cc9f0',
  museum: '#7b2d8b',
  nature: '#52b788',
  default: '#00b4d8',
};

const typeEmojis: Record<string, string> = {
  attraction: '🏛️',
  hotel: '🏨',
  restaurant: '🍽️',
  beach: '🏖️',
  museum: '🖼️',
  nature: '🌿',
  default: '📍',
};

export default function TrekMap({ mapData }: TrekMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!mapInstanceRef.current && mapRef.current) {
        mapInstanceRef.current = L.map(mapRef.current, {
          center: [20, 0],
          zoom: 2,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapData || !mapInstanceRef.current) return;

    const updateMap = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      mapData.places.forEach((place) => {
        const color = typeColors[place.type] || typeColors.default;
        const emoji = typeEmojis[place.type] || typeEmojis.default;

        const icon = L.divIcon({
          html: `<div style="background:${color};width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:14px;">${emoji}</span></div>`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -40],
        });

        const marker = L.marker(place.coordinates, { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:160px;">
              <div style="font-size:18px;margin-bottom:4px;">${emoji}</div>
              <strong style="font-size:14px;color:#00b4d8;">${place.name}</strong>
              <p style="font-size:12px;margin-top:4px;color:#ccd6f6;">${place.description}</p>
              ${place.day ? `<span style="font-size:11px;color:#f4a261;">Día ${place.day}</span>` : ''}
            </div>
          `);

        markersRef.current.push(marker);
      });

      map.flyTo(mapData.center, mapData.zoom, { duration: 1.5 });
    };

    updateMap();
  }, [mapData]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      {!mapData && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,22,40,0.85)', backdropFilter: 'blur(4px)', gap: '12px', pointerEvents: 'none' }}>
          <div style={{ fontSize: '48px' }}>🗺️</div>
          <p style={{ color: '#8892b0', fontSize: '15px', textAlign: 'center', maxWidth: '220px', lineHeight: 1.5 }}>
            Tu mapa aparecerá aquí cuando elijas un destino
          </p>
        </div>
      )}
    </div>
  );
}
