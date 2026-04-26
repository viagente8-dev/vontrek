import { useEffect, useRef, useState } from 'react';

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

const typeEmojis: Record<string, string> = {
  attraction: '🏛️',
  hotel: '🏨',
  restaurant: '🍽️',
  beach: '🏖️',
  museum: '🖼️',
  nature: '🌿',
  default: '📍',
};

const typeColors: Record<string, string> = {
  attraction: '#00b4d8',
  hotel: '#f4a261',
  restaurant: '#e9c46a',
  beach: '#4cc9f0',
  museum: '#7b2d8b',
  nature: '#52b788',
  default: '#00b4d8',
};

declare global {
  interface Window {
    google: any;
    initGoogleMap: () => void;
  }
}

export default function TrekMap({ mapData }: TrekMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.google) { setIsLoaded(true); return; }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) return;
    window.initGoogleMap = () => setIsLoaded(true);
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#0a1628' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8892b0' }] },
        { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#00b4d8' }, { weight: 0.8 }] },
        { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#90e0ef' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#112240' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#051520' }] },
        { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#0077b6' }] },
        { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#112240' }] },
      ],
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    infoWindowRef.current = new window.google.maps.InfoWindow();
  }, [isLoaded]);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapData) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (infoWindowRef.current) infoWindowRef.current.close();

    const bounds = new window.google.maps.LatLngBounds();

    mapData.places.forEach((place) => {
      const color = typeColors[place.type] || typeColors.default;
      const emoji = typeEmojis[place.type] || typeEmojis.default;

      const marker = new window.google.maps.Marker({
        position: { lat: place.coordinates[0], lng: place.coordinates[1] },
        map: mapInstanceRef.current,
        title: place.name,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          scale: 1.8,
          anchor: new window.google.maps.Point(12, 22),
        },
        animation: window.google.maps.Animation.DROP,
      });

      marker.addListener('click', () => {
        infoWindowRef.current.setContent(`
          <div style="font-family:sans-serif;background:#112240;color:#e8f4f8;padding:12px 16px;border-radius:10px;min-width:180px;max-width:240px;">
            <div style="font-size:20px;margin-bottom:6px;">${emoji}</div>
            <strong style="font-size:14px;color:#00b4d8;display:block;margin-bottom:4px;">${place.name}</strong>
            <p style="font-size:12px;color:#ccd6f6;margin:0;line-height:1.5;">${place.description}</p>
            ${place.day ? `<span style="font-size:11px;color:#f4a261;margin-top:6px;display:block;">Día ${place.day}</span>` : ''}
          </div>
        `);
        infoWindowRef.current.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
      bounds.extend({ lat: place.coordinates[0], lng: place.coordinates[1] });
    });

    if (mapData.places.length === 0) {
      mapInstanceRef.current.setCenter({ lat: mapData.center[0], lng: mapData.center[1] });
      mapInstanceRef.current.setZoom(mapData.zoom);
    } else if (mapData.places.length === 1) {
      mapInstanceRef.current.setCenter({ lat: mapData.places[0].coordinates[0], lng: mapData.places[0].coordinates[1] });
      mapInstanceRef.current.setZoom(mapData.zoom);
    } else {
      mapInstanceRef.current.fitBounds(bounds, { padding: 60 });
    }
  }, [mapData]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      {!mapData && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,22,40,0.85)', backdropFilter: 'blur(4px)', gap: '12px', pointerEvents: 'none' }}>
          <div style={{ fontSize: '48px' }}>🗺️</div>
          <p style={{ color: '#8892b0', fontSize: '15px', textAlign: 'center', maxWidth: '220px', lineHeight: 1.5 }}>Tu mapa aparecerá aquí cuando elijas un destino</p>
        </div>
      )}
    </div>
  );
}
