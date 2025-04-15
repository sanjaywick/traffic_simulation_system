import { type NextRequest, NextResponse } from "next/server"
import { TrafficSimulation } from "@/lib/simulation"

// Global simulation instance
let simulation: TrafficSimulation | null = null

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, params } = body

    if (action === "initialize") {
      simulation = new TrafficSimulation()
      return NextResponse.json({
        success: true,
        message: "Simulation initialized",
        data: {
          cities: simulation.getCities(),
          roadNetwork: simulation.getRoadNetwork(),
        },
      })
    }

    if (!simulation) {
      return NextResponse.json({ success: false, message: "Simulation not initialized" }, { status: 400 })
    }

    switch (action) {
      case "addVehicle":
        const { vehicleId, vehicleType, start, destination } = params
        simulation.addVehicle(vehicleId, vehicleType, start, destination)
        return NextResponse.json({
          success: true,
          message: `Vehicle ${vehicleId} added to simulation`,
        })

      case "run":
        const { time } = params
        const results = simulation.runStep(time || 10)
        return NextResponse.json({ success: true, data: results })

      case "getState":
        const state = simulation.getState()
        return NextResponse.json({ success: true, data: state })

      case "setVehicleInflowRate":
        const { rate } = params
        simulation.setVehicleInflowRate(rate)
        return NextResponse.json({
          success: true,
          message: `Vehicle inflow rate set to ${rate} vehicles per minute`,
        })

      case "setAutoGenerateVehicles":
        const { enabled } = params
        simulation.setAutoGenerateVehicles(enabled)
        return NextResponse.json({
          success: true,
          message: `Auto vehicle generation ${enabled ? "enabled" : "disabled"}`,
        })

      case "addCongestion":
        const { fromCity, toCity, level } = params
        const success = simulation.addCongestion(fromCity, toCity, level)
        return NextResponse.json({
          success,
          message: success
            ? `Congestion added to route ${fromCity} to ${toCity}`
            : `Failed to add congestion to route ${fromCity} to ${toCity}`,
        })

      case "addAccident":
        const { fromCity: accFromCity, toCity: accToCity, severity } = params
        const accSuccess = simulation.addAccident(accFromCity, accToCity, severity)
        return NextResponse.json({
          success: accSuccess,
          message: accSuccess
            ? `Accident added to route ${accFromCity} to ${accToCity}`
            : `Failed to add accident to route ${accFromCity} to ${accToCity}`,
        })

      case "clearAccident":
        const { fromCity: clearFromCity, toCity: clearToCity } = params
        const clearSuccess = simulation.clearAccident(clearFromCity, clearToCity)
        return NextResponse.json({
          success: clearSuccess,
          message: clearSuccess
            ? `Accident cleared from route ${clearFromCity} to ${clearToCity}`
            : `Failed to clear accident from route ${clearFromCity} to ${clearToCity}`,
        })

      default:
        return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Simulation error:", error)
    return NextResponse.json({ success: false, message: "Server error", error: String(error) }, { status: 500 })
  }
}
