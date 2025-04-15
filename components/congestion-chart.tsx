"use client"

import { useEffect, useRef } from "react"
import type { TrafficLightState } from "@/lib/simulation"

export default function CongestionChart({ data }: { data: TrafficLightState[] }) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return

    // Sort data by congestion level (descending)
    const sortedData = [...data].sort((a, b) => b.congestionLevel - a.congestionLevel)

    // Clear previous chart
    chartRef.current.innerHTML = ""

    // Create chart container
    const chartContainer = document.createElement("div")
    chartContainer.className = "space-y-4"

    // Add each bar
    sortedData.forEach((light) => {
      const barContainer = document.createElement("div")
      barContainer.className = "relative"

      // City name
      const cityLabel = document.createElement("div")
      cityLabel.className = "flex justify-between mb-1"

      const cityName = document.createElement("span")
      cityName.className = "text-sm font-medium"
      cityName.textContent = light.location

      const congestionValue = document.createElement("span")
      congestionValue.className = "text-sm text-gray-400"
      congestionValue.textContent = `${Math.round(light.congestionLevel)}%`

      cityLabel.appendChild(cityName)
      cityLabel.appendChild(congestionValue)
      barContainer.appendChild(cityLabel)

      // Bar background
      const barBg = document.createElement("div")
      barBg.className = "w-full bg-gray-700 rounded-full h-4"

      // Bar fill
      const barFill = document.createElement("div")
      barFill.className = `h-4 rounded-full ${
        light.congestionLevel < 30 ? "bg-green-500" : light.congestionLevel < 60 ? "bg-yellow-500" : "bg-red-500"
      }`
      barFill.style.width = `${Math.round(light.congestionLevel)}%`

      barBg.appendChild(barFill)
      barContainer.appendChild(barBg)

      // Traffic light indicator
      const indicator = document.createElement("div")
      indicator.className = `absolute right-0 top-0 w-3 h-3 rounded-full ${
        light.state === "RED" ? "bg-red-500" : light.state === "YELLOW" ? "bg-yellow-500" : "bg-green-500"
      }`
      barContainer.appendChild(indicator)

      chartContainer.appendChild(barContainer)
    })

    chartRef.current.appendChild(chartContainer)
  }, [data])

  return (
    <div ref={chartRef} className="w-full h-full overflow-y-auto">
      {(!data || data.length === 0) && (
        <div className="flex items-center justify-center h-full text-gray-400">No congestion data available</div>
      )}
    </div>
  )
}
