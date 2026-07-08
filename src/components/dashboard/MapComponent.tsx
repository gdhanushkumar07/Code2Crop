import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapProps {
  lat: number;
  lon: number;
}

export default function MapComponent({ lat, lon }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    // Create a beautiful, custom forest-green SVG pin icon
    const customMarkerIcon = L.divIcon({
      html: `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#1C3F24" stroke="#ffffff" stroke-width="1"/>
        </svg>
      `,
      className: "custom-leaflet-marker-wrapper",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    if (!mapInstanceRef.current) {
      // Initialize Leaflet Map
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([lat, lon], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Place Marker using custom SVG icon
      const marker = L.marker([lat, lon], { icon: customMarkerIcon }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      // Dynamic updates on coordinates change
      mapInstanceRef.current.setView([lat, lon], 13);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      }
    }
  }, [lat, lon]);

  return (
    <div className="relative w-full h-full rounded-[24px] overflow-hidden border border-forest-medium/10 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full min-h-[220px]" />
    </div>
  );
}
