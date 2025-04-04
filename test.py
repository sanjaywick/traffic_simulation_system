import networkx as nx
import simpy
import graphviz
import random
import enum

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
            
            # Adjust travel time based on vehicle type and road details
            road_details = self.road_network[current_node][next_node]
            base_travel_time = road_details['distance'] / road_details['max_speed']
            travel_time = int(base_travel_time / self.speed_multiplier)  # Convert to seconds
            
            if self.traffic_lights[current_node].state == "RED":
                delay = random.randint(10, 60)
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
            # Adjust traffic light timing based on junction type
            traffic_density = random.randint(1, 100)
            green_time = self.optimize_green_time(traffic_density)
            self.state = "GREEN"
            yield self.env.timeout(green_time)
            self.state = "RED"
            yield self.env.timeout(self.cycle_time - green_time)

    def optimize_green_time(self, traffic_density):
        # Different junction types get different green time optimization
        junction_multipliers = {
            "highway_intersection": 0.7,
            "city_intersection": 1.0,
            "rural_intersection": 1.3
        }
        multiplier = junction_multipliers.get(self.junction_type, 1.0)
        return int(max(10, min(traffic_density * multiplier // 2, 60)))

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
            "Mumbai": {
                "Pune": {"distance": 150, "road_type": "highway", "max_speed": 100},
                "Nashik": {"distance": 180, "road_type": "highway", "max_speed": 80},
                "Hyderabad": {"distance": 720, "road_type": "national_highway", "max_speed": 120}
            },
            "Pune": {
                "Mumbai": {"distance": 150, "road_type": "highway", "max_speed": 100},
                "Nashik": {"distance": 200, "road_type": "state_highway", "max_speed": 60},
                "Bangalore": {"distance": 840, "road_type": "national_highway", "max_speed": 100}
            },
            "Nashik": {
                "Pune": {"distance": 200, "road_type": "state_highway", "max_speed": 60},
                "Nagpur": {"distance": 600, "road_type": "national_highway", "max_speed": 80},
                "Mumbai": {"distance": 180, "road_type": "highway", "max_speed": 80}
            },
            "Nagpur": {
                "Nashik": {"distance": 600, "road_type": "national_highway", "max_speed": 80},
                "Hyderabad": {"distance": 500, "road_type": "national_highway", "max_speed": 100}
            },
            "Hyderabad": {
                "Nagpur": {"distance": 500, "road_type": "national_highway", "max_speed": 100},
                "Bangalore": {"distance": 570, "road_type": "national_highway", "max_speed": 120},
                "Mumbai": {"distance": 720, "road_type": "national_highway", "max_speed": 120}
            },
            "Bangalore": {
                "Pune": {"distance": 840, "road_type": "national_highway", "max_speed": 100},
                "Hyderabad": {"distance": 570, "road_type": "national_highway", "max_speed": 120}
            }
        }

    def setup_traffic_lights(self):
        junction_types = [
            "highway_intersection", 
            "city_intersection", 
            "rural_intersection"
        ]
        for location in self.road_network.keys():
            # Randomly assign junction type
            junction_type = random.choice(junction_types)
            self.traffic_lights[location] = TrafficLight(self.env, location, junction_type)

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

    def run(self, simulation_time=2000):
        self.env.run(until=simulation_time)
        self.visualize_traffic()

    def visualize_traffic(self):
        dot = graphviz.Digraph()
        for node in self.road_network:
            dot.node(node)
        for node, neighbors in self.road_network.items():
            for neighbor, details in neighbors.items():
                dot.edge(node, neighbor, label=f"{details['road_type']}\n{details['distance']}km")
        dot.render("traffic_network", format="png", view=True)

    def dijkstra_shortest_path(self, start, goal):
        shortest_paths = {start: (None, 0)}
        current_node = start
        visited = set()
        
        while current_node != goal:
            visited.add(current_node)
            destinations = self.road_network[current_node]
            weight_to_current_node = shortest_paths[current_node][1]
            
            for next_node, details in destinations.items():
                weight = details['distance'] + weight_to_current_node
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

if __name__ == "__main__":
    sim = TrafficSimulation()
    sim.add_vehicle("Truck1", VehicleType.TRUCK, "Mumbai", "Bangalore")
    sim.add_vehicle("Car1", VehicleType.CAR, "Pune", "Bangalore")
    sim.add_vehicle("Bus1", VehicleType.BUS, "Nashik", "Nagpur")
    sim.add_vehicle("Motorcycle1", VehicleType.MOTORCYCLE, "Hyderabad", "Mumbai")
    sim.run(2000)