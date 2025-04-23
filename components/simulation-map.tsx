"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import { useSimulation } from "./simulation-context"
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

// Vehicle colors
const VEHICLE_COLORS: Record<string, string> = {
  TRUCK: "#e74c3c",
  CAR: "#3498db",
  BUS: "#f39c12",
  MOTORCYCLE: "#2ecc71",
}

// Vehicle emoji mapping
const VEHICLE_EMOJI: Record<string, string> = {
  TRUCK: "🚛",
  CAR: "🚗",
  BUS: "🚌",
  MOTORCYCLE: "🏍️",
}

interface InfoCard {
  type: "city" | "road" | "vehicle"
  x: number
  y: number
  data: any
}

export default function SimulationMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { simulationState } = useSimulation()
  const [infoCard, setInfoCard] = useState<InfoCard | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredElement, setHoveredElement] = useState<{ type: string; id: string } | null>(null)

  // Store positions for hit detection
  const cityPositionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const roadPositionsRef = useRef<any[]>([])
  const vehiclePositionsRef = useRef<any[]>([])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / zoom - pan.x
      const y = (e.clientY - rect.top) / zoom - pan.y

      // Handle dragging for pan
      if (isDragging) {
        const deltaX = (e.clientX - dragStart.x) / zoom
        const deltaY = (e.clientY - dragStart.y) / zoom
        setPan((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }))
        setDragStart({ x: e.clientX, y: e.clientY })
        return
      }

      // Hit detection for cities
      let found = false
      for (const [cityName, pos] of Object.entries(cityPositionsRef.current)) {
        const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2))
        if (distance < 20) {
          // Found a city under the cursor
          const cityData = simulationState?.cities.find((city) => city.name === cityName)
          const trafficLight = simulationState?.trafficLights.find((light) => light.location === cityName)

          if (cityData && trafficLight) {
            setInfoCard({
              type: "city",
              x: pos.x,
              y: pos.y,
              data: {
                name: cityName,
                population: cityData.population,
                congestion: trafficLight.congestionLevel,
                vehiclesPresent: simulationState?.vehicles.filter((v) => v.currentPosition === cityName).length || 0,
                outflowRate: Math.round((trafficLight.congestionLevel / 100) * 10), // Simulated outflow rate
              },
            })
            setHoveredElement({ type: "city", id: cityName })
            found = true
            break
          }
        }
      }

      // Hit detection for roads if no city was found
      if (!found) {
        for (const road of roadPositionsRef.current) {
          // Simple line hit detection
          const { x1, y1, x2, y2, fromCity, toCity, details } = road

          // Calculate distance from point to line segment
          const A = x - x1
          const B = y - y1
          const C = x2 - x1
          const D = y2 - y1

          const dot = A * C + B * D
          const lenSq = C * C + D * D
          let param = -1

          if (lenSq !== 0) param = dot / lenSq

          let xx, yy

          if (param < 0) {
            xx = x1
            yy = y1
          } else if (param > 1) {
            xx = x2
            yy = y2
          } else {
            xx = x1 + param * C
            yy = y1 + param * D
          }

          const distance = Math.sqrt(Math.pow(x - xx, 2) + Math.pow(y - yy, 2))

          if (distance < 10) {
            // Adjust hit area as needed
            setInfoCard({
              type: "road",
              x: (x1 + x2) / 2,
              y: (y1 + y2) / 2,
              data: {
                from: fromCity,
                to: toCity,
                distance: details.distance,
                congestion: details.currentCongestion,
                hasAccident: details.hasAccident,
                travelTime: Math.round(
                  (details.distance / details.maxSpeed) * (1 + details.currentCongestion / 100) * 60,
                ), // in seconds
              },
            })
            setHoveredElement({ type: "road", id: `${fromCity}-${toCity}` })
            found = true
            break
          }
        }
      }

      // Hit detection for vehicles if no road or city was found
      if (!found) {
        for (const vehicle of vehiclePositionsRef.current) {
          const distance = Math.sqrt(Math.pow(vehicle.x - x, 2) + Math.pow(vehicle.y - y, 2))
          if (distance < 15) {
            // Adjust hit area as needed
            const vehicleData = simulationState?.vehicles.find((v) => v.id === vehicle.id)
            if (vehicleData) {
              // Calculate ETA
              const remainingSegments =
                vehicleData.route.length - vehicleData.route.indexOf(vehicleData.currentPosition) - 1
              const currentSegmentRemaining = 1 - vehicleData.progress
              const estimatedTimeRemaining = Math.round(
                (vehicleData.totalTime * (currentSegmentRemaining + remainingSegments)) /
                  (vehicleData.route.indexOf(vehicleData.currentPosition) + vehicleData.progress),
              )

              setInfoCard({
                type: "vehicle",
                x: vehicle.x,
                y: vehicle.y,
                data: {
                  ...vehicleData,
                  eta: estimatedTimeRemaining,
                },
              })
              setHoveredElement({ type: "vehicle", id: vehicle.id })
              found = true
              break
            }
          }
        }
      }

      if (!found) {
        setInfoCard(null)
        setHoveredElement(null)
      }
    },
    [simulationState, isDragging, zoom, pan, dragStart],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 0) {
        // Left click
        setIsDragging(true)
        setDragStart({ x: e.clientX, y: e.clientY })

        // Check if clicking on a vehicle to select it
        if (hoveredElement?.type === "vehicle") {
          setSelectedVehicle(hoveredElement.id === selectedVehicle ? null : hoveredElement.id)
        } else if (!hoveredElement) {
          setSelectedVehicle(null)
        }
      }
    },
    [hoveredElement, selectedVehicle],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
    setInfoCard(null)
    setHoveredElement(null)
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1 // Zoom in or out
      const newZoom = Math.max(0.5, Math.min(2.5, zoom * delta)) // Limit zoom range

      // Adjust pan to zoom toward cursor position
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const newPanX = pan.x - (mouseX / zoom - mouseX / newZoom)
        const newPanY = pan.y - (mouseY / zoom - mouseY / newZoom)

        setPan({ x: newPanX, y: newPanY })
      }

      setZoom(newZoom)
    },
    [zoom, pan],
  )

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setSelectedVehicle(null)
  }, [])

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

    // Apply zoom and pan transformations
    ctx.save()
    ctx.translate(pan.x * zoom, pan.y * zoom)
    ctx.scale(zoom, zoom)

    // Draw background
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(-pan.x, -pan.y, canvas.width / zoom, canvas.height / zoom)

    // Draw grid
    ctx.strokeStyle = "#334155"
    ctx.lineWidth = 1

    const gridSize = 50
    const offsetX = Math.floor(pan.x / gridSize) * gridSize - pan.x
    const offsetY = Math.floor(pan.y / gridSize) * gridSize - pan.y
    const width = canvas.width / zoom
    const height = canvas.height / zoom

    for (let x = offsetX; x < width + offsetX + gridSize; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, -pan.y)
      ctx.lineTo(x, height - pan.y)
      ctx.stroke()
    }

    for (let y = offsetY; y < height + offsetY + gridSize; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(-pan.x, y)
      ctx.lineTo(width - pan.x, y)
      ctx.stroke()
    }

    // Create a map of city positions
    const cityPositions: Record<string, { x: number; y: number }> = {}
    simulationState.cities.forEach((city) => {
      cityPositions[city.name] = { x: city.x, y: city.y }
    })
    cityPositionsRef.current = cityPositions

    // Reset road positions array
    roadPositionsRef.current = []

    // Draw roads
    const drawnRoads = new Set<string>()
    for (const [fromCity, destinations] of Object.entries(simulationState.roadNetwork)) {
      const fromPos = cityPositions[fromCity]
      if (!fromPos) continue

      for (const [toCity, roadDetails] of Object.entries(destinations)) {
        const toPos = cityPositions[toCity]
        if (!toPos) continue

        const roadKey = [fromCity, toCity].sort().join("<->")
        if (drawnRoads.has(roadKey)) {
          continue
        }
        drawnRoads.add(roadKey)

        // Store road position for hit detection
        roadPositionsRef.current.push({
          x1: fromPos.x,
          y1: fromPos.y,
          x2: toPos.x,
          y2: toPos.y,
          fromCity,
          toCity,
          details: roadDetails,
        })

        // Draw road with gradient based on congestion
        const gradient = ctx.createLinearGradient(fromPos.x, fromPos.y, toPos.x, toPos.y)

        // Get congestion color
        const congestionColor = getCongestionColor(roadDetails.currentCongestion)
        gradient.addColorStop(0, congestionColor)
        gradient.addColorStop(1, congestionColor)

        // Draw road
        ctx.lineWidth = 10
        ctx.strokeStyle = gradient
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
        ctx.fillText(`${fromCity} <-> ${toCity}`, midX, midY)

        // Draw congestion percentage with a semi-transparent black background
        ctx.font = "10px Arial"
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)" // Semi-transparent black
        const textWidth = ctx.measureText(`${Math.round(roadDetails.currentCongestion)}%`).width
        const textX = midX - textWidth / 2
        ctx.fillRect(textX - 2, midY + 3, textWidth + 4, 12) // Background rectangle
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

      // Highlight city if hovered
      if (hoveredElement?.type === "city" && hoveredElement.id === city.name) {
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(59, 130, 246, 0.3)"
        ctx.fill()
      }

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
        // Congestion indicator with background
        ctx.font = "10px Arial"
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)" // Semi-transparent black
        const congestionText = `${Math.round(light.congestionLevel)}%`
        const textWidth = ctx.measureText(congestionText).width
        const textX = pos.x - textWidth / 2
        ctx.fillRect(textX - 2, pos.y + 38, textWidth + 4, 12) // Background rectangle
        ctx.fillStyle = getCongestionColor(light.congestionLevel)
        ctx.fillText(congestionText, pos.x, pos.y + 50)
      }
    }

    // Reset vehicle positions array
    vehiclePositionsRef.current = []

    // Draw vehicles
    for (const vehicle of simulationState.vehicles) {
      if (vehicle.completed) continue

      const currentPos = cityPositions[vehicle.currentPosition]
      const nextPos = vehicle.nextPosition ? cityPositions[vehicle.nextPosition] : null

      if (!currentPos || !nextPos) continue

      // Calculate vehicle position based on progress
      const x = currentPos.x + (nextPos.x - currentPos.x) * vehicle.progress
      const y = currentPos.y + (nextPos.y - currentPos.y) * vehicle.progress

      // Store vehicle position for hit detection
      vehiclePositionsRef.current.push({
        x,
        y,
        id: vehicle.id,
      })

      // Calculate angle for vehicle rotation
      const angle = Math.atan2(nextPos.y - currentPos.y, nextPos.x - currentPos.x)

      // Check if this vehicle is selected
      const isSelected = selectedVehicle === vehicle.id

      // If selected, highlight the entire path
      if (isSelected) {
        // Draw the entire route with a glow effect
        ctx.save()
        ctx.lineWidth = 6
        ctx.strokeStyle = "rgba(59, 130, 246, 0.7)"
        ctx.shadowColor = "rgba(59, 130, 246, 0.7)"
        ctx.shadowBlur = 10

        // Draw path segments
        for (let i = 0; i < vehicle.route.length - 1; i++) {
          const fromPos = cityPositions[vehicle.route[i]]
          const toPos = cityPositions[vehicle.route[i + 1]]

          if (fromPos && toPos) {
            ctx.beginPath()
            ctx.moveTo(fromPos.x, fromPos.y)
            ctx.lineTo(toPos.x, toPos.y)
            ctx.stroke()
          }
        }
        ctx.restore()
      }

      // Draw vehicle based on type
      drawVehicle(ctx, x, y, vehicle.type, angle, isSelected)

      // Vehicle ID
      ctx.font = "10px Arial"
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "center"
      ctx.fillText(`${vehicle.id} (${vehicle.type})`, x, y - 15)

      // Show rerouted indicator if vehicle was rerouted
      if (vehicle.rerouted) {
        ctx.font = "9px Arial"
        ctx.fillStyle = "#f59e0b"
        ctx.fillText("rerouted", x, y - 25)
      }

      // Show ETA if hovered
      if (hoveredElement?.type === "vehicle" && hoveredElement.id === vehicle.id) {
        // Calculate ETA
        const remainingSegments = vehicle.route.length - vehicle.route.indexOf(vehicle.currentPosition) - 1
        const currentSegmentRemaining = 1 - vehicle.progress
        const estimatedTimeRemaining = Math.round(
          (vehicle.totalTime * (currentSegmentRemaining + remainingSegments)) /
            (vehicle.route.indexOf(vehicle.currentPosition) + vehicle.progress),
        )

        const minutes = Math.floor(estimatedTimeRemaining / 60)
        const seconds = estimatedTimeRemaining % 60

        ctx.font = "10px Arial"
        ctx.fillStyle = "#ffffff"
        ctx.textAlign = "center"
        ctx.fillText(`ETA: ${minutes}:${seconds.toString().padStart(2, "0")}`, x, y + 25)
      }
    }

    // Draw mini-legend
    drawLegend(ctx, canvas.width / zoom - 150 - pan.x, 20 - pan.y)

    ctx.restore()
  }, [simulationState, zoom, pan, hoveredElement, selectedVehicle])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
        <Button
          variant="outline"
          size="icon"
          className="bg-gray-700 hover:bg-gray-600 border-gray-600"
          onClick={() => setZoom((prev) => Math.min(2.5, prev * 1.2))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-gray-700 hover:bg-gray-600 border-gray-600"
          onClick={() => setZoom((prev) => Math.max(0.5, prev * 0.8))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-gray-700 hover:bg-gray-600 border-gray-600"
          onClick={resetView}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Info card */}
      {infoCard && (
        <div
          className="absolute bg-gray-800 border border-gray-700 rounded-md shadow-lg p-3 z-10 pointer-events-none"
          style={{
            left: (infoCard.x + pan.x) * zoom + 20,
            top: (infoCard.y + pan.y) * zoom - 20,
            maxWidth: "250px",
          }}
        >
          {infoCard.type === "city" && (
            <>
              <h4 className="font-bold text-lg">{infoCard.data.name}</h4>
              <div className="text-sm space-y-1 mt-1">
                <p>Population: {(infoCard.data.population / 1000000).toFixed(1)}M</p>
                <p>Vehicles Present: {infoCard.data.vehiclesPresent}</p>
                <p>Outflow Rate: {infoCard.data.outflowRate}/min</p>
                <div className="flex items-center">
                  <span className="mr-2">Congestion:</span>
                  <div className="w-full bg-gray-600 rounded-full h-1.5 flex-1">
                    <div
                      className={`h-1.5 rounded-full ${
                        infoCard.data.congestion < 30
                          ? "bg-green-500"
                          : infoCard.data.congestion < 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${Math.round(infoCard.data.congestion)}%` }}
                    />
                  </div>
                  <span className="ml-2">{Math.round(infoCard.data.congestion)}%</span>
                </div>
              </div>
            </>
          )}

          {infoCard.type === "road" && (
            <>
              <h4 className="font-bold">
                {infoCard.data.from} ↔ {infoCard.data.to}
              </h4>
              <div className="text-sm space-y-1 mt-1">
                <p>Distance: {infoCard.data.distance} km</p>
                <p>
                  Travel Time: {Math.floor(infoCard.data.travelTime / 60)}m {infoCard.data.travelTime % 60}s
                </p>
                <div className="flex items-center">
                  <span className="mr-2">Congestion:</span>
                  <div className="w-full bg-gray-600 rounded-full h-1.5 flex-1">
                    <div
                      className={`h-1.5 rounded-full ${
                        infoCard.data.congestion < 30
                          ? "bg-green-500"
                          : infoCard.data.congestion < 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${Math.round(infoCard.data.congestion)}%` }}
                    />
                  </div>
                  <span className="ml-2">{Math.round(infoCard.data.congestion)}%</span>
                </div>
                {infoCard.data.hasAccident && <p className="text-red-500 font-bold">⚠️ Accident reported</p>}
              </div>
            </>
          )}

          {infoCard.type === "vehicle" && (
            <>
              <h4 className="font-bold">
                {infoCard.data.id} ({infoCard.data.type})
              </h4>
              <div className="text-sm space-y-1 mt-1">
                <p>From: {infoCard.data.route[0]}</p>
                <p>To: {infoCard.data.route[infoCard.data.route.length - 1]}</p>
                <p>Progress: {Math.round(infoCard.data.progress * 100)}%</p>
                <p>
                  ETA: {Math.floor(infoCard.data.eta / 60)}m {infoCard.data.eta % 60}s
                </p>
                {infoCard.data.rerouted && <p className="text-amber-500">⚠️ Route changed due to traffic</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
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
function drawVehicle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: string,
  angle: number,
  isSelected = false,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  const color = VEHICLE_COLORS[type] || "#ffffff"

  // Draw selection highlight if selected
  if (isSelected) {
    ctx.beginPath()
    ctx.arc(0, 0, 18, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(59, 130, 246, 0.3)"
    ctx.fill()

    ctx.lineWidth = 2
    ctx.strokeStyle = "#3b82f6"
    ctx.stroke()
  }

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
  if (level < 20) return "#10b981" // Green
  if (level < 50) return "#f59e0b" // Yellow
  return "#ef4444" // Red
}

function drawLegend(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Draw legend background
  ctx.fillStyle = "rgba(30, 41, 59, 0.8)"
  ctx.strokeStyle = "#475569"
  ctx.lineWidth = 1
  ctx.fillRect(x, y, 140, 120)
  ctx.strokeRect(x, y, 140, 120)

  // Title
  ctx.fillStyle = "#ffffff"
  ctx.font = "bold 12px Arial"
  ctx.textAlign = "left"
  ctx.fillText("Legend", x + 10, y + 20)

  // Congestion levels
  ctx.font = "11px Arial"
  ctx.fillStyle = "#10b981" // Green
  ctx.fillText("🟢 Low Congestion (0-20%)", x + 10, y + 40)

  ctx.fillStyle = "#f59e0b" // Yellow
  ctx.fillText("🟡 Medium Congestion (21-50%)", x + 10, y + 60)

  ctx.fillStyle = "#ef4444" // Red
  ctx.fillText("🔴 High Congestion (>50%)", x + 10, y + 80)

  // Vehicle types
  ctx.fillStyle = "#ffffff"
  ctx.fillText("🚗 Car  🚌 Bus", x + 10, y + 100)
  ctx.fillText("🚛 Truck  🏍️ Motorcycle", x + 10, y + 120)
}
