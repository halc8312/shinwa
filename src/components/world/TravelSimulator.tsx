import React, { useState, useMemo, useEffect } from 'react'
import { 
  WorldMapSystem, 
  Character, 
  WorldLocation, 
  RegionalLocation, 
  TravelMethod,
  MapConnection,
  TravelTime
} from '@/lib/types'
import { WorldMapService } from '@/lib/services/world-map-service'

interface TravelSimulatorProps {
  worldMapSystem: WorldMapSystem
  characters: Character[]
  onTravelComplete?: (characterId: string, locationId: string) => void
}

interface RoutePoint {
  location: WorldLocation | RegionalLocation
  x: number
  y: number
}

const TravelSimulator: React.FC<TravelSimulatorProps> = ({ 
  worldMapSystem, 
  characters, 
  onTravelComplete 
}) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
  const [currentLocationId, setCurrentLocationId] = useState<string>('')
  const [destinationId, setDestinationId] = useState<string>('')
  const [travelMethod, setTravelMethod] = useState<string>('walk')
  const [showWarnings, setShowWarnings] = useState<boolean>(false)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [simulationProgress, setSimulationProgress] = useState<number>(0)

  // Get all locations from world map and regions
  const allLocations = useMemo(() => {
    const locations: Array<WorldLocation | RegionalLocation> = [
      ...worldMapSystem.worldMap.locations
    ]
    
    worldMapSystem.regions.forEach(region => {
      locations.push(...region.locations)
    })
    
    return locations
  }, [worldMapSystem])

  // Find location by ID
  const findLocation = (locationId: string) => {
    return allLocations.find(loc => loc.id === locationId)
  }

  // Get available travel methods based on era
  const availableTravelMethods = useMemo(() => {
    const methods: TravelMethod[] = []
    const uniqueMethods = new Set<string>()
    
    worldMapSystem.travelTimes.forEach(tt => {
      if (!uniqueMethods.has(tt.travelMethod.type)) {
        methods.push(tt.travelMethod)
        uniqueMethods.add(tt.travelMethod.type)
      }
    })
    
    return methods.sort((a, b) => a.speed - b.speed)
  }, [worldMapSystem])

  // Find the best route between two locations
  const findRoute = (fromId: string, toId: string): MapConnection[] => {
    // Simple direct connection search
    const directConnection = worldMapSystem.connections.find(
      conn => (
        (conn.fromLocationId === fromId && conn.toLocationId === toId) ||
        (conn.bidirectional && conn.fromLocationId === toId && conn.toLocationId === fromId)
      )
    )
    
    if (directConnection) {
      return [directConnection]
    }
    
    // TODO: Implement pathfinding algorithm for multi-hop routes
    return []
  }

  // Calculate total travel time
  const calculateTravelTime = (route: MapConnection[], method: string) => {
    let totalTime = 0
    
    route.forEach(connection => {
      const travelTime = worldMapSystem.travelTimes.find(
        tt => tt.connectionId === connection.id && tt.travelMethod.type === method
      )
      if (travelTime) {
        totalTime += travelTime.baseTime
      }
    })
    
    return totalTime
  }

  // Format time display
  const formatTravelTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return `${days}日 ${remainingHours}時間 ${mins}分`
    }
    
    return hours > 0 ? `${hours}時間 ${mins}分` : `${mins}分`
  }

  // Get warnings for the journey
  const getJourneyWarnings = (route: MapConnection[], method: string) => {
    const warnings: string[] = []
    
    route.forEach(connection => {
      if (connection.difficulty === 'dangerous') {
        warnings.push(`${findLocation(connection.fromLocationId)?.name}から${findLocation(connection.toLocationId)?.name}への経路は危険です`)
      }
      
      if (connection.difficulty === 'difficult' && method === 'carriage') {
        warnings.push(`馬車での移動は困難な地形があります`)
      }
      
      const travelTime = worldMapSystem.travelTimes.find(
        tt => tt.connectionId === connection.id && tt.travelMethod.type === method
      )
      
      travelTime?.conditions.forEach(condition => {
        if (condition.type === 'weather') {
          warnings.push(`天候による影響: ${condition.description}`)
        }
      })
    })
    
    return warnings
  }

  // Handle character selection
  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacterId(characterId)
    // Set a default current location (first major city)
    const defaultLocation = worldMapSystem.worldMap.locations.find(
      loc => loc.type === 'capital' || loc.type === 'major_city'
    )
    if (defaultLocation) {
      setCurrentLocationId(defaultLocation.id)
    }
  }

  // Simulate travel
  const simulateTravel = async () => {
    if (!selectedCharacterId || !currentLocationId || !destinationId) {
      return
    }
    
    setIsSimulating(true)
    setSimulationProgress(0)
    
    // Find route
    const route = findRoute(currentLocationId, destinationId)
    if (route.length === 0) {
      alert('この2地点間の経路が見つかりません')
      setIsSimulating(false)
      return
    }
    
    // Calculate travel time
    const travelTime = calculateTravelTime(route, travelMethod)
    
    // Simulate progress
    const interval = setInterval(() => {
      setSimulationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 5
      })
    }, 100)
    
    // Wait for simulation to complete
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSimulating(false)
    setCurrentLocationId(destinationId)
    
    if (onTravelComplete) {
      onTravelComplete(selectedCharacterId, destinationId)
    }
  }

  // Get route visualization data
  const routeVisualization = useMemo(() => {
    if (!currentLocationId || !destinationId) return []
    
    const route = findRoute(currentLocationId, destinationId)
    const points: RoutePoint[] = []
    
    route.forEach(connection => {
      const fromLoc = findLocation(connection.fromLocationId)
      const toLoc = findLocation(connection.toLocationId)
      
      if (fromLoc && toLoc) {
        if (points.length === 0) {
          points.push({
            location: fromLoc,
            x: fromLoc.coordinates.x,
            y: fromLoc.coordinates.y
          })
        }
        points.push({
          location: toLoc,
          x: toLoc.coordinates.x,
          y: toLoc.coordinates.y
        })
      }
    })
    
    return points
  }, [currentLocationId, destinationId])

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId)
  const currentLocation = findLocation(currentLocationId)
  const destination = findLocation(destinationId)
  const route = currentLocationId && destinationId ? findRoute(currentLocationId, destinationId) : []
  const travelTime = route.length > 0 ? calculateTravelTime(route, travelMethod) : 0
  const warnings = route.length > 0 ? getJourneyWarnings(route, travelMethod) : []

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        旅行シミュレーター
      </h2>

      {/* Character Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          キャラクター選択
        </label>
        <select
          value={selectedCharacterId}
          onChange={(e) => handleCharacterSelect(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
            focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <option value="">キャラクターを選択...</option>
          {characters.map(character => (
            <option key={character.id} value={character.id}>
              {character.name} ({character.role})
            </option>
          ))}
        </select>
      </div>

      {selectedCharacter && (
        <>
          {/* Current Location */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              現在地
            </label>
            <select
              value={currentLocationId}
              onChange={(e) => setCurrentLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">場所を選択...</option>
              {allLocations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </select>
            {currentLocation && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentLocation.description}
              </p>
            )}
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              目的地
            </label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              disabled={!currentLocationId}
            >
              <option value="">目的地を選択...</option>
              {allLocations
                .filter(loc => loc.id !== currentLocationId)
                .map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.type})
                  </option>
                ))}
            </select>
            {destination && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {destination.description}
              </p>
            )}
          </div>

          {/* Travel Method */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              移動手段
            </label>
            <select
              value={travelMethod}
              onChange={(e) => setTravelMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              disabled={!currentLocationId || !destinationId}
            >
              {availableTravelMethods.map(method => (
                <option key={method.type} value={method.type}>
                  {method.type === 'walk' ? '徒歩' : 
                   method.type === 'horse' ? '馬' :
                   method.type === 'carriage' ? '馬車' :
                   method.type === 'ship' ? '船' :
                   method.type === 'flight' ? '飛行' :
                   method.type} 
                  ({method.speed} km/h) - {method.availability}
                </option>
              ))}
            </select>
          </div>

          {/* Route Visualization */}
          {currentLocationId && destinationId && (
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                経路ビジュアライゼーション
              </h3>
              <div className="relative h-64 bg-blue-50 dark:bg-gray-700 rounded overflow-hidden">
                {/* Simple route visualization */}
                <svg className="absolute inset-0 w-full h-full">
                  {routeVisualization.length > 1 && (
                    <>
                      {/* Draw route lines */}
                      {routeVisualization.slice(0, -1).map((point, index) => {
                        const nextPoint = routeVisualization[index + 1]
                        return (
                          <line
                            key={index}
                            x1={`${point.x}%`}
                            y1={`${point.y}%`}
                            x2={`${nextPoint.x}%`}
                            y2={`${nextPoint.y}%`}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            className="text-blue-500 dark:text-blue-400"
                          />
                        )
                      })}
                      
                      {/* Draw location points */}
                      {routeVisualization.map((point, index) => (
                        <g key={point.location.id}>
                          <circle
                            cx={`${point.x}%`}
                            cy={`${point.y}%`}
                            r="8"
                            fill="currentColor"
                            className={index === 0 ? 'text-green-500' : 
                                     index === routeVisualization.length - 1 ? 'text-red-500' : 
                                     'text-blue-500'}
                          />
                          <text
                            x={`${point.x}%`}
                            y={`${point.y - 3}%`}
                            textAnchor="middle"
                            fontSize="12"
                            fill="currentColor"
                            className="text-gray-700 dark:text-gray-300"
                          >
                            {point.location.name}
                          </text>
                        </g>
                      ))}
                    </>
                  )}
                </svg>
              </div>
              
              {/* Travel Information */}
              {route.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      推定移動時間:
                    </span>
                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {formatTravelTime(travelTime)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      経路の難易度:
                    </span>
                    <span className="text-sm">
                      {route[0]?.difficulty === 'easy' ? '簡単' :
                       route[0]?.difficulty === 'moderate' ? '普通' :
                       route[0]?.difficulty === 'difficult' ? '困難' :
                       '危険'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                ⚠️ 旅行に関する警告
              </h3>
              <ul className="space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Simulate Button */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => {
                setCurrentLocationId('')
                setDestinationId('')
                setSimulationProgress(0)
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 
                rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              disabled={isSimulating}
            >
              リセット
            </button>
            
            <button
              onClick={simulateTravel}
              disabled={!currentLocationId || !destinationId || isSimulating || route.length === 0}
              className="px-6 py-2 bg-blue-500 text-white rounded-md 
                hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed
                transition-colors flex items-center space-x-2"
            >
              {isSimulating ? (
                <>
                  <span className="animate-spin">⚡</span>
                  <span>移動中...</span>
                </>
              ) : (
                <>
                  <span>🚶</span>
                  <span>旅行を開始</span>
                </>
              )}
            </button>
          </div>

          {/* Progress Bar */}
          {isSimulating && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${simulationProgress}%` }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default TravelSimulator