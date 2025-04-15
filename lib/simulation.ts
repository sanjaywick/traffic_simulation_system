import PriorityQueue from "./priorityQueue"

export enum VehicleType {
  TRUCK = "TRUCK",
  CAR = "CAR",
  BUS = "BUS",
  MOTORCYCLE = "MOTORCYCLE",
}

export interface RoadDetails {
  distance: number
  maxSpeed: number
  currentCongestion: number
  hasAccident: boolean
  accidentSeverity: number // 0-100, affects travel time
}

export interface RoadNetwork {
  [startNode: string]: {
    [endNode: string]: RoadDetails
  }
}

export interface CityInfo {
  name: string
  x: number
  y: number
  population: number
}

export interface VehicleState {
  id: string
  type: VehicleType
  route: string[]
  currentPosition: string
  nextPosition: string | null
  progress: number
  totalTime: number
  completed: boolean
  rerouted: boolean
}

export interface TrafficLightState {
  location: string
  state: "RED" | "GREEN" | "YELLOW"
  remainingTime: number
  congestionLevel: number
}

export interface SimulationState {
  time: number
  vehicles: VehicleState[]
  trafficLights: TrafficLightState[]
  congestionLevels: [string, number][]
  cities: CityInfo[]
  roadNetwork: RoadNetwork
  activeVehicleCount: number
  completedVehicleCount: number
  averageTravelTime: number
}

class Vehicle {
  private static SPEED_MULTIPLIERS = {
    [VehicleType.TRUCK]: 0.6,
    [VehicleType.CAR]: 1.0,
    [VehicleType.BUS]: 0.8,
    [VehicleType.MOTORCYCLE]: 1.5,
  }

  id: string
  type: VehicleType
  route: string[]
  currentRouteIndex = 0
  progress = 0
  totalTime = 0
  completed = false
  speedMultiplier: number
  rerouted = false

  constructor(id: string, type: VehicleType, route: string[]) {
    this.id = id
    this.type = type
    this.route = route
    this.speedMultiplier = Vehicle.SPEED_MULTIPLIERS[type]
  }

  getCurrentPosition(): string {
    return this.route[this.currentRouteIndex]
  }

  getNextPosition(): string | null {
    if (this.currentRouteIndex + 1 < this.route.length) {
      return this.route[this.currentRouteIndex + 1]
    }
    return null
  }

  move(timeStep: number, roadNetwork: RoadNetwork, trafficLights: Map<string, TrafficLight>): boolean {
    if (this.completed) return false

    const currentNode = this.getCurrentPosition()
    const nextNode = this.getNextPosition()

    if (!nextNode) {
      this.completed = true
      return false
    }

    // Check if vehicle is waiting at a traffic light
    const trafficLight = trafficLights.get(currentNode)
    if (trafficLight && trafficLight.state === "RED" && this.progress === 0) {
      this.totalTime += timeStep
      return true
    }

    // Calculate travel time based on road conditions
    const roadDetails = roadNetwork[currentNode][nextNode]

    // Congestion factor increases travel time
    const congestionFactor = 1 + roadDetails.currentCongestion / 100

    // Accident factor increases travel time if there's an accident
    const accidentFactor = roadDetails.hasAccident ? 1 + roadDetails.accidentSeverity / 50 : 1

    const baseTravelTime = (roadDetails.distance / roadDetails.maxSpeed) * congestionFactor * accidentFactor
    const travelTime = baseTravelTime / this.speedMultiplier

    // Update progress
    this.progress += timeStep / travelTime
    this.totalTime += timeStep

    // Check if segment is completed
    if (this.progress >= 1) {
      this.currentRouteIndex++
      this.progress = 0

      // Check if route is completed
      if (this.currentRouteIndex >= this.route.length - 1) {
        this.completed = true
      }
    }

    return true
  }

  updateRoute(newRoute: string[]): void {
    // Save current position
    const currentPosition = this.getCurrentPosition()

    // Find current position in new route
    const currentPosIndex = newRoute.indexOf(currentPosition)

    if (currentPosIndex >= 0) {
      this.route = newRoute
      this.currentRouteIndex = currentPosIndex
      this.rerouted = true
    }
  }

  getState(): VehicleState {
    return {
      id: this.id,
      type: this.type,
      route: this.route,
      currentPosition: this.getCurrentPosition(),
      nextPosition: this.getNextPosition(),
      progress: this.progress,
      totalTime: this.totalTime,
      completed: this.completed,
      rerouted: this.rerouted,
    }
  }
}

class TrafficLight {
  location: string
  cycleTime: number
  state: "RED" | "GREEN" | "YELLOW" = "RED"
  remainingTime: number
  congestionLevel = 50
  yellowDuration = 5

  constructor(location: string, cycleTime = 60) {
    this.location = location
    this.cycleTime = cycleTime
    this.remainingTime = this.optimizeGreenTime(this.congestionLevel)
  }

  update(timeStep: number): void {
    this.remainingTime -= timeStep

    if (this.remainingTime <= 0) {
      if (this.state === "RED") {
        this.state = "GREEN"
        this.remainingTime = this.optimizeGreenTime(this.congestionLevel)
      } else if (this.state === "GREEN") {
        this.state = "YELLOW"
        this.remainingTime = this.yellowDuration
      } else {
        this.state = "RED"
        this.remainingTime = this.cycleTime - this.optimizeGreenTime(this.congestionLevel) - this.yellowDuration
      }
    }
  }

  optimizeGreenTime(trafficDensity: number): number {
    return Math.max(10, Math.min(60, Math.floor(trafficDensity / 2)))
  }

  updateCongestion(level: number): void {
    this.congestionLevel = level
  }

  getState(): TrafficLightState {
    return {
      location: this.location,
      state: this.state,
      remainingTime: this.remainingTime,
      congestionLevel: this.congestionLevel,
    }
  }
}

export class TrafficSimulation {
  private time = 0
  private roadNetwork: RoadNetwork
  private vehicles: Vehicle[] = []
  private completedVehicles: Vehicle[] = []
  private trafficLights: Map<string, TrafficLight> = new Map()
  private cities: CityInfo[]
  private vehicleIdCounter = 0
  private vehicleInflowRate = 5 // Vehicles per minute
  private timeSinceLastVehicle = 0
  private autoGenerateVehicles = false

  constructor() {
    this.cities = this.createCities()
    this.roadNetwork = this.createRoadNetwork()
    this.setupTrafficLights()

    // Set Mumbai to always be congested
    const mumbaiLight = this.trafficLights.get("Mumbai")
    if (mumbaiLight) {
      mumbaiLight.updateCongestion(85) // High congestion level
    }
  }

  private createCities(): CityInfo[] {
    // Spread cities more evenly across the canvas
    return [
      { name: "Mumbai", x: 120, y: 350, population: 20000000 },
      { name: "Pune", x: 320, y: 480, population: 7000000 },
      { name: "Nashik", x: 220, y: 120, population: 2000000 },
      { name: "Nagpur", x: 850, y: 180, population: 3000000 },
      { name: "Aurangabad", x: 480, y: 220, population: 1500000 },
      { name: "Kolhapur", x: 280, y: 650, population: 1000000 },
      { name: "Solapur", x: 620, y: 520, population: 1200000 },
      { name: "Satara", x: 380, y: 580, population: 800000 },
      { name: "Ahmednagar", x: 420, y: 320, population: 600000 },
      { name: "Jalgaon", x: 650, y: 80, population: 700000 },
    ]
  }

  private createRoadNetwork(): RoadNetwork {
    const network: RoadNetwork = {}

    // Initialize empty network for all cities
    for (const city of this.cities) {
      network[city.name] = {}
    }

    // Define bidirectional road connections
    this.addBidirectionalRoad(network, "Mumbai", "Pune", 150, 100)
    this.addBidirectionalRoad(network, "Mumbai", "Nashik", 180, 80)
    this.addBidirectionalRoad(network, "Pune", "Satara", 120, 80)
    this.addBidirectionalRoad(network, "Pune", "Solapur", 250, 90)
    this.addBidirectionalRoad(network, "Pune", "Ahmednagar", 120, 70)
    this.addBidirectionalRoad(network, "Nashik", "Aurangabad", 160, 70)
    this.addBidirectionalRoad(network, "Nashik", "Jalgaon", 150, 60)
    this.addBidirectionalRoad(network, "Aurangabad", "Jalgaon", 180, 60)
    this.addBidirectionalRoad(network, "Aurangabad", "Nagpur", 450, 100)
    this.addBidirectionalRoad(network, "Solapur", "Kolhapur", 200, 70)
    this.addBidirectionalRoad(network, "Satara", "Kolhapur", 120, 80)
    this.addBidirectionalRoad(network, "Ahmednagar", "Aurangabad", 130, 70)
    this.addBidirectionalRoad(network, "Ahmednagar", "Solapur", 180, 70)
    this.addBidirectionalRoad(network, "Solapur", "Nagpur", 500, 90)

    // Make Mumbai roads moderately to highly congested
    for (const [destination, details] of Object.entries(network["Mumbai"])) {
      details.currentCongestion = 60 + Math.floor(Math.random() * 30) // 60-89% congestion
    }

    // Also make roads leading to Mumbai congested
    for (const city of this.cities) {
      if (city.name !== "Mumbai" && network[city.name]["Mumbai"]) {
        network[city.name]["Mumbai"].currentCongestion = 55 + Math.floor(Math.random() * 30) // 55-84% congestion
      }
    }

    return network
  }

  private addBidirectionalRoad(
    network: RoadNetwork,
    city1: string,
    city2: string,
    distance: number,
    maxSpeed: number,
  ): void {
    // Add road in both directions
    this.addRoad(network, city1, city2, distance, maxSpeed)
    this.addRoad(network, city2, city1, distance, maxSpeed)
  }

  private addRoad(network: RoadNetwork, city1: string, city2: string, distance: number, maxSpeed: number): void {
    // Add one-way road
    network[city1][city2] = {
      distance,
      maxSpeed,
      currentCongestion: Math.floor(Math.random() * 30) + 10, // Random initial congestion between 10-40%
      hasAccident: false,
      accidentSeverity: 0,
    }
  }

  private setupTrafficLights(): void {
    for (const city of this.cities) {
      this.trafficLights.set(city.name, new TrafficLight(city.name))
    }
  }

  getCities(): CityInfo[] {
    return this.cities
  }

  getRoadNetwork(): RoadNetwork {
    return this.roadNetwork
  }

  setVehicleInflowRate(rate: number): void {
    this.vehicleInflowRate = rate
  }

  setAutoGenerateVehicles(enabled: boolean): void {
    this.autoGenerateVehicles = enabled
  }

  addVehicle(vehicleId: string, vehicleType: VehicleType, start: string, destination: string): void {
    // Use Dijkstra's algorithm to find the shortest path
    const route = this.dijkstraShortestPath(start, destination)
    if (!route || route.length === 0) {
      console.error(`No route found for ${vehicleId} from ${start} to ${destination}`)
      return
    }

    const vehicle = new Vehicle(vehicleId, vehicleType, route)
    this.vehicles.push(vehicle)
  }

  private generateRandomVehicle(): void {
    // Select random start and end cities (must be different)
    const startIdx = Math.floor(Math.random() * this.cities.length)
    let endIdx
    do {
      endIdx = Math.floor(Math.random() * this.cities.length)
    } while (endIdx === startIdx)

    const start = this.cities[startIdx].name
    const destination = this.cities[endIdx].name

    // Check if a route exists using Dijkstra's algorithm
    const route = this.dijkstraShortestPath(start, destination)
    if (!route || route.length <= 1) {
      return // No valid route, skip this vehicle
    }

    // Select vehicle type
    const vehicleTypes = [VehicleType.CAR, VehicleType.TRUCK, VehicleType.BUS, VehicleType.MOTORCYCLE]
    const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)]

    const vehicleId = `V${++this.vehicleIdCounter}`

    this.addVehicle(vehicleId, vehicleType, start, destination)
  }

  addCongestion(fromCity: string, toCity: string, level: number): boolean {
    if (!this.roadNetwork[fromCity] || !this.roadNetwork[fromCity][toCity]) {
      return false
    }

    this.roadNetwork[fromCity][toCity].currentCongestion = Math.min(100, Math.max(0, level))

    // Check if vehicles need to be rerouted
    this.checkForRerouting()

    return true
  }

  addAccident(fromCity: string, toCity: string, severity: number): boolean {
    if (!this.roadNetwork[fromCity] || !this.roadNetwork[fromCity][toCity]) {
      return false
    }

    this.roadNetwork[fromCity][toCity].hasAccident = true
    this.roadNetwork[fromCity][toCity].accidentSeverity = Math.min(100, Math.max(0, severity))
    this.roadNetwork[fromCity][toCity].currentCongestion = Math.min(
      100,
      this.roadNetwork[fromCity][toCity].currentCongestion + severity / 2,
    )

    // Check if vehicles need to be rerouted
    this.checkForRerouting()

    return true
  }

  clearAccident(fromCity: string, toCity: string): boolean {
    if (!this.roadNetwork[fromCity] || !this.roadNetwork[fromCity][toCity]) {
      return false
    }

    this.roadNetwork[fromCity][toCity].hasAccident = false
    this.roadNetwork[fromCity][toCity].accidentSeverity = 0

    return true
  }

  private checkForRerouting(): void {
    // For each active vehicle, check if a better route is available
    for (const vehicle of this.vehicles) {
      if (vehicle.completed) continue

      const currentPosition = vehicle.getCurrentPosition()
      const originalDestination = vehicle.route[vehicle.route.length - 1]

      // Skip if already at destination
      if (currentPosition === originalDestination) continue

      // Calculate a new optimal route using Dijkstra's algorithm
      const newRoute = this.dijkstraShortestPath(currentPosition, originalDestination)

      // If a new route is found and it's different from the current one
      if (newRoute && newRoute.length > 1) {
        const currentRoute = vehicle.route.slice(vehicle.currentRouteIndex)

        // Only reroute if the new route is significantly better
        // or if there's an accident on the current path
        const nextNode = vehicle.getNextPosition()
        const hasAccidentOnPath =
          nextNode &&
          this.roadNetwork[currentPosition] &&
          this.roadNetwork[currentPosition][nextNode] &&
          this.roadNetwork[currentPosition][nextNode].hasAccident

        if (hasAccidentOnPath || this.isRouteBetter(newRoute, currentRoute, currentPosition)) {
          vehicle.updateRoute(newRoute)
        }
      }
    }
  }

  private isRouteBetter(newRoute: string[], currentRoute: string[], startNode: string): boolean {
    // Calculate estimated travel time for both routes
    const newRouteTime = this.estimateRouteTime(newRoute, startNode)
    const currentRouteTime = this.estimateRouteTime(currentRoute, startNode)

    // Return true if new route is at least 20% faster
    return newRouteTime < currentRouteTime * 0.8
  }

  private estimateRouteTime(route: string[], startNode: string): number {
    let totalTime = 0
    let currentNode = startNode

    for (let i = 1; i < route.length; i++) {
      const nextNode = route[i]

      if (this.roadNetwork[currentNode] && this.roadNetwork[currentNode][nextNode]) {
        const road = this.roadNetwork[currentNode][nextNode]
        const congestionFactor = 1 + road.currentCongestion / 100
        const accidentFactor = road.hasAccident ? 1 + road.accidentSeverity / 50 : 1

        totalTime += (road.distance / road.maxSpeed) * congestionFactor * accidentFactor
      } else {
        // If road doesn't exist, use a high penalty
        totalTime += 1000
      }

      currentNode = nextNode
    }

    return totalTime
  }

  runStep(timeStep: number): SimulationState {
    // Update traffic lights
    for (const light of this.trafficLights.values()) {
      light.update(timeStep)
    }

    // Make Mumbai's congestion fluctuate between moderate and high
    const mumbaiLight = this.trafficLights.get("Mumbai")
    if (mumbaiLight) {
      // Allow Mumbai to fluctuate between yellow (60-70%) and red (70-90%) congestion
      const baseLevel = 60 + Math.sin(this.time / 30) * 15
      mumbaiLight.updateCongestion(baseLevel)
    }

    // Generate new vehicles based on inflow rate
    this.timeSinceLastVehicle += timeStep
    const vehicleInterval = 60 / this.vehicleInflowRate // Time between vehicles in seconds

    if (this.autoGenerateVehicles && this.timeSinceLastVehicle >= vehicleInterval) {
      this.generateRandomVehicle()
      this.timeSinceLastVehicle = 0
    }

    // Move vehicles
    const activeVehicles: Vehicle[] = []

    for (const vehicle of this.vehicles) {
      vehicle.move(timeStep, this.roadNetwork, this.trafficLights)

      if (vehicle.completed) {
        this.completedVehicles.push(vehicle)
      } else {
        activeVehicles.push(vehicle)
      }
    }

    // Replace vehicles array with only active vehicles
    this.vehicles = activeVehicles

    // Update congestion levels
    this.updateCongestionLevels()

    // Update simulation time
    this.time += timeStep

    return this.getState()
  }

  private updateCongestionLevels(): void {
    // Count vehicles on each road segment
    const roadUsage: Record<string, Record<string, number>> = {}

    for (const vehicle of this.vehicles) {
      if (vehicle.completed) continue

      const current = vehicle.getCurrentPosition()
      const next = vehicle.getNextPosition()

      if (next) {
        if (!roadUsage[current]) roadUsage[current] = {}
        if (!roadUsage[current][next]) roadUsage[current][next] = 0
        roadUsage[current][next]++
      }
    }

    // Update congestion based on usage
    for (const [start, destinations] of Object.entries(roadUsage)) {
      for (const [end, count] of Object.entries(destinations)) {
        if (this.roadNetwork[start] && this.roadNetwork[start][end]) {
          // Don't update congestion if there's an accident (it's already high)
          if (!this.roadNetwork[start][end].hasAccident) {
            // Base congestion + vehicle count factor (more vehicles = more congestion)
            const baseCongestion = this.roadNetwork[start][end].currentCongestion
            const newCongestion = Math.min(100, baseCongestion + count * 5)
            this.roadNetwork[start][end].currentCongestion = newCongestion
          }
        }
      }
    }

    // Gradually reduce congestion over time if no vehicles and no accident
    for (const [start, destinations] of Object.entries(this.roadNetwork)) {
      for (const [end, details] of Object.entries(destinations)) {
        // For Mumbai roads, allow some fluctuation but keep them generally congested
        if (start === "Mumbai" || end === "Mumbai") {
          if ((!roadUsage[start] || !roadUsage[start][end]) && !details.hasAccident) {
            // Allow Mumbai roads to decrease congestion more slowly
            this.roadNetwork[start][end].currentCongestion = Math.max(
              55,
              this.roadNetwork[start][end].currentCongestion - 1,
            )
          }
          continue
        }

        if ((!roadUsage[start] || !roadUsage[start][end]) && !details.hasAccident) {
          this.roadNetwork[start][end].currentCongestion = Math.max(
            10,
            this.roadNetwork[start][end].currentCongestion - 2,
          )
        }
      }
    }

    // Update traffic light congestion levels
    for (const [location, light] of this.trafficLights.entries()) {
      // Skip Mumbai - it's already set to high congestion
      if (location === "Mumbai") continue

      let totalCongestion = 0
      let count = 0

      // Average congestion of all roads leading to this junction
      for (const [start, dests] of Object.entries(this.roadNetwork)) {
        for (const [end, details] of Object.entries(dests)) {
          if (end === location) {
            totalCongestion += details.currentCongestion
            count++
          }
        }
      }

      if (count > 0) {
        light.updateCongestion(totalCongestion / count)
      }
    }
  }

  // Dijkstra's algorithm implementation for finding shortest path
  private dijkstraShortestPath(start: string, goal: string): string[] | null {
    if (!this.roadNetwork[start]) {
      return null
    }

    const distances: Record<string, number> = {}
    const previous: Record<string, string | null> = {}
    const nodes = new Set<string>()

    // Initialize
    for (const node of Object.keys(this.roadNetwork)) {
      distances[node] = node === start ? 0 : Number.POSITIVE_INFINITY
      previous[node] = null
      nodes.add(node)
    }

    // Priority queue implementation for efficient node selection
    const queue = new PriorityQueue<string>()
    queue.enqueue(start, 0)

    while (!queue.isEmpty()) {
      const current = queue.dequeue()!.element

      if (current === goal) {
        break
      }

      if (!this.roadNetwork[current]) continue

      for (const [neighbor, details] of Object.entries(this.roadNetwork[current])) {
        // Consider congestion and accidents in path weight calculation
        const congestionFactor = 1 + details.currentCongestion / 100
        const accidentFactor = details.hasAccident ? 1 + details.accidentSeverity / 50 : 1
        const weight = details.distance * congestionFactor * accidentFactor
        const totalDistance = distances[current] + weight

        if (totalDistance < distances[neighbor]) {
          distances[neighbor] = totalDistance
          previous[neighbor] = current
          queue.enqueue(neighbor, totalDistance)
        }
      }
    }

    // Build path
    if (distances[goal] === Number.POSITIVE_INFINITY) {
      return null
    }

    const path: string[] = []
    let current: string | null = goal

    while (current !== null) {
      path.unshift(current)
      current = previous[current]
    }

    return path
  }

  getState(): SimulationState {
    // Include both active and recently completed vehicles (limit to last 50)
    const recentCompletedVehicles = this.completedVehicles.slice(-50)
    const vehicleStates = [...this.vehicles, ...recentCompletedVehicles].map((v) => v.getState())
    const trafficLightStates = Array.from(this.trafficLights.values()).map((l) => l.getState())

    // Get congestion levels sorted by severity using merge sort
    const congestionLevels: [string, number][] = []
    for (const [location, light] of this.trafficLights.entries()) {
      congestionLevels.push([location, light.congestionLevel])
    }

    // Sort using merge sort
    const sortedCongestion = this.mergeSort(congestionLevels)

    // Calculate average travel time for completed vehicles
    let totalTravelTime = 0
    for (const vehicle of this.completedVehicles) {
      totalTravelTime += vehicle.totalTime
    }

    const averageTravelTime = this.completedVehicles.length > 0 ? totalTravelTime / this.completedVehicles.length : 0

    return {
      time: this.time,
      vehicles: vehicleStates,
      trafficLights: trafficLightStates,
      congestionLevels: sortedCongestion,
      cities: this.cities,
      roadNetwork: this.roadNetwork,
      activeVehicleCount: this.vehicles.length,
      completedVehicleCount: this.completedVehicles.length,
      averageTravelTime,
    }
  }

  // Merge sort implementation for sorting congestion levels
  private mergeSort(data: [string, number][]): [string, number][] {
    if (data.length <= 1) {
      return data
    }

    const mid = Math.floor(data.length / 2)
    const left = this.mergeSort(data.slice(0, mid))
    const right = this.mergeSort(data.slice(mid))

    return this.merge(left, right)
  }

  private merge(left: [string, number][], right: [string, number][]): [string, number][] {
    const result: [string, number][] = []

    while (left.length && right.length) {
      if (left[0][1] > right[0][1]) {
        result.push(left.shift()!)
      } else {
        result.push(right.shift()!)
      }
    }

    return [...result, ...left, ...right]
  }
}
