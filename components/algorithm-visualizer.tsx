"use client"

import { useState, useEffect } from "react"
import { useSimulation } from "./simulation-context"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, TrendingDown, TrendingUp, CornerDownRight } from "lucide-react"

export default function AlgorithmVisualizer() {
  const { simulationState } = useSimulation()
  const [activeTab, setActiveTab] = useState("pathfinding")
  const [pathfindingData, setPathfindingData] = useState<any[]>([])
  const [optimizationData, setOptimizationData] = useState<any[]>([])
  const [sortingData, setSortingData] = useState<any[]>([])

  useEffect(() => {
    if (!simulationState) return

    // Extract pathfinding data from vehicles
    const paths = simulationState.vehicles
      .filter((v) => !v.completed && v.route.length > 1)
      .slice(0, 5) // Limit to 5 for display
      .map((v) => ({
        id: v.id,
        type: v.type,
        route: v.route,
        current: v.currentPosition,
        next: v.nextPosition,
        rerouted: v.rerouted,
      }))
    setPathfindingData(paths)

    // Extract traffic light optimization data
    const lights = simulationState.trafficLights
      .map((light) => ({
        location: light.location,
        state: light.state,
        remainingTime: light.remainingTime,
        congestionLevel: light.congestionLevel,
        optimizedCycleTime: Math.max(10, Math.min(60, Math.floor(light.congestionLevel / 2))),
      }))
      .sort((a, b) => b.congestionLevel - a.congestionLevel)
      .slice(0, 6) // Limit to 6 for display
    setOptimizationData(lights)

    // Extract sorting data (congestion levels) with recommendations
    const congestionData = [...simulationState.congestionLevels].slice(0, 8).map(([city, level]) => {
      // Add recommendations based on congestion level
      let recommendation = ""
      let action = ""

      if (level > 80) {
        recommendation = "Critical congestion"
        action = "Divert all traffic immediately"
      } else if (level > 60) {
        recommendation = "Heavy congestion"
        action = "Reduce inflow by 50%"
      } else if (level > 40) {
        recommendation = "Moderate congestion"
        action = "Monitor closely"
      } else {
        recommendation = "Normal traffic flow"
        action = "No action needed"
      }

      return {
        city,
        level,
        recommendation,
        action,
        trend: Math.random() > 0.5 ? "up" : "down", // Simulate trend for visualization
      }
    })
    setSortingData(congestionData)
  }, [simulationState])

  if (!simulationState) {
    return <div className="text-center py-8 text-gray-400">No simulation data available</div>
  }

  return (
    <Card className="bg-gray-800 border-gray-700 shadow-xl overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 pt-4">
          <TabsList className="w-full bg-gray-700">
            <TabsTrigger value="pathfinding" className="flex-1 data-[state=active]:bg-emerald-600">
              Smart Routing
            </TabsTrigger>
            <TabsTrigger value="optimization" className="flex-1 data-[state=active]:bg-emerald-600">
              Flow Control
            </TabsTrigger>
            <TabsTrigger value="sorting" className="flex-1 data-[state=active]:bg-emerald-600">
              Hotspot Ranking
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pathfinding" className="p-4">
          <div className="h-[300px] overflow-auto">
            <h3 className="text-xl font-semibold mb-4">Intelligent Route Planning</h3>
            <p className="text-gray-400 mb-4">
              Dijkstra's algorithm optimizes vehicle paths based on distance, congestion, and accidents
            </p>

            {pathfindingData.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No active routes to display</div>
            ) : (
              <div className="space-y-4">
                {pathfindingData.map((path, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">
                        {path.id} ({path.type})
                      </span>
                      {path.rerouted && <Badge className="bg-amber-600">Rerouted</Badge>}
                    </div>

                    <div className="relative mt-4">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gray-600"></div>
                      <div className="flex justify-between relative">
                        {path.route.map((city: string, i: number) => (
                          <div key={i} className="flex flex-col items-center">
                            <div
                              className={`w-4 h-4 rounded-full ${
                                city === path.current
                                  ? "bg-blue-500"
                                  : i < path.route.indexOf(path.current)
                                    ? "bg-green-500"
                                    : "bg-gray-500"
                              } z-10`}
                            />
                            <span className="text-xs mt-1 text-gray-300">{city}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="p-4">
          <div className="h-[300px] overflow-auto">
            <h3 className="text-xl font-semibold mb-4">Traffic Flow Optimization</h3>
            <p className="text-gray-400 mb-4">Adaptive signal timing based on real-time congestion levels</p>

            {optimizationData.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No optimization data available</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {optimizationData.map((light, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{light.location}</span>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          light.state === "RED"
                            ? "bg-red-500"
                            : light.state === "YELLOW"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                      />
                    </div>

                    <div className="space-y-2 mt-3">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Congestion:</span>
                        <span>{Math.round(light.congestionLevel)}%</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            light.congestionLevel < 30
                              ? "bg-green-500"
                              : light.congestionLevel < 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${Math.round(light.congestionLevel)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>Optimized Cycle:</span>
                        <span>{light.optimizedCycleTime}s</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-emerald-500"
                          style={{ width: `${(light.optimizedCycleTime / 60) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sorting" className="p-4">
          <div className="h-[300px] overflow-auto">
            <h3 className="text-xl font-semibold mb-4">Traffic Hotspot Analysis</h3>
            <p className="text-gray-400 mb-4">Prioritized action recommendations based on congestion severity</p>

            {sortingData.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No hotspot data available</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {sortingData.map((item, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div
                            className={`w-2 h-full mr-2 rounded-full ${
                              item.level < 30 ? "bg-green-500" : item.level < 60 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                          ></div>
                          <span className="font-medium">{item.city}</span>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`text-sm ${
                              item.level < 30 ? "text-green-500" : item.level < 60 ? "text-yellow-500" : "text-red-500"
                            }`}
                          >
                            {Math.round(item.level)}%
                          </span>
                          {item.trend === "up" ? (
                            <TrendingUp className="h-4 w-4 ml-1 text-red-400" />
                          ) : (
                            <TrendingDown className="h-4 w-4 ml-1 text-green-400" />
                          )}
                        </div>
                      </div>

                      <div className="mt-2 text-sm">
                        <div className="flex items-start">
                          <AlertTriangle
                            className={`h-4 w-4 mr-1 mt-0.5 ${item.level > 60 ? "text-red-400" : "text-yellow-400"}`}
                          />
                          <span className="text-gray-300">{item.recommendation}</span>
                        </div>
                        <div className="flex items-start mt-1">
                          <CornerDownRight className="h-4 w-4 mr-1 mt-0.5 text-blue-400" />
                          <span className="text-gray-400">{item.action}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
