"use client"

import { useRef, useEffect } from "react"
import { useSimulation } from "./simulation-context"

// Vehicle colors
const VEHICLE_COLORS: Record<string, string> = {
  TRUCK: "#e74c3c",
  CAR: "#3498db",
  BUS: "#f39c12",
  MOTORCYCLE: "#2ecc71",
}

export default function SimulationMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { simulationState } = useSimulation()

  useEffect(() => {
    if (!canvasRef.current || !simulationState) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw background
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    ctx.strokeStyle = "#334155"
    ctx.lineWidth = 1

    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Create a map of city positions
    const cityPositions: Record<string, { x: number; y: number }> = {}
    simulationState.cities.forEach((city) => {
      cityPositions[city.name] = { x: city.x, y: city.y }
    })

    // Draw roads
    for (const [fromCity, destinations] of Object.entries(simulationState.roadNetwork)) {
      const fromPos = cityPositions[fromCity]
      if (!fromPos) continue

      for (const [toCity, roadDetails] of Object.entries(destinations)) {
        const toPos = cityPositions[toCity]
        if (!toPos) continue

        // Draw road
        ctx.lineWidth = 10

        // Color based on congestion
        const congestionColor = getCongestionColor(roadDetails.currentCongestion)

        // Draw road
        ctx.strokeStyle = congestionColor
        ctx.beginPath()
        ctx.moveTo(fromPos.x, fromPos.y)
        ctx.lineTo(toPos.x, toPos.y)
        ctx.stroke()

        // Draw road direction arrow
        drawArrow(ctx, fromPos.x, fromPos.y, toPos.x, toPos.y)

        // Draw accident marker if there's an accident
        if (roadDetails.hasAccident) {
          const midX = (fromPos.x + toPos.x) / 2
          const midY = (fromPos.y + toPos.y) / 2

          // Draw accident symbol (warning triangle)
          ctx.fillStyle = "#ff0000"
          ctx.beginPath()
          ctx.moveTo(midX, midY - 15)
          ctx.lineTo(midX - 10, midY + 5)
          ctx.lineTo(midX + 10, midY + 5)
          ctx.closePath()
          ctx.fill()

          ctx.fillStyle = "#ffffff"
          ctx.font = "bold 12px Arial"
          ctx.textAlign = "center"
          ctx.fillText("!", midX, midY + 3)
        }

        // Draw road name and info
        const midX = (fromPos.x + toPos.x) / 2
        const midY = (fromPos.y + toPos.y) / 2 - 15

        ctx.fillStyle = "#ffffff"
        ctx.font = "12px Arial"
        ctx.textAlign = "center"
        ctx.fillText(`${fromCity} → ${toCity}`, midX, midY)

        // Draw congestion percentage
        ctx.font = "10px Arial"
        ctx.fillStyle = congestionColor
        ctx.fillText(`${Math.round(roadDetails.currentCongestion)}%`, midX, midY + 15)
      }
    }

    // Draw traffic lights
    for (const light of simulationState.trafficLights) {
      const pos = cityPositions[light.location]
      if (!pos) continue

      // Traffic light circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y - 30, 10, 0, Math.PI * 2)

      // Use actual traffic light colors
      if (light.state === "RED") {
        ctx.fillStyle = "#e74c3c"
      } else if (light.state === "YELLOW") {
        ctx.fillStyle = "#f39c12"
      } else {
        ctx.fillStyle = "#2ecc71"
      }

      ctx.fill()

      // Draw traffic light pole
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y - 20)
      ctx.lineTo(pos.x, pos.y - 5)
      ctx.strokeStyle = "#94a3b8"
      ctx.lineWidth = 2
      ctx.stroke()

      // Traffic light timer
      ctx.font = '10px Arial"x.fillStyle = "#ffffff'
      ctx.textAlign = "center"
      ctx.fillText(`${Math.ceil(light.remainingTime)}s`, pos.x, pos.y - 45)
    }

    // Draw cities
    for (const city of simulationState.cities) {
      const pos = cityPositions[city.name]

      // City building icon
      drawCityIcon(ctx, pos.x, pos.y, city.population > 5000000)

      // City name
      ctx.font = city.population > 5000000 ? "bold 14px Arial" : "12px Arial"
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "center"
      ctx.fillText(city.name, pos.x, pos.y + 35)

      // Find congestion level for this city
      const light = simulationState.trafficLights.find((light) => light.location === city.name)
      if (light) {
        // Congestion indicator
        ctx.font = "12px Arial"
        ctx.fillStyle = getCongestionColor(light.congestionLevel)
        ctx.fillText(`${Math.round(light.congestionLevel)}%`, pos.x, pos.y + 50)
      }
    }

    // Draw vehicles
    for (const vehicle of simulationState.vehicles) {
      if (vehicle.completed) continue

      const currentPos = cityPositions[vehicle.currentPosition]
      const nextPos = vehicle.nextPosition ? cityPositions[vehicle.nextPosition] : null

      if (!currentPos || !nextPos) continue

      // Calculate vehicle position based on progress
      const x = currentPos.x + (nextPos.x - currentPos.x) * vehicle.progress
      const y = currentPos.y + (nextPos.y - currentPos.y) * vehicle.progress

      // Calculate angle for vehicle rotation
      const angle = Math.atan2(nextPos.y - currentPos.y, nextPos.x - currentPos.x)

      // Draw vehicle based on type
      drawVehicle(ctx, x, y, vehicle.type, angle)

      // Vehicle ID
      ctx.font = "10px Arial"
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "center"
      ctx.fillText(vehicle.id, x, y - 15)

      // Show rerouted indicator if vehicle was rerouted
      if (vehicle.rerouted) {
        ctx.font = "9px Arial"
        ctx.fillStyle = "#f59e0b"
        ctx.fillText("rerouted", x, y - 25)
      }
    }
  }, [simulationState])

  return <canvas ref={canvasRef} className="w-full h-full" />
}

function drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) {
  // Calculate the angle of the line
  const angle = Math.atan2(toY - fromY, toX - fromX)

  // Calculate the midpoint of the line
  const midX = (fromX + toX) / 2
  const midY = (fromY + toY) / 2

  // Arrow head size
  const headLength = 10

  // Draw the arrow head
  ctx.beginPath()
  ctx.moveTo(midX, midY)
  ctx.lineTo(midX - headLength * Math.cos(angle - Math.PI / 6), midY - headLength * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(midX - headLength * Math.cos(angle + Math.PI / 6), midY - headLength * Math.sin(angle + Math.PI / 6))
  ctx.closePath()
  ctx.fillStyle = "#ffffff"
  ctx.fill()
}

// Update the drawCityIcon function to make cities more visually distinct
function drawCityIcon(ctx: CanvasRenderingContext2D, x: number, y: number, isMetro: boolean) {
  if (isMetro) {
    // Draw metro city (multiple buildings with more detail)
    ctx.fillStyle = "#334155"

    // Base
    ctx.fillRect(x - 20, y - 5, 40, 5)

    // Tall center building
    ctx.fillStyle = "#475569"
    ctx.fillRect(x - 6, y - 30, 12, 30)

    // Side buildings
    ctx.fillRect(x - 18, y - 22, 10, 22)
    ctx.fillRect(x + 8, y - 25, 10, 25)

    // Windows
    ctx.fillStyle = "#94a3b8"
    // Center building windows
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(x - 4, y - 28 + i * 6, 8, 3)
    }

    // Left building windows
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x - 16, y - 20 + i * 7, 6, 3)
    }

    // Right building windows
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 10, y - 23 + i * 6, 6, 3)
    }
  } else {
    // Draw regular city (single building with more detail)
    ctx.fillStyle = "#334155"

    // Base
    ctx.fillRect(x - 15, y - 5, 30, 5)

    // Main building
    ctx.fillStyle = "#475569"
    ctx.fillRect(x - 12, y - 22, 24, 22)

    // Roof
    ctx.beginPath()
    ctx.moveTo(x - 14, y - 22)
    ctx.lineTo(x, y - 30)
    ctx.lineTo(x + 14, y - 22)
    ctx.closePath()
    ctx.fill()

    // Windows
    ctx.fillStyle = "#94a3b8"
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        ctx.fillRect(x - 9 + col * 12, y - 19 + row * 7, 6, 4)
      }
    }
  }
}

// Update the drawVehicle function to make vehicles more visually distinct
function drawVehicle(ctx: CanvasRenderingContext2D, x: number, y: number, type: string, angle: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  const color = VEHICLE_COLORS[type] || "#ffffff"
  ctx.fillStyle = color

  switch (type) {
    case "TRUCK":
      // Draw truck with more detail
      ctx.fillRect(-12, -4, 24, 8) // Truck body
      ctx.fillRect(-12, -8, 14, 4) // Truck cabin

      // Wheels
      ctx.fillStyle = "#1e293b"
      ctx.beginPath()
      ctx.arc(-8, 4, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(8, 4, 2, 0, Math.PI * 2)
      ctx.fill()
      break

    case "BUS":
      // Draw bus with more detail
      ctx.fillRect(-14, -4, 28, 8) // Bus body

      // Windows
      ctx.fillStyle = "#94a3b8"
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-12 + i * 8, -3, 6, 3)
      }

      // Wheels
      ctx.fillStyle = "#1e293b"
      ctx.beginPath()
      ctx.arc(-10, 4, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(10, 4, 2, 0, Math.PI * 2)
      ctx.fill()
      break

    case "MOTORCYCLE":
      // Draw motorcycle with more detail
      ctx.beginPath()
      ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI * 2)
      ctx.fill()

      // Rider
      ctx.fillStyle = "#475569"
      ctx.fillRect(-2, -4, 4, 4)
      break

    default:
      // Draw car with more detail
      ctx.fillRect(-8, -4, 16, 8) // Car body

      // Windows
      ctx.fillStyle = "#94a3b8"
      ctx.fillRect(-6, -3, 4, 3)
      ctx.fillRect(2, -3, 4, 3)

      // Wheels
      ctx.fillStyle = "#1e293b"
      ctx.beginPath()
      ctx.arc(-5, 4, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(5, 4, 2, 0, Math.PI * 2)
      ctx.fill()
      break
  }

  ctx.restore()
}

function getCongestionColor(level: number): string {
  // Green to red gradient based on congestion level
  if (level < 30) return "#10b981" // Green
  if (level < 60) return "#f59e0b" // Yellow
  return "#ef4444" // Red
}
