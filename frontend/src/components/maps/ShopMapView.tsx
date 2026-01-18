// Shop Map View Component with Leaflet
import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Clock, Store, MapPin, Phone, ChevronRight } from 'lucide-react';

// Fix for default marker icons in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const createCustomIcon = (color: string, isUser: boolean = false) => {
  const size = isUser ? 40 : 32;
  const svg = isUser 
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="${size}" height="${size}">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="${size}" height="${size}">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" stroke="white" stroke-width="1"/>
      </svg>`;
  
  return L.divIcon({
    html: svg,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

const userIcon = createCustomIcon('#0284c7', true); // Primary blue for user
const shopIconGreen = createCustomIcon('#16a34a'); // Green - paid
const shopIconOrange = createCustomIcon('#ea580c'); // Orange - pending
const shopIconRed = createCustomIcon('#dc2626'); // Red - overdue
const shopIconBlue = createCustomIcon('#0284c7'); // Blue - default
const nextShopIcon = createCustomIcon('#7c3aed'); // Purple - next recommended shop

interface Shop {
  id: string;
  shopName: string;
  address?: string;
  contact?: string;
  latitude: number | null;
  longitude: number | null;
  paymentStatus?: 'paid' | 'pending' | 'ongoing' | 'cheque';
  distance?: number;
  estimatedTime?: number; // in minutes
}

interface ShopMapViewProps {
  shops: Shop[];
  userLocation: { lat: number; lng: number } | null;
  onShopSelect: (shop: Shop) => void;
  onNavigate?: (shop: Shop) => void;
  selectedShopId?: string | null;
  showDirectionsInMap?: boolean;
}

// Component to update map view when location changes
const MapUpdater = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Calculate distance between two points (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Estimate travel time (assuming average speed of 30 km/h in urban areas)
const estimateTravelTime = (distanceKm: number): number => {
  const avgSpeedKmH = 30;
  return Math.round((distanceKm / avgSpeedKmH) * 60); // minutes
};

// Get shop icon based on payment status
const getShopIcon = (status?: string, isNext?: boolean) => {
  if (isNext) return nextShopIcon;
  switch (status) {
    case 'paid': return shopIconGreen;
    case 'ongoing': return shopIconOrange;
    case 'cheque': return shopIconOrange;
    case 'pending': return shopIconRed;
    default: return shopIconBlue;
  }
};

export const ShopMapView = ({ 
  shops, 
  userLocation, 
  onShopSelect, 
  onNavigate,
  selectedShopId,
  showDirectionsInMap = false
}: ShopMapViewProps) => {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [selectedRouteShop, setSelectedRouteShop] = useState<Shop | null>(null);

  // Calculate distances and sort shops by proximity
  const shopsWithDistance = useMemo(() => {
    if (!userLocation) return shops;
    
    return shops
      .filter(shop => shop.latitude && shop.longitude)
      .map(shop => ({
        ...shop,
        distance: calculateDistance(
          userLocation.lat, 
          userLocation.lng, 
          shop.latitude!, 
          shop.longitude!
        ),
        estimatedTime: estimateTravelTime(
          calculateDistance(
            userLocation.lat, 
            userLocation.lng, 
            shop.latitude!, 
            shop.longitude!
          )
        )
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [shops, userLocation]);

  // Get the next recommended shop (nearest unvisited/unpaid shop)
  const nextRecommendedShop = useMemo(() => {
    return shopsWithDistance.find(shop => 
      shop.paymentStatus !== 'paid'
    ) || shopsWithDistance[0];
  }, [shopsWithDistance]);

  // Update route when selected shop or next shop changes
  useEffect(() => {
    const targetShop = selectedRouteShop || nextRecommendedShop;
    if (userLocation && targetShop?.latitude && targetShop?.longitude) {
      // Simple straight line route (for actual routing, you'd use OSRM or similar)
      setRouteCoords([
        [userLocation.lat, userLocation.lng],
        [targetShop.latitude, targetShop.longitude]
      ]);
    }
  }, [userLocation, nextRecommendedShop, selectedRouteShop]);

  // Handle showing directions for a shop
  const handleShowDirections = (shop: Shop) => {
    setSelectedRouteShop(shop);
  };

  // Default center (Sri Lanka)
  const defaultCenter: [number, number] = [7.8731, 80.7718];
  const mapCenter: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : defaultCenter;

  return (
    <div className="flex flex-col h-full relative">
      {/* Map Container */}
      <div className="relative flex-1 min-h-[300px] overflow-hidden">
        <MapContainer
          center={mapCenter}
          zoom={14}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapUpdater center={mapCenter} zoom={14} />

          {/* User Location Marker */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>
                <div className="text-center p-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <MapPin className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="font-bold text-gray-900 mb-1">Your Location</div>
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Route Line to Shop */}
          {routeCoords.length > 1 && (
            <Polyline
              positions={routeCoords}
              color="#7c3aed"
              weight={5}
              opacity={0.8}
              dashArray="12, 8"
            />
          )}

          {/* Shop Markers */}
          {shopsWithDistance.map((shop) => {
            if (!shop.latitude || !shop.longitude) return null;
            const isNext = shop.id === nextRecommendedShop?.id;
            
            return (
              <Marker
                key={shop.id}
                position={[shop.latitude, shop.longitude]}
                icon={getShopIcon(shop.paymentStatus, isNext)}
                eventHandlers={{
                  click: () => onShopSelect(shop),
                }}
              >
                <Popup>
                  <div className="p-3 min-w-[220px]">
                    {/* Shop Header */}
                    <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
                      <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Store className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate">{shop.shopName}</h4>
                        {shop.address && (
                          <p className="text-xs text-gray-500 truncate">{shop.address}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Distance & Time */}
                    <div className="flex items-center gap-3 mb-3">
                      {shop.distance !== undefined && (
                        <div className="flex items-center gap-1.5 bg-primary-50 text-primary-700 px-2.5 py-1.5 rounded-lg">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">{shop.distance.toFixed(1)} km</span>
                        </div>
                      )}
                      {shop.estimatedTime !== undefined && (
                        <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2.5 py-1.5 rounded-lg">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">~{shop.estimatedTime} min</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Status Badges */}
                    {isNext && (
                      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs px-3 py-2 rounded-lg mb-3 text-center font-semibold shadow-sm">
                        ⭐ Recommended Next Stop
                      </div>
                    )}
                    {selectedRouteShop?.id === shop.id && (
                      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-3 py-2 rounded-lg mb-3 text-center font-semibold shadow-sm">
                        📍 Route Active
                      </div>
                    )}
                    
                    {/* Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowDirections(shop);
                      }}
                      className={`w-full text-white text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all active:scale-95 ${
                        selectedRouteShop?.id === shop.id 
                          ? 'bg-green-600 hover:bg-green-700 shadow-green-200' 
                          : 'bg-primary-600 hover:bg-primary-700 shadow-primary-200'
                      } shadow-lg`}
                    >
                      <Navigation className="w-4 h-4" />
                      {selectedRouteShop?.id === shop.id ? 'Route Active' : 'Show Route'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Map Legend - Compact */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-3 z-[400] border border-gray-100">
          <div className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
            Legend
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary-500 ring-2 ring-primary-200"></div>
              <span className="text-gray-600">You</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-purple-200"></div>
              <span className="text-gray-600">Next</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-200"></div>
              <span className="text-gray-600">Paid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-orange-200"></div>
              <span className="text-gray-600">Pending</span>
            </div>
          </div>
        </div>

        {/* Route Info Card */}
        {(selectedRouteShop || nextRecommendedShop) && userLocation && (
          <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 z-[400] border border-gray-100">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                selectedRouteShop 
                  ? 'bg-gradient-to-br from-primary-500 to-primary-600' 
                  : 'bg-gradient-to-br from-purple-500 to-purple-600'
              } shadow-lg`}>
                <Navigation className="w-6 h-6 text-white" />
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-wide ${
                  selectedRouteShop ? 'text-primary-600' : 'text-purple-600'
                }`}>
                  {selectedRouteShop ? 'Navigate to' : '⭐ Next Stop'}
                </p>
                <p className="font-bold text-gray-900 text-lg truncate">
                  {(selectedRouteShop || nextRecommendedShop)?.shopName}
                </p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-primary-500" />
                    <span className="font-semibold">{(selectedRouteShop || nextRecommendedShop)?.distance?.toFixed(1)} km</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold">~{(selectedRouteShop || nextRecommendedShop)?.estimatedTime} min</span>
                  </span>
                </div>
              </div>
              
              {/* Clear Button */}
              {selectedRouteShop && (
                <button
                  onClick={() => setSelectedRouteShop(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default ShopMapView;

