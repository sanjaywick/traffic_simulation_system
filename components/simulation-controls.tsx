"use client"

import { useState } from "react"
import { useSimulation } from "./simulation-context"
import { VehicleType } from "@/lib/simulation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Play, Pause, Plus, Car, Truck, Bus, Bike, AlertTriangle } from "lucide-react"

export default function SimulationControls() {
  const {
    isRunning,
    simulationSpeed,
    vehicleInflowRate,
    autoGenerateVehicles,
    cities,
    roadNetwork,
    toggleSimulation,
    setSimulationSpeed,
    setVehicleInflowRate,
    toggleAutoGenerateVehicles,
    addVehicle,
    addCongestion,
    addAccident,
    clearAccident,
  } = useSimulation()

  const [vehicleId, setVehicleId] = useState("")
  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.CAR)
  const [startCity, setStartCity] = useState("")
  const [endCity, setEndCity] = useState("")
  const [activeTab, setActiveTab] = useState("vehicle")

  // Congestion/accident controls
  const [congestionFromCity, setCongestionFromCity] = useState("")
  const [congestionToCity, setCongestionToCity] = useState("")
  const [congestionLevel, setCongestionLevel] = useState(50)
  const [accidentSeverity, setAccidentSeverity] = useState(70)

  const handleAddVehicle = () => {
    if (!vehicleId || !startCity || !endCity || startCity === endCity) return

    addVehicle(vehicleId, vehicleType, startCity, endCity)
    setVehicleId("")
  }

  const handleAddCongestion = () => {
    if (!congestionFromCity || !congestionToCity) return

    addCongestion(congestionFromCity, congestionToCity, congestionLevel)
  }

  const handleAddAccident = () => {
    if (!congestionFromCity || !congestionToCity) return

    addAccident(congestionFromCity, congestionToCity, accidentSeverity)
  }

  const handleClearAccident = () => {
    if (!congestionFromCity || !congestionToCity) return

    clearAccident(congestionFromCity, congestionToCity)
  }

  // Set default cities when they become available
  useState(() => {
    if (cities && cities.length > 0 && !startCity && !endCity) {
      if (cities.length >= 2) {
        setStartCity(cities[0].name)
        setEndCity(cities[1].name)
        setCongestionFromCity(cities[0].name)
        setCongestionToCity(cities[1].name)
      } else if (cities.length === 1) {
        setStartCity(cities[0].name)
        setCongestionFromCity(cities[0].name)
      }
    }
  })

  return (
    <Card className="bg-gray-800 border-gray-700 shadow-xl">
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-4">Simulation Controls</h3>

        <div className="space-y-6">
          {/* Simulation controls */}
          <div className="flex items-center justify-between">
            <Button
              onClick={toggleSimulation}
              variant="outline"
              className="bg-gray-700 hover:bg-gray-600 border-gray-600"
            >
              {isRunning ? (
                <>
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" /> Start
                </>
              )}
            </Button>

            <div className="flex items-center space-x-2 flex-1 ml-4">
              <span className="text-sm text-gray-400">Speed:</span>
              <Slider
                value={[simulationSpeed]}
                min={0.5}
                max={5}
                step={0.5}
                onValueChange={(value) => setSimulationSpeed(value[0])}
                className="flex-1"
              />
              <span className="text-sm font-medium w-8">{simulationSpeed}x</span>
            </div>
          </div>

          {/* Auto-generate vehicles */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-generate">Auto-generate vehicles</Label>
              <p className="text-sm text-gray-400">Randomly create vehicles between cities</p>
            </div>
            <Switch id="auto-generate" checked={autoGenerateVehicles} onCheckedChange={toggleAutoGenerateVehicles} />
          </div>

          {/* Vehicle inflow rate slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-gray-400">Vehicle Inflow Rate:</label>
              <span className="text-sm font-medium">{vehicleInflowRate} per min</span>
            </div>
            <Slider
              value={[vehicleInflowRate]}
              min={1}
              max={20}
              step={1}
              onValueChange={(value) => setVehicleInflowRate(value[0])}
              className="w-full"
              disabled={!autoGenerateVehicles}
            />
          </div>

          {/* Tabs for vehicle/congestion/accident controls */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full bg-gray-700">
              <TabsTrigger value="vehicle" className="flex-1 data-[state=active]:bg-emerald-600">
                Add Vehicle
              </TabsTrigger>
              <TabsTrigger value="congestion" className="flex-1 data-[state=active]:bg-emerald-600">
                Congestion
              </TabsTrigger>
              <TabsTrigger value="accident" className="flex-1 data-[state=active]:bg-emerald-600">
                Accident
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vehicle" className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    placeholder="Vehicle ID"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="bg-gray-700 border-gray-600"
                  />
                </div>

                <div>
                  <Select value={vehicleType} onValueChange={(value) => setVehicleType(value as VehicleType)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600">
                      <SelectValue placeholder="Vehicle Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={VehicleType.CAR}>
                        <div className="flex items-center">
                          <Car className="mr-2 h-4 w-4 text-blue-400" />
                          Car
                        </div>
                      </SelectItem>
                      <SelectItem value={VehicleType.TRUCK}>
                        <div className="flex items-center">
                          <Truck className="mr-2 h-4 w-4 text-red-400" />
                          Truck
                        </div>
                      </SelectItem>
                      <SelectItem value={VehicleType.BUS}>
                        <div className="flex items-center">
                          <Bus className="mr-2 h-4 w-4 text-amber-400" />
                          Bus
                        </div>
                      </SelectItem>
                      <SelectItem value={VehicleType.MOTORCYCLE}>
                        <div className="flex items-center">
                          <Bike className="mr-2 h-4 w-4 text-green-400" />
                          Motorcycle
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Select value={startCity} onValueChange={setStartCity}>
                    <SelectTrigger className="bg-gray-700 border-gray-600">
                      <SelectValue placeholder="Start City" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={`start-${city.name}`} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select value={endCity} onValueChange={setEndCity}>
                    <SelectTrigger className="bg-gray-700 border-gray-600">
                      <SelectValue placeholder="Destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={`end-${city.name}`} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleAddVehicle}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={!vehicleId || !startCity || !endCity || startCity === endCity}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Vehicle
              </Button>
            </TabsContent>

            <TabsContent value="congestion" className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Select value={congestionFromCity} onValueChange={setCongestionFromCity}>
                    <SelectTrigger className="bg-gray-700 border-gray-600">
                      <SelectValue placeholder="From City" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={`congestion-from-${city.name}`} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select value={congestionToCity} onValueChange={setCongestionToCity}>
                    <SelectTrigger className="bg-gray-700 border-gray-600">
                      <SelectValue placeholder="To City" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={`congestion-to-${city.name}`} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Congestion Level:</label>
                  <span className="text-sm font-medium">{congestionLevel}%</span>
                </div>
                <Slider
                  value={[congestionLevel]}
                  min={10}
                  max={100}
                  step={5}
                  onValueChange={(value) => setCongestionLevel(value[0])}
                  className="w-full"
                />
              </div>

              <Button
                onClick={handleAddCongestion}
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={
                  !congestionFromCity ||
                  !congestionToCity ||
                  congestionFromCity === congestionToCity ||
                  !roadNetwork?.[congestionFromCity]?.[congestionToCity]
                }
              >
                Add Congestion
              </Button>
            </TabsContent>

            <TabsContent value="accident" className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Select value={congestionFromCity} onValueChange={setCongestionFromCity}>
                    <SelectTrigger className="bg-gray-700 border-gray-600">
                      <SelectValue placeholder="From City" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={`accident-from-${city.name}`} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select value={congestionToCity} onValueChange={setCongestionToCity}>
                    <SelectTrigger className="bg-gray-700 border-gray-600">
                      <SelectValue placeholder="To City" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={`accident-to-${city.name}`} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Accident Severity:</label>
                  <span className="text-sm font-medium">{accidentSeverity}%</span>
                </div>
                <Slider
                  value={[accidentSeverity]}
                  min={30}
                  max={100}
                  step={5}
                  onValueChange={(value) => setAccidentSeverity(value[0])}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleAddAccident}
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={
                    !congestionFromCity ||
                    !congestionToCity ||
                    congestionFromCity === congestionToCity ||
                    !roadNetwork?.[congestionFromCity]?.[congestionToCity]
                  }
                >
                  <AlertTriangle className="mr-2 h-4 w-4" /> Add Accident
                </Button>

                <Button
                  onClick={handleClearAccident}
                  variant="outline"
                  className="w-full bg-gray-700 hover:bg-gray-600 border-gray-600"
                  disabled={
                    !congestionFromCity ||
                    !congestionToCity ||
                    congestionFromCity === congestionToCity ||
                    !roadNetwork?.[congestionFromCity]?.[congestionToCity]
                  }
                >
                  Clear Accident
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Card>
  )
}
