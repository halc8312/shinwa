import React, { useState, useMemo, useEffect } from 'react'
import { 
  WorldMapSystem, 
  Character, 
  WorldLocation, 
  RegionalLocation, 
  TravelMethod,
  MapConnection,
  TravelTime,
  WorldSettings
} from '@/lib/types'
import { WorldMapService } from '@/lib/services/world-map-service'
import { TransportService } from '@/lib/services/transport-service'

interface TravelSimulatorProps {
  worldMapSystem: WorldMapSystem
  characters: Character[]
  projectId: string
  worldSettings?: WorldSettings
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
  projectId,
  worldSettings,
  onTravelComplete 
}) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
  const [currentLocationId, setCurrentLocationId] = useState<string>('')
  const [destinationId, setDestinationId] = useState<string>('')
  const [travelMethod, setTravelMethod] = useState<string>('')
  const [showWarnings, setShowWarnings] = useState<boolean>(false)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [simulationProgress, setSimulationProgress] = useState<number>(0)
  const [routeInfo, setRouteInfo] = useState<{
    connections: MapConnection[]
    requiresOffRoad: boolean
    totalTime: number
    path: string[]
    alternativeRoute?: {
      method: string
      description: string
      estimatedTime: string
      challenges: string[]
    }
  } | null>(null)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false)

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

  // TransportServiceのインスタンス
  const transportService = useMemo(() => new TransportService(projectId), [projectId])

  // Get available travel methods based on era and world settings
  const availableTravelMethods = useMemo(() => {
    // worldSettingsがある場合はTransportServiceから取得
    if (worldSettings) {
      return transportService.getAvailableTransports(worldSettings)
    }
    
    // デフォルトの移動手段を定義
    const defaultMethods: TravelMethod[] = [
      { type: 'walk', speed: 4, availability: 'common' },
      { type: 'horse', speed: 20, availability: 'common' },
      { type: 'carriage', speed: 10, availability: 'uncommon' },
      { type: 'ship', speed: 15, availability: 'common' }
    ]
    
    const methods: TravelMethod[] = []
    const uniqueMethods = new Set<string>()
    
    // worldMapSystem.travelTimesから移動手段を取得
    if (worldMapSystem.travelTimes && worldMapSystem.travelTimes.length > 0) {
      worldMapSystem.travelTimes.forEach(tt => {
        if (!uniqueMethods.has(tt.travelMethod.type)) {
          methods.push(tt.travelMethod)
          uniqueMethods.add(tt.travelMethod.type)
        }
      })
    }
    
    // 移動手段が見つからない場合はデフォルトを使用
    if (methods.length === 0) {
      return defaultMethods
    }
    
    return methods.sort((a, b) => a.speed - b.speed)
  }, [worldMapSystem, worldSettings, transportService])

  // Find the best route between two locations
  const findRoute = async (fromId: string, toId: string): Promise<{
    connections: MapConnection[]
    requiresOffRoad: boolean
    totalTime: number
    path: string[]
    alternativeRoute?: {
      method: string
      description: string
      estimatedTime: string
      challenges: string[]
    }
  }> => {
    // Simple direct connection search
    const directConnection = worldMapSystem.connections.find(
      conn => (
        (conn.fromLocationId === fromId && conn.toLocationId === toId) ||
        (conn.bidirectional && conn.fromLocationId === toId && conn.toLocationId === fromId)
      )
    )
    
    if (directConnection) {
      const travelTime = worldMapSystem.travelTimes.find(
        tt => tt.connectionId === directConnection.id && tt.travelMethod.type === travelMethod
      )
      return {
        connections: [directConnection],
        requiresOffRoad: false,
        totalTime: travelTime?.baseTime || 60,
        path: [fromId, toId]
      }
    }
    
    // パスファインディングを使用して経路を探す
    const worldMapService = new WorldMapService(projectId)
    const route = await worldMapService.findPathBetweenLocations(
      fromId,
      toId,
      worldMapSystem,
      travelMethod
    )
    
    if (route) {
      // 道なき道を含む場合、代替ルートの提案を取得
      let alternativeRoute = undefined
      if (route.requiresOffRoad && worldSettings) {
        const fromLoc = findLocation(fromId)
        const toLoc = findLocation(toId)
        
        if (fromLoc && toLoc) {
          alternativeRoute = await worldMapService.suggestAlternativeRoute(
            fromLoc.name,
            toLoc.name,
            worldSettings,
            'ファンタジー' // TODO: プロジェクトのジャンルから取得
          ) || undefined
        }
      }
      
      return {
        connections: route.connections,
        requiresOffRoad: route.requiresOffRoad,
        totalTime: route.totalTime,
        path: route.path,
        alternativeRoute
      }
    }
    
    // 経路が見つからない場合
    return {
      connections: [],
      requiresOffRoad: true,
      totalTime: 0,
      path: []
    }
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
  
  // Calculate route when locations change
  useEffect(() => {
    const calculateRoute = async () => {
      if (currentLocationId && destinationId && travelMethod) {
        setIsCalculatingRoute(true)
        try {
          const route = await findRoute(currentLocationId, destinationId)
          setRouteInfo(route)
        } catch (error) {
          console.error('Failed to calculate route:', error)
          setRouteInfo(null)
        } finally {
          setIsCalculatingRoute(false)
        }
      }
    }
    
    calculateRoute()
  }, [currentLocationId, destinationId, travelMethod])

  // Simulate travel
  const simulateTravel = async () => {
    if (!selectedCharacterId || !currentLocationId || !destinationId || !routeInfo) {
      return
    }
    
    setIsSimulating(true)
    setSimulationProgress(0)
    
    if (routeInfo.path.length === 0) {
      alert('この2地点間の経路が見つかりません')
      setIsSimulating(false)
      return
    }
    
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
    if (!routeInfo || routeInfo.path.length === 0) return []
    
    const points: RoutePoint[] = []
    
    // パス上の全ての地点を可視化
    routeInfo.path.forEach(locationId => {
      const loc = findLocation(locationId)
      if (loc) {
        points.push({
          location: loc,
          x: loc.coordinates.x,
          y: loc.coordinates.y
        })
      }
    })
    
    return points
  }, [routeInfo])

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId)
  const currentLocation = findLocation(currentLocationId)
  const destination = findLocation(destinationId)
  const travelTime = routeInfo ? routeInfo.totalTime : 0
  const warnings = routeInfo && routeInfo.connections.length > 0 ? getJourneyWarnings(routeInfo.connections, travelMethod) : []

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
              <option value="">移動手段を選択...</option>
              {availableTravelMethods.map(method => (
                <option key={method.type} value={method.type}>
                  {method.type === 'walk' ? '徒歩' : 
                   method.type === 'horse' ? '馬' :
                   method.type === 'carriage' ? '馬車' :
                   method.type === 'ship' ? '船' :
                   method.type === 'flight' ? '飛行' :
                   method.type === 'teleport' ? 'テレポート' :
                   method.type === 'train' ? '列車' :
                   method.type === 'car' ? '自動車' :
                   method.type === 'airplane' ? '飛行機' :
                   method.type === 'bicycle' ? '自転車' :
                   method.type} 
                  ({method.speed} km/h) - {method.availability === 'common' ? '一般的' : 
                                          method.availability === 'uncommon' ? 'やや珍しい' : 
                                          method.availability === 'rare' ? '珍しい' : 
                                          method.availability}
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
                        
                        // Check if this segment has a road connection
                        const hasRoad = routeInfo && routeInfo.connections.some(conn => {
                          const fromLoc = findLocation(conn.fromLocationId)
                          const toLoc = findLocation(conn.toLocationId)
                          return (
                            (fromLoc?.id === point.location.id && toLoc?.id === nextPoint.location.id) ||
                            (toLoc?.id === point.location.id && fromLoc?.id === nextPoint.location.id && conn.bidirectional)
                          )
                        })
                        
                        return (
                          <line
                            key={index}
                            x1={`${point.x}%`}
                            y1={`${point.y}%`}
                            x2={`${nextPoint.x}%`}
                            y2={`${nextPoint.y}%`}
                            stroke={hasRoad ? "#3b82f6" : "#f59e0b"}
                            strokeWidth={hasRoad ? "3" : "2"}
                            strokeDasharray={hasRoad ? "0" : "5,5"}
                            opacity={hasRoad ? "0.8" : "0.6"}
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
              {isCalculatingRoute ? (
                <div className="mt-4 text-center">
                  <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
                    <span className="sr-only">経路を計算中...</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">経路を計算中...</p>
                </div>
              ) : routeInfo && routeInfo.path.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      推定移動時間:
                    </span>
                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {formatTravelTime(travelTime)}
                    </span>
                  </div>
                  
                  {routeInfo.requiresOffRoad && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                        ⚠️ 道なき道を通る必要があります
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        一部区間で整備された道路がないため、移動時間が長くなる可能性があります。
                      </p>
                    </div>
                  )}
                  
                  {routeInfo.alternativeRoute && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
                        🔮 代替ルートの提案
                      </p>
                      <p className="text-sm text-purple-700 dark:text-purple-300 mb-1">
                        <strong>方法:</strong> {routeInfo.alternativeRoute.method}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                        {routeInfo.alternativeRoute.description}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mb-2">
                        <strong>推定時間:</strong> {routeInfo.alternativeRoute.estimatedTime}
                      </p>
                      {routeInfo.alternativeRoute.challenges.length > 0 && (
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          <strong>予想される困難:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {routeInfo.alternativeRoute.challenges.map((challenge, idx) => (
                              <li key={idx}>{challenge}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      経路の種類:
                    </span>
                    <span className="text-sm">
                      {routeInfo.requiresOffRoad ? '道なき道を含む' : '整備された道路'}
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
              disabled={!currentLocationId || !destinationId || isSimulating || isCalculatingRoute || !routeInfo}
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