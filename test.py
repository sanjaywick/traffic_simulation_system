import networkx as nx
import simpy
import graphviz
import random

def dijkstra_shortest_path(graph, start, goal):
    shortest_paths = {start: (None, 0)}
    current_node = start
    visited = set()
    
    while current_node != goal:
        visited.add(current_node)
        destinations = graph[current_node]
        weight_to_current_node = shortest_paths[current_node][1]
        
        for next_node, weight in destinations.items():
            weight += weight_to_current_node
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
    path = path[::-1]
    return path

class TrafficSimulation:
    def __init__(self):
        self.env = simpy.Environment()
        self.road_network = self.create_road_network()
        self.vehicles = []
        self.traffic_lights = {node: random.choice(["RED", "GREEN"]) for node in self.road_network}

    def create_road_network(self):
        G = {
            "Mumbai": {"Pune": 150, "Nashik": 180, "Hyderabad": 720},
            "Pune": {"Mumbai": 150, "Nashik": 200, "Bangalore": 840},
            "Nashik": {"Pune": 200, "Nagpur": 600, "Mumbai": 180},
            "Nagpur": {"Nashik": 600, "Hyderabad": 500},
            "Hyderabad": {"Nagpur": 500, "Bangalore": 570, "Mumbai": 720},
            "Bangalore": {"Pune": 840, "Hyderabad": 570}
        }
        return G

    def add_vehicle(self, vehicle_id, start, destination):
        route = dijkstra_shortest_path(self.road_network, start, destination)
        if not route:
            print(f"No route found for {vehicle_id} from {start} to {destination}")
            return
        vehicle = Vehicle(self.env, vehicle_id, route, self.road_network, self.traffic_lights)
        self.vehicles.append(vehicle)
        self.env.process(vehicle.drive())

    def run(self, simulation_time=2000):
        self.env.run(until=simulation_time)
        self.visualize_traffic()

    def visualize_traffic(self):
        dot = graphviz.Digraph()
        for node in self.road_network:
            dot.node(node, color="red" if self.traffic_lights[node] == "RED" else "green")
        for node, neighbors in self.road_network.items():
            for neighbor, weight in neighbors.items():
                dot.edge(node, neighbor, label=str(weight))
        dot.render("traffic_network", format="png", view=True)

class Vehicle:
    def __init__(self, env, vehicle_id, route, road_network, traffic_lights):
        self.env = env
        self.vehicle_id = vehicle_id
        self.route = route
        self.road_network = road_network
        self.traffic_lights = traffic_lights
        print(f"{self.vehicle_id} Route: {' -> '.join(self.route)}")

    def drive(self):
        total_time = 0
        for i in range(len(self.route) - 1):
            current_node = self.route[i]
            next_node = self.route[i + 1]
            travel_time = self.road_network[current_node][next_node]
            
            if self.traffic_lights[next_node] == "RED":
                wait_time = random.randint(30, 90)  # Random delay at red lights
                print(f"{self.vehicle_id} waiting at red light in {next_node} for {wait_time}s")
                yield self.env.timeout(wait_time)
                total_time += wait_time
            
            print(f"{self.vehicle_id} traveling from {current_node} to {next_node} (Time: {travel_time}s)")
            yield self.env.timeout(travel_time)
            total_time += travel_time
        print(f"{self.vehicle_id} reached destination {self.route[-1]} in {total_time}s")

# Run simulation
if __name__ == "__main__":
    sim = TrafficSimulation()
    sim.add_vehicle("Truck1", "Mumbai", "Bangalore")
    sim.add_vehicle("Car1", "Pune", "Bangalore")
    sim.add_vehicle("Bus1", "Nashik", "Nagpur")
    sim.run(2000)