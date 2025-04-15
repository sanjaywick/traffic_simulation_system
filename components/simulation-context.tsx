"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { VehicleType, SimulationState, CityInfo, RoadNetwork } from "@/lib/simulation"

interface SimulationContextType {
  isInitialized: boolean
  isRunning: boolean
  simulationState: SimulationState | null
  simulationSpeed: number
  vehicleInflowRate: number
  autoGenerateVehicles: boolean
  cities: CityInfo[]
  roadNetwork: RoadNetwork | null
  initialize: () => Promise<void>
  addVehicle: (id: string, type: VehicleType, start: string, end: string) => Promise<void>
  toggleSimulation: () => void
  setSimulationSpeed: (speed: number) => void
  setVehicleInflowRate: (rate: number) => Promise<void>
  toggleAutoGenerateVehicles: () => Promise<void>
  addCongestion: (fromCity: string, toCity: string, level: number) => Promise<void>
  addAccident: (fromCity: string, toCity: string, severity: number) => Promise<void>
  clearAccident: (fromCity: string, toCity: string) => Promise<void>
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined)

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null)
  const [simulationSpeed, setSimulationSpeed] = useState(1)
  const [vehicleInflowRate, setVehicleInflowRate] = useState(5)
  const [autoGenerateVehicles, setAutoGenerateVehicles] = useState(false)
  const [cities, setCities] = useState<CityInfo[]>([])
  const [roadNetwork, setRoadNetwork] = useState<RoadNetwork | null>(null)

  const initialize = async () => {
    try {
      const response = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initialize" }),
      })

      if (response.ok) {
        const data = await response.json()
        setCities(data.data.cities)
        setRoadNetwork(data.data.roadNetwork)
        setIsInitialized(true)
      }
    } catch (error) {
      console.error("Failed to initialize simulation:", error)
    }
  }

  const addVehicle = async (id: string, type: VehicleType, start: string, end: string) => {
    try {
      await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addVehicle",
          params: { vehicleId: id, vehicleType: type, start, destination: end },
        }),
      })
    } catch (error) {
      console.error("Failed to add vehicle:", error)
    }
  }

  const updateVehicleInflowRate = async (rate: number) => {
    try {
      await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setVehicleInflowRate",
          params: { rate },
        }),
      })
      setVehicleInflowRate(rate)
    } catch (error) {
      console.error("Failed to update inflow rate:", error)
    }
  }

  const toggleAutoVehicleGeneration = async () => {
    const newValue = !autoGenerateVehicles
    try {
      await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setAutoGenerateVehicles",
          params: { enabled: newValue },
        }),
      })
      setAutoGenerateVehicles(newValue)
    } catch (error) {
      console.error("Failed to toggle auto vehicle generation:", error)
    }
  }

  const addCongestionToRoad = async (fromCity: string, toCity: string, level: number) => {
    try {
      await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addCongestion",
          params: { fromCity, toCity, level },
        }),
      })
    } catch (error) {
      console.error("Failed to add congestion:", error)
    }
  }

  const addAccidentToRoad = async (fromCity: string, toCity: string, severity: number) => {
    try {
      await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addAccident",
          params: { fromCity, toCity, severity },
        }),
      })
    } catch (error) {
      console.error("Failed to add accident:", error)
    }
  }

  const clearAccidentFromRoad = async (fromCity: string, toCity: string) => {
    try {
      await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clearAccident",
          params: { fromCity, toCity },
        }),
      })
    } catch (error) {
      console.error("Failed to clear accident:", error)
    }
  }

  const runSimulationStep = async () => {
    if (!isInitialized || !isRunning) return

    try {
      const response = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run",
          params: { time: 10 * simulationSpeed },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSimulationState(data.data)
      }
    } catch (error) {
      console.error("Failed to run simulation step:", error)
    }
  }

  const toggleSimulation = () => {
    setIsRunning((prev) => !prev)
  }

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning) {
      interval = setInterval(runSimulationStep, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, simulationSpeed])

  return (
    <SimulationContext.Provider
      value={{
        isInitialized,
        isRunning,
        simulationState,
        simulationSpeed,
        vehicleInflowRate,
        autoGenerateVehicles,
        cities,
        roadNetwork,
        initialize,
        addVehicle,
        toggleSimulation,
        setSimulationSpeed,
        setVehicleInflowRate: updateVehicleInflowRate,
        toggleAutoGenerateVehicles: toggleAutoVehicleGeneration,
        addCongestion: addCongestionToRoad,
        addAccident: addAccidentToRoad,
        clearAccident: clearAccidentFromRoad,
      }}
    >
      {children}
    </SimulationContext.Provider>
  )
}

export function useSimulation() {
  const context = useContext(SimulationContext)
  if (context === undefined) {
    throw new Error("useSimulation must be used within a SimulationProvider")
  }
  return context
}
