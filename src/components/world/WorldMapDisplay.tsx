import React, { useState, useMemo } from 'react'
import { WorldMapSystem, WorldLocation, RegionalLocation, MapConnection } from '@/lib/types'

interface WorldMapDisplayProps {
  worldMapSystem: WorldMapSystem
}

type ViewMode = 'world' | 'region' | 'connections'

const WorldMapDisplay: React.FC<WorldMapDisplayProps> = ({ worldMapSystem }) => {
  const [selectedView, setSelectedView] = useState<ViewMode>('world')
  const [selectedLocation, setSelectedLocation] = useState<WorldLocation | RegionalLocation | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  // Get location icon based on type
  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'capital':
      case 'country':
        return '⭐' // Star for capitals/countries
      case 'major_city':
      case 'city':
        return '🏛️' // Building for cities
      case 'town':
        return '🏘️' // Houses for towns
      case 'village':
        return '🏡' // House for villages
      case 'landmark':
        return '🗿' // Monument for landmarks
      case 'dungeon':
        return '⚔️' // Sword for dungeons
      case 'wilderness':
        return '🌲' // Tree for wilderness
      default:
        return '📍' // Pin for others
    }
  }

  // Get location color based on type
  const getLocationColor = (type: string) => {
    const colors = {
      capital: 'text-yellow-500 dark:text-yellow-400',
      country: 'text-purple-500 dark:text-purple-400',
      major_city: 'text-blue-500 dark:text-blue-400',
      city: 'text-blue-500 dark:text-blue-400',
      town: 'text-green-500 dark:text-green-400',
      village: 'text-green-400 dark:text-green-300',
      landmark: 'text-red-500 dark:text-red-400',
      dungeon: 'text-gray-600 dark:text-gray-400',
      wilderness: 'text-emerald-600 dark:text-emerald-400'
    }
    return colors[type as keyof typeof colors] || 'text-gray-500 dark:text-gray-400'
  }

  // Get connections for a location
  const getLocationConnections = (locationId: string) => {
    return worldMapSystem.connections.filter(
      conn => conn.fromLocationId === locationId || 
      (conn.bidirectional && conn.toLocationId === locationId)
    )
  }

  // Get travel time for a connection
  const getTravelTime = (connectionId: string, method: string = 'walk') => {
    const travelTime = worldMapSystem.travelTimes.find(
      tt => tt.connectionId === connectionId && tt.travelMethod.type === method
    )
    if (!travelTime) return 'Unknown'
    
    const hours = Math.floor(travelTime.baseTime / 60)
    const minutes = travelTime.baseTime % 60
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return `${days}d ${remainingHours}h`
    }
    
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  // Render world view
  const renderWorldView = () => {
    const { worldMap } = worldMapSystem
    
    return (
      <div className="relative w-full h-[600px] bg-blue-50 dark:bg-gray-800 rounded-lg overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        {/* Locations */}
        {worldMap.locations.map(location => (
          <div
            key={location.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer 
              hover:scale-110 transition-transform ${getLocationColor(location.type)}`}
            style={{ left: `${location.coordinates.x}%`, top: `${location.coordinates.y}%` }}
            onClick={() => setSelectedLocation(location)}
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl">{getLocationIcon(location.type)}</span>
              <span className="text-xs mt-1 bg-white dark:bg-gray-700 px-1 rounded shadow-sm">
                {location.name}
              </span>
            </div>
          </div>
        ))}

        {/* Connections */}
        {worldMapSystem.connections.map(connection => {
          const fromLoc = worldMap.locations.find(l => l.id === connection.fromLocationId)
          const toLoc = worldMap.locations.find(l => l.id === connection.toLocationId)
          
          if (!fromLoc || !toLoc) return null
          
          return (
            <svg
              key={connection.id}
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <line
                x1={`${fromLoc.coordinates.x}%`}
                y1={`${fromLoc.coordinates.y}%`}
                x2={`${toLoc.coordinates.x}%`}
                y2={`${toLoc.coordinates.y}%`}
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={connection.connectionType === 'road' ? '0' : '5,5'}
                className="text-gray-400 dark:text-gray-600"
              />
            </svg>
          )
        })}
      </div>
    )
  }

  // Render region view
  const renderRegionView = () => {
    const region = selectedRegion 
      ? worldMapSystem.regions.find(r => r.id === selectedRegion)
      : worldMapSystem.regions[0]
    
    if (!region) {
      return (
        <div className="flex items-center justify-center h-[600px] text-gray-500 dark:text-gray-400">
          No regions available
        </div>
      )
    }
    
    return (
      <div>
        {/* Region selector */}
        <div className="mb-4">
          <select
            value={region.id}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {worldMapSystem.regions.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        
        {/* Region map */}
        <div className="relative w-full h-[600px] bg-green-50 dark:bg-gray-800 rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
          
          {/* Locations */}
          {region.locations.map(location => (
            <div
              key={location.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer 
                hover:scale-110 transition-transform ${getLocationColor(location.type)}`}
              style={{ left: `${location.coordinates.x}%`, top: `${location.coordinates.y}%` }}
              onClick={() => setSelectedLocation(location)}
            >
              <div className="flex flex-col items-center">
                <span className="text-2xl">{getLocationIcon(location.type)}</span>
                <span className="text-xs mt-1 bg-white dark:bg-gray-700 px-1 rounded shadow-sm">
                  {location.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render connections view
  const renderConnectionsView = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Travel Connections & Times
        </h3>
        
        <div className="grid gap-4">
          {worldMapSystem.connections.map(connection => {
            const fromLoc = [...worldMapSystem.worldMap.locations, 
              ...worldMapSystem.regions.flatMap(r => r.locations)]
              .find(l => l.id === connection.fromLocationId)
            const toLoc = [...worldMapSystem.worldMap.locations,
              ...worldMapSystem.regions.flatMap(r => r.locations)]
              .find(l => l.id === connection.toLocationId)
            
            if (!fromLoc || !toLoc) return null
            
            const travelMethods = ['walk', 'horse', 'carriage', 'ship', 'flight']
            
            return (
              <div key={connection.id} 
                className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={getLocationColor(fromLoc.type)}>
                      {getLocationIcon(fromLoc.type)}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {fromLoc.name}
                    </span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {connection.bidirectional ? '↔' : '→'}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {toLoc.name}
                    </span>
                    <span className={getLocationColor(toLoc.type)}>
                      {getLocationIcon(toLoc.type)}
                    </span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span>Type: {connection.connectionType}</span>
                  <span className="mx-2">•</span>
                  <span>Difficulty: {connection.difficulty}</span>
                </div>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  {travelMethods.map(method => {
                    const time = getTravelTime(connection.id, method)
                    if (time === 'Unknown') return null
                    
                    return (
                      <span key={method} 
                        className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                        {method}: {time}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Header with tabs */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          World Map System
        </h2>
        
        {/* Tab navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setSelectedView('world')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              selectedView === 'world'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            World View
          </button>
          <button
            onClick={() => setSelectedView('region')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              selectedView === 'region'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Region View
          </button>
          <button
            onClick={() => setSelectedView('connections')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              selectedView === 'connections'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Connections
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        {selectedView === 'world' && renderWorldView()}
        {selectedView === 'region' && renderRegionView()}
        {selectedView === 'connections' && renderConnectionsView()}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Legend
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { type: 'capital', label: 'Capital' },
            { type: 'city', label: 'City' },
            { type: 'town', label: 'Town' },
            { type: 'village', label: 'Village' },
            { type: 'landmark', label: 'Landmark' },
            { type: 'dungeon', label: 'Dungeon' },
            { type: 'wilderness', label: 'Wilderness' }
          ].map(({ type, label }) => (
            <div key={type} className="flex items-center space-x-2">
              <span className={`text-2xl ${getLocationColor(type)}`}>
                {getLocationIcon(type)}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Location details modal */}
      {selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedLocation(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {selectedLocation.name}
              </h3>
              <span className={`text-3xl ${getLocationColor(selectedLocation.type)}`}>
                {getLocationIcon(selectedLocation.type)}
              </span>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Type:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">
                  {selectedLocation.type.replace(/_/g, ' ')}
                </span>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Description:</span>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {selectedLocation.description}
                </p>
              </div>
              
              {selectedLocation.population && (
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Population:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {selectedLocation.population.toLocaleString()}
                  </span>
                </div>
              )}
              
              {'importance' in selectedLocation && (
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Importance:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {selectedLocation.importance}
                  </span>
                </div>
              )}
              
              {'climate' in selectedLocation && selectedLocation.climate && (
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Climate:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {selectedLocation.climate}
                  </span>
                </div>
              )}
              
              {'services' in selectedLocation && selectedLocation.services.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Services:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedLocation.services.map((service, idx) => (
                      <span key={idx} 
                        className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Connections */}
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Connections:</span>
                <div className="mt-1 space-y-1">
                  {getLocationConnections(selectedLocation.id).map(conn => {
                    const otherLocId = conn.fromLocationId === selectedLocation.id 
                      ? conn.toLocationId : conn.fromLocationId
                    const otherLoc = [...worldMapSystem.worldMap.locations,
                      ...worldMapSystem.regions.flatMap(r => r.locations)]
                      .find(l => l.id === otherLocId)
                    
                    if (!otherLoc) return null
                    
                    return (
                      <div key={conn.id} className="text-sm text-gray-700 dark:text-gray-300">
                        → {otherLoc.name} ({conn.connectionType})
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedLocation(null)}
              className="mt-6 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 
                text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 
                dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorldMapDisplay