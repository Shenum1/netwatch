import { useEffect, useRef } from "react";
import { useEventStore } from "../../store/useEventStore.js";

export default function GeoMap() {
  const mapRef      = useRef(null);
  const leafletMap  = useRef(null);
  const markers     = useRef({});
  const geoData     = useRef({});
  const events      = useEventStore((s) => s.events);

  // Wait for Leaflet to be available, then init
  useEffect(() => {
    let tries = 0;
    const init = () => {
      if (leafletMap.current || !mapRef.current) return;
      const L = window.L;
      if (!L) {
        if (++tries < 20) setTimeout(init, 200);
        return;
      }
      leafletMap.current = L.map(mapRef.current, {
        center: [20, 10], zoom: 2,
        zoomControl: true, attributionControl: false,
      });
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { subdomains: "abcd", maxZoom: 19 }
      ).addTo(leafletMap.current);
    };
    init();
    return () => { leafletMap.current?.remove(); leafletMap.current = null; };
  }, []);

  // Update markers when events change
  useEffect(() => {
    const L = window.L;
    if (!L || !leafletMap.current) return;

    events.forEach((ev) => {
      if (!ev.geo?.ll) return;
      const key = ev.geo.country || "Unknown";
      if (!geoData.current[key]) {
        geoData.current[key] = { ll: ev.geo.ll, country: key, total: 0, anomalies: 0 };
      }
      geoData.current[key].total++;
      if (ev.is_anomaly) geoData.current[key].anomalies++;
    });

    Object.entries(geoData.current).forEach(([key, d]) => {
      const rate  = d.total > 0 ? d.anomalies / d.total : 0;
      const color = rate > 0.4 ? "#E24B4A" : rate > 0.15 ? "#EF9F27" : "#1D9E75";
      const radius = Math.min(6 + d.total * 0.4, 22);

      if (markers.current[key]) {
        markers.current[key].setRadius(radius);
        markers.current[key].setStyle({ color, fillColor: color });
      } else {
        const m = L.circleMarker(d.ll, {
          radius, color, fillColor: color, fillOpacity: 0.55, weight: 1.5,
        }).addTo(leafletMap.current);
        m.bindPopup(
          `<div style="font-family:monospace;font-size:12px;line-height:1.6">
            <b>${d.country}</b><br>
            Events: ${d.total}<br>
            Anomalies: ${d.anomalies}<br>
            Rate: ${(rate * 100).toFixed(1)}%
          </div>`
        );
        markers.current[key] = m;
      }
    });
  }, [events]);

  return <div ref={mapRef} style={{ height: "100%", width: "100%", borderRadius: "inherit" }} />;
}
