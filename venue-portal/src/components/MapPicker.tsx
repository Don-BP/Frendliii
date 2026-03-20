import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '../lib/mapLoader'

export type MapLocation =
  | { lat: number; lng: number; address: string }
  | { lat: null; lng: null; address: string }

interface Props {
  value: MapLocation | null
  onChange: (location: MapLocation) => void
}

const OSAKA_CENTER = { lat: 34.6937, lng: 135.5023 }
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

export function MapPicker({ value, onChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [address, setAddress] = useState(value?.address ?? '')

  // Text fallback when no API key
  if (!API_KEY) {
    return (
      <div className="space-y-3">
        <div role="status" className="p-3 bg-slate-700 border border-slate-600 rounded text-sm text-slate-300">
          Interactive map will be enabled once Google Maps API is configured.
          Your venue will still appear in listings but SafeArrival precision will be
          limited until a location is pinned.
        </div>
        <label className="block">
          <span className="text-sm text-slate-400 mb-1 block">Address</span>
          <input
            type="text"
            aria-label="Address"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value)
              onChange({ lat: null, lng: null, address: e.target.value })
            }}
            placeholder="Enter your venue address"
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </label>
      </div>
    )
  }

  // Google Maps path
  useEffect(() => {
    loadGoogleMaps(API_KEY).then(() => setMapsLoaded(true))
  }, [])

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return

    const center = value?.lat != null
      ? { lat: value.lat, lng: value.lng as number }
      : OSAKA_CENTER

    const map = new (window as any).google.maps.Map(mapRef.current, {
      center,
      zoom: 15,
    })

    const marker = new (window as any).google.maps.Marker({
      map,
      position: center,
      draggable: true,
    })

    const geocoder = new (window as any).google.maps.Geocoder()

    const reverseGeocode = (latLng: any) => {
      geocoder.geocode({ location: latLng }, (results: any, status: string) => {
        const addr = status === 'OK' && results?.[0]
          ? results[0].formatted_address
          : `${latLng.lat()}, ${latLng.lng()}`
        onChange({ lat: latLng.lat(), lng: latLng.lng(), address: addr })
      })
    }

    marker.addListener('dragend', () => {
      reverseGeocode(marker.getPosition())
    })

    const input = document.createElement('input')
    input.placeholder = 'Search for your venue address'
    input.className = 'px-3 py-2 rounded shadow text-sm w-64'
    map.controls[(window as any).google.maps.ControlPosition.TOP_CENTER].push(input)
    const searchBox = new (window as any).google.maps.places.SearchBox(input)
    searchBox.addListener('places_changed', () => {
      const places = searchBox.getPlaces()
      if (!places?.length) return
      const place = places[0]
      if (!place.geometry?.location) return
      map.setCenter(place.geometry.location)
      marker.setPosition(place.geometry.location)
      onChange({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: place.formatted_address ?? '',
      })
    })

    if (value?.lat == null) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          map.setCenter(ll)
          marker.setPosition(ll)
        },
        () => {}
      )
    }
  }, [mapsLoaded])

  return (
    <div>
      <div ref={mapRef} className="w-full h-64 rounded border border-slate-600" />
      {value?.address && (
        <p className="mt-2 text-sm text-slate-400">{value.address}</p>
      )}
    </div>
  )
}
