"use client";

import { useEffect, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number | null;
  address: string | null;
  error: string | null;
}

export default function LocationTracker() {
  const [location, setLocation] = useState<LocationData>({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    timestamp: null,
    address: null,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      version: "weekly",
      libraries: ["places", "geocoding"],
    });

    loader.load().then(() => {
      const mapElement = document.getElementById("map");
      if (mapElement && !map) {
        const newMap = new google.maps.Map(mapElement, {
          center: { lat: 35.6762, lng: 139.6503 },
          zoom: 15,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });
        setMap(newMap);
      }
    });
  }, [map]);

  const getAddress = async (lat: number, lng: number): Promise<string> => {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({
        location: { lat, lng },
      });

      if (response.results && response.results[0]) {
        return response.results[0].formatted_address;
      }
      return "住所が見つかりませんでした";
    } catch (error) {
      console.error("Geocoding error:", error);
      return "住所の取得に失敗しました";
    }
  };

  const getCurrentLocation = () => {
    setIsLoading(true);
    setLocation((prev) => ({ ...prev, error: null }));

    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        error: "お使いのブラウザは位置情報をサポートしていません",
      }));
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { coords } = position;
        const address = await getAddress(coords.latitude, coords.longitude);

        const newLocation: LocationData = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude,
          altitudeAccuracy: coords.altitudeAccuracy,
          heading: coords.heading,
          speed: coords.speed,
          timestamp: position.timestamp,
          address: address,
          error: null,
        };

        setLocation(newLocation);

        if (map) {
          const pos = { lat: coords.latitude, lng: coords.longitude };
          
          map.setCenter(pos);
          map.setZoom(17);

          if (marker) {
            marker.setMap(null);
          }

          const newMarker = new google.maps.Marker({
            position: pos,
            map: map,
            title: "現在位置",
            animation: google.maps.Animation.DROP,
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 10px;">
                <h3 style="margin: 0 0 10px 0; font-weight: bold;">現在位置</h3>
                <p style="margin: 5px 0;">緯度: ${coords.latitude}</p>
                <p style="margin: 5px 0;">経度: ${coords.longitude}</p>
                <p style="margin: 5px 0;">精度: ${coords.accuracy}m</p>
                ${address ? `<p style="margin: 5px 0;">住所: ${address}</p>` : ""}
              </div>
            `,
          });

          newMarker.addListener("click", () => {
            infoWindow.open(map, newMarker);
          });

          setMarker(newMarker);
        }

        setIsLoading(false);
      },
      (error) => {
        let errorMessage = "位置情報の取得に失敗しました: ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "位置情報の使用が拒否されました";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "位置情報が利用できません";
            break;
          case error.TIMEOUT:
            errorMessage += "タイムアウトしました";
            break;
          default:
            errorMessage += "不明なエラーが発生しました";
        }
        setLocation((prev) => ({ ...prev, error: errorMessage }));
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          GPS位置情報トラッカー
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={getCurrentLocation}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 font-semibold"
          >
            {isLoading ? "取得中..." : "現在位置を取得"}
          </button>

          {location.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{location.error}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              位置情報メタデータ
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600 font-medium">緯度:</span>
                <span className="text-gray-800">
                  {location.latitude !== null ? location.latitude.toFixed(6) : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600 font-medium">経度:</span>
                <span className="text-gray-800">
                  {location.longitude !== null ? location.longitude.toFixed(6) : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600 font-medium">精度:</span>
                <span className="text-gray-800">
                  {location.accuracy !== null ? `${location.accuracy.toFixed(2)} メートル` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600 font-medium">高度:</span>
                <span className="text-gray-800">
                  {location.altitude !== null ? `${location.altitude.toFixed(2)} メートル` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600 font-medium">高度精度:</span>
                <span className="text-gray-800">
                  {location.altitudeAccuracy !== null
                    ? `${location.altitudeAccuracy.toFixed(2)} メートル`
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600 font-medium">方向:</span>
                <span className="text-gray-800">
                  {location.heading !== null ? `${location.heading.toFixed(2)}°` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600 font-medium">速度:</span>
                <span className="text-gray-800">
                  {location.speed !== null ? `${location.speed.toFixed(2)} m/s` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600 font-medium">タイムスタンプ:</span>
                <span className="text-gray-800 text-sm">
                  {formatTimestamp(location.timestamp)}
                </span>
              </div>
              <div className="py-2">
                <span className="text-gray-600 font-medium block mb-2">住所:</span>
                <span className="text-gray-800 text-sm">
                  {location.address || "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">地図</h2>
            <div
              id="map"
              className="w-full h-96 rounded-lg border border-gray-200"
            ></div>
          </div>
        </div>

        {location.latitude && location.longitude && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Google Maps リンク
            </h2>
            <a
              href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Google Mapsで開く
            </a>
          </div>
        )}
      </div>
    </div>
  );
}