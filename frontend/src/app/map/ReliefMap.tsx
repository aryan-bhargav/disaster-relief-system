"use client";

import { useEffect, useRef } from "react";
import type { Map, LayerGroup, Polyline } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface LocationItem {
  id: string;
  name: string;
  type: "centre" | "request";
  lat: number;
  lng: number;
  details: string;
  status?: string;
  priority?: "critical" | "high" | "medium" | "low" | string;
  category?: string;
  quantityNeeded?: number;
  unit?: string;
  isActive?: boolean;
}

interface ReliefMapProps {
  items: LocationItem[];
  selectedItem: LocationItem | null;
  origin: LocationItem | null;
  destination: LocationItem | null;
  routeCoordinates: [number, number][] | null;
  onSelectItem: (item: LocationItem) => void;
  onSelectOrigin: (item: LocationItem) => void;
  onSelectDestination: (item: LocationItem) => void;
}

export default function ReliefMap({
  items,
  selectedItem,
  origin,
  destination,
  routeCoordinates,
  onSelectItem,
  onSelectOrigin,
  onSelectDestination,
}: ReliefMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const casingLayerRef = useRef<Polyline | null>(null);
  const routeLayerRef = useRef<Polyline | null>(null);

  // Initialize Map client-side only
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      const L = await import("leaflet");

      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return;

      // Default centre around Delhi NCR
      const initialCenter: [number, number] = [28.6139, 77.209];
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 11,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
    }

    void initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        casingLayerRef.current = null;
        routeLayerRef.current = null;
      }
    };
  }, []);

  // Update markers when items, selections, or route change
  useEffect(() => {
    if (typeof window === "undefined") return;

    async function updateMarkers() {
      const L = await import("leaflet");
      const map = mapInstanceRef.current;
      const markersLayer = markersLayerRef.current;

      if (!map || !markersLayer) return;

      markersLayer.clearLayers();

      const validItems = items.filter(
        (item) =>
          Number.isFinite(item.lat) &&
          Number.isFinite(item.lng) &&
          item.lat >= -90 &&
          item.lat <= 90 &&
          item.lng >= -180 &&
          item.lng <= 180
      );

      if (validItems.length === 0) return;

      const bounds = L.latLngBounds([]);

      validItems.forEach((item) => {
        const isSelected = selectedItem?.id === item.id;
        const isOrigin = origin?.id === item.id;
        const isDestination = destination?.id === item.id;

        // Custom Shape & Icon logic according to design.md Section 7.F
        let markerHtml = "";
        let width = 28;
        let height = 28;

        if (item.type === "centre") {
          if (item.isActive === false) {
            // Inactive centre: Grey square, hollow
            markerHtml = `
              <div style="
                width: 26px;
                height: 26px;
                background: #FFFFFF;
                border: 2px solid #667085;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                ${isSelected ? "outline: 3px solid #17232D; outline-offset: 2px;" : ""}
              ">
                <span style="font-size: 11px; font-weight: 700; color: #667085;">C</span>
              </div>
            `;
          } else {
            // Active centre: Teal square (#176B63) with white building/cross
            markerHtml = `
              <div style="
                width: 30px;
                height: 30px;
                background: #176B63;
                border: 2px solid #FFFFFF;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #FFFFFF;
                font-size: 13px;
                font-weight: 700;
                box-shadow: 0 3px 6px rgba(0,0,0,0.25);
                ${isSelected ? "outline: 3px solid #17232D; outline-offset: 2px;" : ""}
              ">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l8-4v18"/>
                  <path d="M19 21V11l-6-4"/>
                  <path d="M9 9h1"/>
                  <path d="M9 13h1"/>
                  <path d="M9 17h1"/>
                </svg>
              </div>
            `;
            width = 30;
            height = 30;
          }
        } else {
          // Relief request: circular pin
          if (item.priority === "critical") {
            // Red circular pin with alert symbol
            markerHtml = `
              <div style="
                width: 32px;
                height: 32px;
                background: #B42318;
                border: 2.5px solid #FFFFFF;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #FFFFFF;
                font-weight: 900;
                box-shadow: 0 3px 8px rgba(180,35,24,0.4);
                ${isSelected ? "outline: 3px solid #17232D; outline-offset: 2px;" : ""}
              ">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
            `;
            width = 32;
            height = 32;
          } else if (item.priority === "high") {
            // Amber circular pin
            markerHtml = `
              <div style="
                width: 28px;
                height: 28px;
                background: #B54708;
                border: 2px solid #FFFFFF;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #FFFFFF;
                font-weight: 800;
                font-size: 13px;
                box-shadow: 0 2px 6px rgba(181,71,8,0.35);
                ${isSelected ? "outline: 3px solid #17232D; outline-offset: 2px;" : ""}
              ">
                !
              </div>
            `;
          } else {
            // Medium/Low: Info-blue circular pin with white dot
            markerHtml = `
              <div style="
                width: 24px;
                height: 24px;
                background: #026AA2;
                border: 2px solid #FFFFFF;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 5px rgba(2,106,162,0.35);
                ${isSelected ? "outline: 3px solid #17232D; outline-offset: 2px;" : ""}
              ">
                <div style="width: 6px; height: 6px; background: #FFFFFF; border-radius: 50%;"></div>
              </div>
            `;
            width = 24;
            height = 24;
          }
        }

        // Overlay Origin "A" or Destination "B" badge if selected
        if (isOrigin || isDestination) {
          const letter = isOrigin ? "A" : "B";
          const badgeBg = isOrigin ? "#176B63" : "#026AA2";
          markerHtml = `
            <div style="position: relative;">
              ${markerHtml}
              <div style="
                position: absolute;
                top: -8px;
                right: -8px;
                width: 18px;
                height: 18px;
                background: ${badgeBg};
                color: #FFFFFF;
                border: 1.5px solid #FFFFFF;
                border-radius: 50%;
                font-size: 10px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
              ">
                ${letter}
              </div>
            </div>
          `;
        }

        const icon = L.divIcon({
          className: "relief-div-icon",
          html: markerHtml,
          iconSize: [width, height],
          iconAnchor: [width / 2, height / 2],
          popupAnchor: [0, -height / 2],
        });

        const marker = L.marker([item.lat, item.lng], {
          icon,
          zIndexOffset: isSelected ? 1000 : 0,
        });

        // Popup Content
        const popupContent = `
          <div style="font-family: inherit; font-size: 12px; color: #17232D; padding: 4px; min-width: 180px;">
            <div style="font-weight: 600; font-size: 13px; color: #17232D; margin-bottom: 2px;">
              ${item.name}
            </div>
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 600; color: ${
              item.type === "centre" ? "#176B63" : "#B54708"
            }; margin-bottom: 4px;">
              ${item.type === "centre" ? "Relief Centre Depot" : `Relief Request (${item.priority || "Standard"})`}
            </div>
            <div style="color: #667085; font-size: 11px; margin-bottom: 6px;">
              ${item.details}
            </div>
            <div style="font-family: monospace; font-size: 10px; color: #667085; margin-bottom: 8px;">
              ${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}
            </div>
            <div style="display: flex; gap: 4px;">
              <button id="btn-origin-${item.id}" style="
                background: #176B63; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer; flex: 1;
              ">Set Origin (A)</button>
              <button id="btn-dest-${item.id}" style="
                background: #026AA2; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer; flex: 1;
              ">Set Dest (B)</button>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on("click", () => {
          onSelectItem(item);
        });

        marker.on("popupopen", () => {
          onSelectItem(item);
          const btnOrigin = document.getElementById(`btn-origin-${item.id}`);
          const btnDest = document.getElementById(`btn-dest-${item.id}`);

          if (btnOrigin) {
            btnOrigin.onclick = (e) => {
              e.stopPropagation();
              onSelectOrigin(item);
              marker.closePopup();
            };
          }
          if (btnDest) {
            btnDest.onclick = (e) => {
              e.stopPropagation();
              onSelectDestination(item);
              marker.closePopup();
            };
          }
        });

        marker.addTo(markersLayer);
        bounds.extend([item.lat, item.lng]);
      });

      // Fit bounds if no route is active
      if (!routeCoordinates && validItems.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }

    void updateMarkers();
  }, [items, selectedItem, origin, destination, onSelectItem, onSelectOrigin, onSelectDestination, routeCoordinates]);

  // Render Dual-layer OSRM road route polyline (White casing + Accent road line)
  useEffect(() => {
    if (typeof window === "undefined") return;

    async function updateRoutePolyline() {
      const L = await import("leaflet");
      const map = mapInstanceRef.current;
      if (!map) return;

      if (casingLayerRef.current) {
        casingLayerRef.current.remove();
        casingLayerRef.current = null;
      }
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }

      if (routeCoordinates && routeCoordinates.length > 0) {
        // 1. Under casing line (White 7px) for high contrast on OSM tiles
        const casing = L.polyline(routeCoordinates, {
          color: "#FFFFFF",
          weight: 7,
          opacity: 0.9,
          lineJoin: "round",
          lineCap: "round",
        }).addTo(map);
        casingLayerRef.current = casing;

        // 2. Foreground route line (--accent #176B63 4px)
        const polyline = L.polyline(routeCoordinates, {
          color: "#176B63",
          weight: 4,
          opacity: 1,
          lineJoin: "round",
          lineCap: "round",
        }).addTo(map);
        routeLayerRef.current = polyline;

        map.fitBounds(polyline.getBounds(), { padding: [60, 60] });
      }
    }

    void updateRoutePolyline();
  }, [routeCoordinates]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full relative z-0 focus:outline-none"
      style={{ minHeight: "400px" }}
    />
  );
}
