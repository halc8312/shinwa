import React, { useState, useMemo } from 'react'
import { WorldMapSystem, WorldLocation, RegionalLocation, MapConnection } from '@/lib/types'

interface WorldMapDisplayProps {
  worldMapSystem: WorldMapSystem
}

type ViewMode = 'world' | 'region' | 'connections'

const WorldMapDisplay: React.FC<WorldMapDisplayProps> = ({ worldMapSystem }) => {
  const [selectedView, setSelectedView] = useState<ViewMode>('world')
  const [selectedLocation, setSelectedLocation] = useState<WorldLocation | RegionalLocation | null>(null)
  // 初期値を最初のリージョンのIDに設定
  const [selectedRegion, setSelectedRegion] = useState<string | null>(
    worldMapSystem.regions && worldMapSystem.regions.length > 0 ? worldMapSystem.regions[0].id : null
  )

  // リージョンが変更された時の処理
  React.useEffect(() => {
    if (selectedView === 'region') {
      if (!selectedRegion && worldMapSystem.regions && worldMapSystem.regions.length > 0) {
        setSelectedRegion(worldMapSystem.regions[0].id)
      } else if (selectedRegion && worldMapSystem.regions) {
        // 選択されたリージョンがまだ存在するか確認
        const regionExists = worldMapSystem.regions.some(r => r.id === selectedRegion)
        if (!regionExists && worldMapSystem.regions.length > 0) {
          setSelectedRegion(worldMapSystem.regions[0].id)
        }
      }
    }
  }, [selectedView, selectedRegion, worldMapSystem.regions])

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
      <div className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] bg-gradient-to-b from-blue-100 to-blue-200 dark:from-gray-800 dark:to-gray-900 rounded-lg overflow-hidden">
        {/* Enhanced terrain background */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            {/* Ocean gradient */}
            <radialGradient id="oceanGradient">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
            </radialGradient>
            {/* Mountain gradient */}
            <radialGradient id="mountainGradient">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.6" />
            </radialGradient>
            {/* Forest gradient */}
            <radialGradient id="forestGradient">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
            </radialGradient>
            {/* Desert gradient */}
            <radialGradient id="desertGradient">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.5" />
            </radialGradient>
            {/* Plains gradient */}
            <linearGradient id="plainsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#86efac" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          
          {/* Render geographical features */}
          {worldMap.geography && worldMap.geography.map((feature, index) => {
            const width = feature.area.bottomRight.x - feature.area.topLeft.x
            const height = feature.area.bottomRight.y - feature.area.topLeft.y
            const fillId = `${feature.type}Gradient`
            
            if (feature.type === 'mountain') {
              // Render mountains as triangular shapes
              return (
                <g key={index}>
                  <polygon
                    points={`${feature.area.topLeft.x + width/2}%,${feature.area.topLeft.y}% ${feature.area.topLeft.x}%,${feature.area.bottomRight.y}% ${feature.area.bottomRight.x}%,${feature.area.bottomRight.y}%`}
                    fill={`url(#${fillId})`}
                    className="opacity-60"
                  />
                  <text
                    x={`${feature.area.topLeft.x + width/2}%`}
                    y={`${feature.area.topLeft.y + height/2}%`}
                    textAnchor="middle"
                    fontSize="10"
                    fill="currentColor"
                    className="text-gray-700 dark:text-gray-300 opacity-70"
                  >
                    {feature.name}
                  </text>
                </g>
              )
            } else if (feature.type === 'river') {
              // Render rivers as curved paths
              return (
                <g key={index}>
                  <path
                    d={`M ${feature.area.topLeft.x}%,${feature.area.topLeft.y}% Q ${(feature.area.topLeft.x + feature.area.bottomRight.x)/2}%,${(feature.area.topLeft.y + feature.area.bottomRight.y)/2 + 5}% ${feature.area.bottomRight.x}%,${feature.area.bottomRight.y}%`}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    fill="none"
                    opacity="0.7"
                  />
                  <text
                    x={`${(feature.area.topLeft.x + feature.area.bottomRight.x)/2}%`}
                    y={`${(feature.area.topLeft.y + feature.area.bottomRight.y)/2}%`}
                    textAnchor="middle"
                    fontSize="10"
                    fill="currentColor"
                    className="text-blue-600 dark:text-blue-400 opacity-70"
                  >
                    {feature.name}
                  </text>
                </g>
              )
            } else {
              // Render other features as rectangles with rounded corners
              return (
                <g key={index}>
                  <rect
                    x={`${feature.area.topLeft.x}%`}
                    y={`${feature.area.topLeft.y}%`}
                    width={`${width}%`}
                    height={`${height}%`}
                    rx="5"
                    fill={`url(#${fillId})`}
                    className="opacity-50"
                  />
                  <text
                    x={`${feature.area.topLeft.x + width/2}%`}
                    y={`${feature.area.topLeft.y + height/2}%`}
                    textAnchor="middle"
                    fontSize="10"
                    fill="currentColor"
                    className="text-gray-700 dark:text-gray-300 opacity-70"
                  >
                    {feature.name}
                  </text>
                </g>
              )
            }
          })}
        </svg>
        
        {/* Grid overlay for reference */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        {/* Connections layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {worldMapSystem.connections.map(connection => {
            const fromLoc = worldMap.locations.find(l => l.id === connection.fromLocationId)
            const toLoc = worldMap.locations.find(l => l.id === connection.toLocationId)
            
            if (!fromLoc || !toLoc) return null
            
            // Calculate control point for curved roads
            const dx = toLoc.coordinates.x - fromLoc.coordinates.x
            const dy = toLoc.coordinates.y - fromLoc.coordinates.y
            const cx = (fromLoc.coordinates.x + toLoc.coordinates.x) / 2 + dy * 0.1
            const cy = (fromLoc.coordinates.y + toLoc.coordinates.y) / 2 - dx * 0.1
            
            return (
              <g key={connection.id}>
                {connection.connectionType === 'road' ? (
                  <path
                    d={`M ${fromLoc.coordinates.x}% ${fromLoc.coordinates.y}% Q ${cx}% ${cy}% ${toLoc.coordinates.x}% ${toLoc.coordinates.y}%`}
                    stroke="#8b5cf6"
                    strokeWidth="3"
                    fill="none"
                    opacity="0.6"
                  />
                ) : (
                  <path
                    d={`M ${fromLoc.coordinates.x}% ${fromLoc.coordinates.y}% Q ${cx}% ${cy}% ${toLoc.coordinates.x}% ${toLoc.coordinates.y}%`}
                    stroke="#6b7280"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    fill="none"
                    opacity="0.5"
                  />
                )}
              </g>
            )
          })}
        </svg>
        
        {/* Locations layer */}
        {worldMap.locations.map(location => (
          <div
            key={location.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer 
              hover:scale-110 transition-transform z-10 ${getLocationColor(location.type)}`}
            style={{ left: `${location.coordinates.x}%`, top: `${location.coordinates.y}%` }}
            onClick={() => setSelectedLocation(location)}
          >
            <div className="flex flex-col items-center">
              <div className="bg-white dark:bg-gray-800 rounded-full p-1 md:p-2 shadow-lg">
                <span className="text-lg md:text-2xl">{getLocationIcon(location.type)}</span>
              </div>
              <span className="text-[10px] md:text-xs mt-1 bg-white dark:bg-gray-700 px-1 md:px-2 py-0.5 md:py-1 rounded shadow-md font-medium max-w-[80px] md:max-w-none truncate">
                {location.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render region view
  const renderRegionView = () => {
    // 地域データの存在チェック
    if (!worldMapSystem.regions || worldMapSystem.regions.length === 0) {
      return (
        <div className="flex items-center justify-center h-[400px] sm:h-[500px] md:h-[600px] text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <p className="text-lg mb-2">地域データがありません</p>
            <p className="text-sm">まだ地域マップが生成されていない可能性があります</p>
          </div>
        </div>
      )
    }
    
    const region = selectedRegion 
      ? worldMapSystem.regions.find(r => r.id === selectedRegion)
      : worldMapSystem.regions[0]
    
    if (!region) {
      return (
        <div className="flex items-center justify-center h-[400px] sm:h-[500px] md:h-[600px] text-gray-500 dark:text-gray-400">
          No regions available
        </div>
      )
    }
    
    return (
      <div>
        {/* Region selector */}
        <div className="mb-4">
          <select
            value={selectedRegion || ''}
            onChange={(e) => {
              const newRegionId = e.target.value
              if (newRegionId) {
                setSelectedRegion(newRegionId)
              }
            }}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {!selectedRegion && <option value="">地域を選択...</option>}
            {worldMapSystem.regions.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        
        {/* Region map */}
        <div className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] bg-gradient-to-br from-green-100 to-emerald-200 dark:from-gray-800 dark:to-gray-900 rounded-lg overflow-hidden">
          {/* Enhanced terrain for regions */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              {/* Terrain type gradients for regions */}
              <linearGradient id="hillGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0.6" />
              </linearGradient>
              <radialGradient id="lakeGradient">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.7" />
              </radialGradient>
              <linearGradient id="roadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d1d5db" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#9ca3af" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#d1d5db" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            
            {/* Render terrain features */}
            {region.terrain && region.terrain.map((terrain, index) => {
              if (terrain.type === 'hill') {
                // Render hills as circles with gradient
                return (
                  <g key={index}>
                    <circle
                      cx={`${terrain.position.x}%`}
                      cy={`${terrain.position.y}%`}
                      r="8%"
                      fill="url(#hillGradient)"
                      className="opacity-70"
                    />
                    <text
                      x={`${terrain.position.x}%`}
                      y={`${terrain.position.y}%`}
                      textAnchor="middle"
                      fontSize="9"
                      fill="currentColor"
                      className="text-gray-600 dark:text-gray-400"
                    >
                      {terrain.name}
                    </text>
                  </g>
                )
              } else if (terrain.type === 'lake') {
                // Render lakes as irregular shapes
                return (
                  <g key={index}>
                    <ellipse
                      cx={`${terrain.position.x}%`}
                      cy={`${terrain.position.y}%`}
                      rx="10%"
                      ry="6%"
                      fill="url(#lakeGradient)"
                      transform={`rotate(${index * 30} ${terrain.position.x} ${terrain.position.y})`}
                    />
                    <text
                      x={`${terrain.position.x}%`}
                      y={`${terrain.position.y}%`}
                      textAnchor="middle"
                      fontSize="9"
                      fill="currentColor"
                      className="text-blue-700 dark:text-blue-300"
                    >
                      {terrain.name}
                    </text>
                  </g>
                )
              } else if (terrain.type === 'road') {
                // Roads are rendered separately with connections
                return null
              } else {
                // Other terrain features
                return (
                  <g key={index}>
                    <rect
                      x={`${terrain.position.x - 5}%`}
                      y={`${terrain.position.y - 3}%`}
                      width="10%"
                      height="6%"
                      rx="3"
                      fill={terrain.type === 'bridge' ? '#8b5cf6' : '#6b7280'}
                      opacity="0.5"
                    />
                    <text
                      x={`${terrain.position.x}%`}
                      y={`${terrain.position.y}%`}
                      textAnchor="middle"
                      fontSize="8"
                      fill="currentColor"
                      className="text-gray-700 dark:text-gray-300"
                    >
                      {terrain.name}
                    </text>
                  </g>
                )
              }
            })}
            
            {/* Render regional connections with better paths */}
            {worldMapSystem.connections
              .filter(conn => {
                const locations = region.locations || []
                const fromLoc = locations.find(l => l.id === conn.fromLocationId)
                const toLoc = locations.find(l => l.id === conn.toLocationId)
                return fromLoc && toLoc
              })
              .map(connection => {
                const locations = region.locations || []
                const fromLoc = locations.find(l => l.id === connection.fromLocationId)
                const toLoc = locations.find(l => l.id === connection.toLocationId)
                
                if (!fromLoc || !toLoc) return null
                
                // More sophisticated path calculation
                const dx = toLoc.coordinates.x - fromLoc.coordinates.x
                const dy = toLoc.coordinates.y - fromLoc.coordinates.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                const cx1 = fromLoc.coordinates.x + dx * 0.25 + dy * 0.15
                const cy1 = fromLoc.coordinates.y + dy * 0.25 - dx * 0.15
                const cx2 = fromLoc.coordinates.x + dx * 0.75 - dy * 0.15
                const cy2 = fromLoc.coordinates.y + dy * 0.75 + dx * 0.15
                
                return (
                  <g key={connection.id}>
                    {connection.connectionType === 'road' ? (
                      <>
                        {/* Road background */}
                        <path
                          d={`M ${fromLoc.coordinates.x}% ${fromLoc.coordinates.y}% C ${cx1}% ${cy1}% ${cx2}% ${cy2}% ${toLoc.coordinates.x}% ${toLoc.coordinates.y}%`}
                          stroke="#6b7280"
                          strokeWidth="6"
                          fill="none"
                          opacity="0.3"
                        />
                        {/* Road surface */}
                        <path
                          d={`M ${fromLoc.coordinates.x}% ${fromLoc.coordinates.y}% C ${cx1}% ${cy1}% ${cx2}% ${cy2}% ${toLoc.coordinates.x}% ${toLoc.coordinates.y}%`}
                          stroke="#9ca3af"
                          strokeWidth="4"
                          fill="none"
                          opacity="0.7"
                        />
                      </>
                    ) : (
                      <path
                        d={`M ${fromLoc.coordinates.x}% ${fromLoc.coordinates.y}% C ${cx1}% ${cy1}% ${cx2}% ${cy2}% ${toLoc.coordinates.x}% ${toLoc.coordinates.y}%`}
                        stroke="#a78bfa"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        fill="none"
                        opacity="0.6"
                      />
                    )}
                  </g>
                )
              })}
          </svg>
          
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          
          {/* Locations */}
          {region.locations && region.locations.length > 0 ? (
            region.locations.map(location => (
            <div
              key={location.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer 
                hover:scale-110 transition-transform z-10 ${getLocationColor(location.type)}`}
              style={{ left: `${location.coordinates.x}%`, top: `${location.coordinates.y}%` }}
              onClick={() => setSelectedLocation(location)}
            >
              <div className="flex flex-col items-center">
                <div className="bg-white dark:bg-gray-800 rounded-full p-1 md:p-1.5 shadow-lg">
                  <span className="text-base md:text-xl">{getLocationIcon(location.type)}</span>
                </div>
                <span className="text-[10px] md:text-xs mt-1 bg-white dark:bg-gray-700 px-1 md:px-2 py-0.5 rounded shadow-md font-medium max-w-[80px] md:max-w-none truncate">
                  {location.name}
                </span>
              </div>
            </div>
          ))
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              この地域には場所が登録されていません
            </div>
          )}
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
            const allLocations = [
              ...worldMapSystem.worldMap.locations,
              ...(worldMapSystem.regions?.flatMap(r => r.locations || []) || [])
            ]
            const fromLoc = allLocations.find(l => l.id === connection.fromLocationId)
            const toLoc = allLocations.find(l => l.id === connection.toLocationId)
            
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
            className={`flex-1 px-2 md:px-4 py-2 rounded-md font-medium transition-colors text-sm md:text-base ${
              selectedView === 'world'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <span className="hidden sm:inline">World View</span>
            <span className="sm:hidden">World</span>
          </button>
          <button
            onClick={() => setSelectedView('region')}
            className={`flex-1 px-2 md:px-4 py-2 rounded-md font-medium transition-colors text-sm md:text-base ${
              selectedView === 'region'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <span className="hidden sm:inline">Region View</span>
            <span className="sm:hidden">Region</span>
          </button>
          <button
            onClick={() => setSelectedView('connections')}
            className={`flex-1 px-2 md:px-4 py-2 rounded-md font-medium transition-colors text-sm md:text-base ${
              selectedView === 'connections'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <span className="hidden sm:inline">Connections</span>
            <span className="sm:hidden">Travel</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLocation(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
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
                    const allLocations = [
                      ...worldMapSystem.worldMap.locations,
                      ...(worldMapSystem.regions?.flatMap(r => r.locations || []) || [])
                    ]
                    const otherLoc = allLocations.find(l => l.id === otherLocId)
                    
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