import { Suspense } from "react"
import TrafficSimulation from "@/components/traffic-simulation"
import { SimulationProvider } from "@/components/simulation-context"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2 text-center">Traffic Simulation System</h1>
        <p className="text-gray-300 text-center mb-8">Real-time visualization of traffic patterns and congestion</p>

        <SimulationProvider>
          <Suspense fallback={<div className="text-center py-20">Loading simulation...</div>}>
            <TrafficSimulation />
          </Suspense>
        </SimulationProvider>
      </div>
    </main>
  )
}
