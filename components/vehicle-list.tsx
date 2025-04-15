"use client"

import type { VehicleState } from "@/lib/simulation"
import { Car, Truck, Bus, Bike, CheckCircle, Clock, RotateCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function VehicleList({ vehicles }: { vehicles: VehicleState[] }) {
  if (!vehicles.length) {
    return <div className="text-center py-8 text-gray-400">No vehicles in simulation</div>
  }

  // Sort vehicles: active first, then completed
  const sortedVehicles = [...vehicles].sort((a, b) => {
    if (a.completed && !b.completed) return 1
    if (!a.completed && b.completed) return -1
    return 0
  })

  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
      {sortedVehicles.map((vehicle) => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
    </div>
  )
}

function VehicleCard({ vehicle }: { vehicle: VehicleState }) {
  const getVehicleIcon = () => {
    switch (vehicle.type) {
      case "CAR":
        return <Car className="h-5 w-5 text-blue-400" />
      case "TRUCK":
        return <Truck className="h-5 w-5 text-red-400" />
      case "BUS":
        return <Bus className="h-5 w-5 text-amber-400" />
      case "MOTORCYCLE":
        return <Bike className="h-5 w-5 text-green-400" />
      default:
        return <Car className="h-5 w-5 text-blue-400" />
    }
  }

  return (
    <div className="bg-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gray-600 p-2 rounded-full">{getVehicleIcon()}</div>
          <div>
            <h4 className="font-medium">{vehicle.id}</h4>
            <p className="text-xs text-gray-400">{vehicle.type}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {vehicle.rerouted && (
            <Badge className="bg-amber-600">
              <RotateCw className="h-3 w-3 mr-1" /> Rerouted
            </Badge>
          )}
          <Badge className={vehicle.completed ? "bg-green-600" : "bg-blue-600"}>
            {vehicle.completed ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" /> Completed
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" /> In Transit
              </>
            )}
          </Badge>
        </div>
      </div>

      <div className="mt-2 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>Route:</span>
          <span>{vehicle.route.join(" → ")}</span>
        </div>

        {!vehicle.completed && (
          <div className="mt-2">
            <div className="flex justify-between text-gray-400 text-xs mb-1">
              <span>Progress:</span>
              <span>{Math.round(vehicle.progress * 100)}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${Math.round(vehicle.progress * 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex justify-between text-gray-400 mt-2">
          <span>Time:</span>
          <span>
            {Math.floor(vehicle.totalTime / 60)}h {Math.round(vehicle.totalTime % 60)}m
          </span>
        </div>
      </div>
    </div>
  )
}
