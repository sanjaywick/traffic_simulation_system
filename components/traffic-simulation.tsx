"use client"

import { useState } from "react"
import { useSimulation } from "./simulation-context"
import SimulationMap from "./simulation-map"
import SimulationControls from "./simulation-controls"
import VehicleList from "./vehicle-list"
import CongestionChart from "./congestion-chart"
import AlgorithmVisualizer from "./algorithm-visualizer"
import LogsButton from "./logs-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Clock, Car, CheckCircle, BarChart } from "lucide-react"

export default function TrafficSimulation() {
  const { isInitialized, isRunning, simulationState } = useSimulation()
  const [activeTab, setActiveTab] = useState("vehicles")

  return (
    <div className="space-y-6">
      {!isInitialized ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Initializing Simulation</h2>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Map is always visible at the top */}
          <Card className="bg-gray-800 border-gray-700 shadow-xl overflow-hidden">
            <div className="h-[600px] relative">
              <SimulationMap />
              <div className="absolute top-4 right-4">
                <LogsButton />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Controls on the left */}
            <div>
              <SimulationControls />
            </div>

            {/* Tabs for vehicles, statistics, and congestion on the right */}
            <div className="lg:col-span-2">
              <Card className="bg-gray-800 border-gray-700 shadow-xl overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="px-4 pt-4">
                    <TabsList className="w-full bg-gray-700">
                      <TabsTrigger value="vehicles" className="flex-1 data-[state=active]:bg-emerald-600">
                        <Car className="mr-2 h-4 w-4" /> Vehicles
                      </TabsTrigger>
                      <TabsTrigger value="statistics" className="flex-1 data-[state=active]:bg-emerald-600">
                        <Clock className="mr-2 h-4 w-4" /> Statistics
                      </TabsTrigger>
                      <TabsTrigger value="congestion" className="flex-1 data-[state=active]:bg-emerald-600">
                        <BarChart className="mr-2 h-4 w-4" /> Congestion
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="vehicles" className="p-4">
                    <div className="h-[400px] overflow-auto">
                      <h3 className="text-xl font-semibold mb-4">Vehicles</h3>
                      {simulationState && <VehicleList vehicles={simulationState.vehicles} />}
                    </div>
                  </TabsContent>

                  <TabsContent value="statistics" className="p-4">
                    <div className="h-[400px] overflow-auto">
                      <h3 className="text-xl font-semibold mb-4">Simulation Statistics</h3>
                      {simulationState && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <StatCard
                              title="Simulation Time"
                              value={`${Math.floor(simulationState.time / 60)}h ${Math.round(simulationState.time % 60)}m`}
                              icon="clock"
                            />
                            <StatCard
                              title="Active Vehicles"
                              value={simulationState.activeVehicleCount.toString()}
                              icon="car"
                            />
                            <StatCard
                              title="Completed Trips"
                              value={simulationState.completedVehicleCount.toString()}
                              icon="check-circle"
                            />
                            <StatCard
                              title="Avg. Travel Time"
                              value={`${Math.floor(simulationState.averageTravelTime / 60)}h ${Math.round(simulationState.averageTravelTime % 60)}m`}
                              icon="bar-chart"
                            />

                            {/* Add Global Equilibrium Status card */}
                            <StatCard
                              title="Equilibrium Status"
                              value={getEquilibriumStatus(simulationState)}
                              icon="equilibrium"
                            />
                          </div>

                          <h4 className="text-lg font-semibold mt-6 mb-3">City Congestion Levels</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {simulationState.trafficLights.map((light) => (
                              <div key={light.location} className="bg-gray-700 rounded-lg p-3">
                                <div className="flex justify-between items-center">
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
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs text-gray-400 mb-1">
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
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="congestion" className="p-4">
                    <div className="h-[400px]">
                      <h3 className="text-xl font-semibold mb-4">Congestion Levels</h3>
                      {simulationState && <CongestionChart data={simulationState.trafficLights} />}
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
          {/* Algorithm Visualizer */}
          <AlgorithmVisualizer />
        </>
      )}
    </div>
  )
}

// Add the equilibrium icon to the StatCard function
function StatCard({ title, value, icon }: { title: string; value: string | JSX.Element; icon: string }) {
  return (
    <div className="bg-gray-700 rounded-lg p-4 flex items-center">
      <div className="mr-4">
        {icon === "clock" && (
          <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
            <Clock className="h-5 w-5" />
          </div>
        )}
        {icon === "car" && (
          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500">
            <Car className="h-5 w-5" />
          </div>
        )}
        {icon === "check-circle" && (
          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-500">
            <CheckCircle className="h-5 w-5" />
          </div>
        )}
        {icon === "bar-chart" && (
          <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500">
            <BarChart className="h-5 w-5" />
          </div>
        )}
        {icon === "equilibrium" && (
          <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-500">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        {typeof value === "string" ? <p className="text-2xl font-bold">{value}</p> : value}
      </div>
    </div>
  )
}

// Add the function to determine equilibrium status
function getEquilibriumStatus(state: any) {
  // For display purposes only - simulate equilibrium status
  const hasConflict = state.vehicles.some((v) => !v.completed && v.rerouted)

  if (hasConflict) {
    // Find a vehicle with conflict for display
    const conflictVehicle = state.vehicles.find((v) => !v.completed && v.rerouted)
    return (
      <div className="flex flex-col">
        <div className="flex items-center">
          <span className="text-red-500 mr-1">❌</span> Not Achieved
        </div>
        {conflictVehicle && <div className="text-xs text-red-400 mt-1">Conflict: {conflictVehicle.id}</div>}
      </div>
    )
  }

  return (
    <div className="flex items-center">
      <span className="text-green-500 mr-1">✅</span> Achieved
    </div>
  )
}
