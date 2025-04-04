import networkx as nx
import simpy
import graphviz
import random
import enum
import matplotlib.pyplot as plt

class VehicleType(enum.Enum):
    TRUCK = 1
    CAR = 2
    BUS = 3
    MOTORCYCLE = 4

class Vehicle:
    SPEED_MULTIPLIERS = {
        VehicleType.TRUCK: 0.6,
        VehicleType.CAR: 1.0,
        VehicleType.BUS: 0.8,
        VehicleType.MOTORCYCLE: 1.5
    }

    def __init__(self, env, vehicle_id, vehicle_type, route, road_network, traffic_lights):
        self.env = env
        self.vehicle_id = vehicle_id
        self.vehicle_type = vehicle_type
        self.route = route
        self.road_network = road_network
        self.traffic_lights = traffic_lights
        self.speed_multiplier = self.SPEED_MULTIPLIERS[vehicle_type]
        print(f"{self.vehicle_id} ({vehicle_type.name}) Route: {' -> '.join(self.route)}")

    def drive(self):
        total_time = 0
        for i in range(len(self.route) - 1):
            current_node = self.route[i]
            next_node = self.route[i + 1]
            
            road_details = self.road_network[current_node][next_node]
            congestion_factor = random.uniform(1.0, 2.5)
            base_travel_time = road_details['distance'] / road_details['max_speed'] * congestion_factor
            travel_time = int(base_travel_time / self.speed_multiplier)
            
            if self.traffic_lights[current_node].state == "RED":
                delay = self.traffic_lights[current_node].dynamic_delay()
                print(f"{self.vehicle_id} ({self.vehicle_type.name}) waiting at red light in {current_node} for {delay}s")
                total_time += delay
                yield self.env.timeout(delay)
            
            print(f"{self.vehicle_id} ({self.vehicle_type.name}) traveling from {current_node} to {next_node} (Time: {travel_time}Hr)")
            yield self.env.timeout(travel_time)
            total_time += travel_time
        
        print(f"{self.vehicle_id} ({self.vehicle_type.name}) reached destination {self.route[-1]} in {total_time}Hr")

class TrafficLight:
    def __init__(self, env, location, junction_type, cycle_time=60):
        self.env = env
        self.location = location
        self.junction_type = junction_type
        self.cycle_time = cycle_time
        self.state = "RED"
        self.process = env.process(self.run())

    def run(self):
        while True:
            traffic_density = random.randint(1, 100)
            green_time = self.optimize_green_time(traffic_density)
            print(f"Traffic light at {self.location} turning GREEN for {green_time}s due to congestion {traffic_density}")
            self.state = "GREEN"
            yield self.env.timeout(green_time)
            self.state = "RED"
            yield self.env.timeout(self.cycle_time - green_time)

    def optimize_green_time(self, traffic_density):
        return max(10, min(60, traffic_density // 2))
    
    def dynamic_delay(self):
        return random.randint(10, 60)

class TrafficSimulation:
    def __init__(self):
        self.env = simpy.Environment()
        self.road_network = self.create_road_network()
        self.vehicles = []
        self.traffic_lights = {}
        self.setup_traffic_lights()
        self.env.process(self.run_simulation())

    def create_road_network(self):
        return {
            "Mumbai": {"Pune": {"distance": 150, "max_speed": 100}},
            "Pune": {"Mumbai": {"distance": 150, "max_speed": 100}},
            "Mumbai": {"Nashik": {"distance": 180, "max_speed": 80}},
            "Nashik": {"Pune": {"distance": 200, "max_speed": 90}}
        }

    def setup_traffic_lights(self):
        for location in self.road_network.keys():
            self.traffic_lights[location] = TrafficLight(self.env, location, "city_intersection")

    def add_vehicle(self, vehicle_id, vehicle_type, start, destination):
        route = self.dijkstra_shortest_path(start, destination)
        if not route:
            print(f"No route found for {vehicle_id} from {start} to {destination}")
            return
        vehicle = Vehicle(self.env, vehicle_id, vehicle_type, route, self.road_network, self.traffic_lights)
        self.vehicles.append(vehicle)
        self.env.process(vehicle.drive())

    def run_simulation(self):
        while True:
            yield self.env.timeout(5)
            self.sort_traffic_by_congestion()

    def run(self, simulation_time=2000):
        self.env.run(until=simulation_time)

    def dijkstra_shortest_path(self, start, goal):
        shortest_paths = {start: (None, 0)}
        current_node = start
        visited = set()
        
        while current_node != goal:
            visited.add(current_node)
            destinations = self.road_network[current_node]
            weight_to_current_node = shortest_paths[current_node][1]
            
            for next_node, details in destinations.items():
                congestion_factor = random.uniform(1.0, 2.5)
                weight = details['distance'] * congestion_factor + weight_to_current_node
                if next_node not in shortest_paths:
                    shortest_paths[next_node] = (current_node, weight)
                else:
                    current_shortest_weight = shortest_paths[next_node][1]
                    if current_shortest_weight > weight:
                        shortest_paths[next_node] = (current_node, weight)
            
            next_destinations = {node: shortest_paths[node] for node in shortest_paths if node not in visited}
            if not next_destinations:
                return None
            
            current_node = min(next_destinations, key=lambda k: next_destinations[k][1])
        
        path = []
        while current_node is not None:
            path.append(current_node)
            next_node = shortest_paths[current_node][0]
            current_node = next_node
        return path[::-1]

    def sort_traffic_by_congestion(self):
        congestion_data = [(loc, random.randint(1, 100)) for loc in self.traffic_lights.keys()]
        sorted_congestion = self.merge_sort(congestion_data)
        print("Sorted Congestion Levels:", sorted_congestion)

    def merge_sort(self, data):
        if len(data) <= 1:
            return data
        mid = len(data) // 2
        left = self.merge_sort(data[:mid])
        right = self.merge_sort(data[mid:])
        return self.merge(left, right)

    def merge(self, left, right):
        result = []
        while left and right:
            if left[0][1] > right[0][1]:
                result.append(left.pop(0))
            else:
                result.append(right.pop(0))
        result.extend(left or right)
        return result

if __name__ == "__main__":
    sim = TrafficSimulation()
    sim.add_vehicle("Truck1", VehicleType.TRUCK, "Mumbai", "Pune")
    sim.add_vehicle("Car1", VehicleType.CAR, "Mumbai", "Nashik")
    sim.run(2000)
