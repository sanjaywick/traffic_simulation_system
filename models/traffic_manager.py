import networkx as nx
import graphviz
import random
import heapq
import numpy as np
import matplotlib.pyplot as plt
from collections import defaultdict

from models.traffic_light import TrafficLight
from utils.enums import TrafficCondition, VehicleType
from models.vehicle import Vehicle

class TrafficManager:
    def __init__(self, env):
        self.env = env
        self.road_network = self.create_road_network()
        self.traffic_lights = {}
        self.setup_traffic_lights()
        self.trip_records = []
        self.traffic_update_process = env.process(self.update_traffic_conditions())
        
    def create_road_network(self):
        """Create a directed graph for the road network using NetworkX"""
        G = nx.DiGraph()
        
        # Add nodes (cities)
        cities = ["Mumbai", "Pune", "Nashik", "Nagpur", "Hyderabad", "Bangalore", "Chennai", "Kolkata", "Delhi"]
        for city in cities:
            G.add_node(city)
        
        # Add edges (roads)
        roads = [
            ("Mumbai", "Pune", {"distance": 150, "road_type": "highway", "max_speed": 100, 
                               "traffic_condition": TrafficCondition.MODERATE}),
            ("Pune", "Mumbai", {"distance": 150, "road_type": "highway", "max_speed": 100, 
                               "traffic_condition": TrafficCondition.MODERATE}),
            
            ("Mumbai", "Nashik", {"distance": 180, "road_type": "highway", "max_speed": 80, 
                                 "traffic_condition": TrafficCondition.LIGHT}),
            ("Nashik", "Mumbai", {"distance": 180, "road_type": "highway", "max_speed": 80, 
                                 "traffic_condition": TrafficCondition.MODERATE}),
            
            ("Mumbai", "Hyderabad", {"distance": 720, "road_type": "national_highway", "max_speed": 120, 
                                    "traffic_condition": TrafficCondition.LIGHT}),
            ("Hyderabad", "Mumbai", {"distance": 720, "road_type": "national_highway", "max_speed": 120, 
                                    "traffic_condition": TrafficCondition.LIGHT}),
            
            ("Pune", "Nashik", {"distance": 200, "road_type": "state_highway", "max_speed": 60, 
                               "traffic_condition": TrafficCondition.HEAVY}),
            ("Nashik", "Pune", {"distance": 200, "road_type": "state_highway", "max_speed": 60, 
                               "traffic_condition": TrafficCondition.HEAVY}),
            
            ("Pune", "Bangalore", {"distance": 840, "road_type": "national_highway", "max_speed": 100, 
                                  "traffic_condition": TrafficCondition.MODERATE}),
            ("Bangalore", "Pune", {"distance": 840, "road_type": "national_highway", "max_speed": 100, 
                                  "traffic_condition": TrafficCondition.MODERATE}),
            
            ("Nashik", "Nagpur", {"distance": 600, "road_type": "national_highway", "max_speed": 80, 
                                 "traffic_condition": TrafficCondition.LIGHT}),
            ("Nagpur", "Nashik", {"distance": 600, "road_type": "national_highway", "max_speed": 80, 
                                 "traffic_condition": TrafficCondition.LIGHT}),
            
            ("Nagpur", "Hyderabad", {"distance": 500, "road_type": "national_highway", "max_speed": 100, 
                                    "traffic_condition": TrafficCondition.LIGHT}),
            ("Hyderabad", "Nagpur", {"distance": 500, "road_type": "national_highway", "max_speed": 100, 
                                    "traffic_condition": TrafficCondition.LIGHT}),
            
            ("Hyderabad", "Bangalore", {"distance": 570, "road_type": "national_highway", "max_speed": 120, 
                                       "traffic_condition": TrafficCondition.MODERATE}),
            ("Bangalore", "Hyderabad", {"distance": 570, "road_type": "national_highway", "max_speed": 120, 
                                       "traffic_condition": TrafficCondition.MODERATE}),
            
            # Additional roads for expanded network
            ("Bangalore", "Chennai", {"distance": 350, "road_type": "national_highway", "max_speed": 110, 
                                      "traffic_condition": TrafficCondition.MODERATE}),
            ("Chennai", "Bangalore", {"distance": 350, "road_type": "national_highway", "max_speed": 110, 
                                      "traffic_condition": TrafficCondition.MODERATE}),
            
            ("Chennai", "Hyderabad", {"distance": 630, "road_type": "national_highway", "max_speed": 100, 
                                      "traffic_condition": TrafficCondition.LIGHT}),
            ("Hyderabad", "Chennai", {"distance": 630, "road_type": "national_highway", "max_speed": 100, 
                                      "traffic_condition": TrafficCondition.LIGHT}),
            
            ("Delhi", "Nagpur", {"distance": 1100, "road_type": "national_highway", "max_speed": 120, 
                                 "traffic_condition": TrafficCondition.LIGHT}),
            ("Nagpur", "Delhi", {"distance": 1100, "road_type": "national_highway", "max_speed": 120, 
                                 "traffic_condition": TrafficCondition.LIGHT}),
            
            ("Delhi", "Kolkata", {"distance": 1500, "road_type": "national_highway", "max_speed": 110, 
                                  "traffic_condition": TrafficCondition.MODERATE}),
            ("Kolkata", "Delhi", {"distance": 1500, "road_type": "national_highway", "max_speed": 110, 
                                  "traffic_condition": TrafficCondition.MODERATE}),
            
            ("Kolkata", "Chennai", {"distance": 1700, "road_type": "national_highway", "max_speed": 100, 
                                   "traffic_condition": TrafficCondition.LIGHT}),
            ("Chennai", "Kolkata", {"distance": 1700, "road_type": "national_highway", "max_speed": 100, 
                                   "traffic_condition": TrafficCondition.LIGHT}),
        ]
        
        G.add_edges_from(roads)
        return G

    def setup_traffic_lights(self):
        """Set up traffic lights at each junction"""
        junction_types = [
            "highway_intersection", 
            "city_intersection", 
            "rural_intersection",
            "smart_intersection"  # New smart intersection with adaptive signaling
        ]
        
        for location in self.road_network.nodes():
            # Cities with more connections get smarter intersections
            num_connections = len(list(self.road_network.edges(location)))
            
            if num_connections > 4:
                junction_type = "smart_intersection"
            elif num_connections > 2:
                junction_type = "city_intersection"
            else:
                junction_type = random.choice(junction_types[:3])  # Random from basic types
                
            self.traffic_lights[location] = TrafficLight(self.env, location, junction_type, self, cycle_time=90)

    def update_road_traffic(self, source, target, change_factor):
        """Update traffic condition on a road segment"""
        edge_data = self.road_network.edges[source, target]
        current_condition = edge_data['traffic_condition']
        
        # Get numeric index of current condition
        conditions = list(TrafficCondition)
        current_index = conditions.index(current_condition)
        
        # Apply change (positive factor increases congestion, negative decreases)
        if change_factor > 0 and current_index < len(conditions) - 1:
            # Increase congestion with probability based on change factor
            if random.random() < change_factor:
                edge_data['traffic_condition'] = conditions[current_index + 1]
        elif change_factor < 0 and current_index > 0:
            # Decrease congestion with probability based on change factor
            if random.random() < abs(change_factor):
                edge_data['traffic_condition'] = conditions[current_index - 1]

    def update_traffic_conditions(self):
        """Periodically update traffic conditions throughout the network"""
        while True:
            yield self.env.timeout(30)  # Update every 30 minutes of simulation time
            
            # Update randomly selected road segments (20% of network)
            edges_to_update = random.sample(list(self.road_network.edges()), 
                                          k=int(0.2 * len(self.road_network.edges())))
            
            for source, target in edges_to_update:
                # Random traffic change (-0.3 to +0.3 factor)
                change_factor = random.uniform(-0.3, 0.3)
                self.update_road_traffic(source, target, change_factor)
                
            # Print traffic hotspots
            self.report_traffic_hotspots()
    
    def report_traffic_hotspots(self):
        """Identify and report current traffic hotspots"""
        congested_roads = []
        
        for source, target, data in self.road_network.edges(data=True):
            if data['traffic_condition'] == TrafficCondition.CONGESTED:
                congested_roads.append((source, target))
        
        if congested_roads:
            road_list = ", ".join([f"{s}->{t}" for s, t in congested_roads])
            print(f"{self.env.now:.1f}: TRAFFIC ALERT: Congestion on: {road_list}")

    def find_shortest_path(self, start, goal, vehicle_type):
        """Dijkstra's algorithm implementation for finding shortest path considering traffic"""
        if start == goal:
            return [start]
            
        # Create a priority queue for Dijkstra's algorithm
        pq = [(0, start, [])]  # (cost, node, path)
        visited = set()
        vehicle_speed_multiplier = Vehicle.SPEED_MULTIPLIERS[vehicle_type]
        traffic_factors = Vehicle.TRAFFIC_FACTOR
        
        while pq:
            # Get node with minimum cost
            cost, node, path = heapq.heappop(pq)
            
            # If node already visited, skip it
            if node in visited:
                continue
                
            # Add node to path
            new_path = path + [node]
            
            # If goal reached, return path
            if node == goal:
                return new_path
                
            # Mark node as visited
            visited.add(node)
            
            # Check all neighbors
            for neighbor in self.road_network.neighbors(node):
                if neighbor not in visited:
                    # Get edge data
                    edge_data = self.road_network.edges[node, neighbor]
                    
                    # Calculate travel time based on distance, speed, vehicle type and traffic
                    traffic_factor = traffic_factors[edge_data['traffic_condition']]
                    travel_time = (edge_data['distance'] / edge_data['max_speed']) / (vehicle_speed_multiplier * traffic_factor)
                    
                    # Add to priority queue
                    heapq.heappush(pq, (cost + travel_time, neighbor, new_path))
        
        # No path found
        return None
    
    def record_trip(self, vehicle_id, vehicle_type, start, destination, route, travel_time, travel_data):
        """Record a completed trip for later analysis"""
        self.trip_records.append({
            'vehicle_id': vehicle_id,
            'vehicle_type': vehicle_type,
            'start': start,
            'destination': destination,
            'route': route,
            'travel_time': travel_time,
            'timestamp': self.env.now,
            'travel_data': travel_data
        })

    def analyze_traffic_data(self):
        """Analyze traffic data using merge sort and generate statistics"""
        if not self.trip_records:
            return "No trip data available for analysis"
            
        # Use merge sort to sort trips by travel time
        sorted_trips = self.merge_sort_by_time(self.trip_records)
        
        # Calculate statistics
        total_trips = len(sorted_trips)
        avg_travel_time = sum(trip['travel_time'] for trip in sorted_trips) / total_trips
        
        # Find most congested roads
        road_congestion = defaultdict(int)
        for trip in sorted_trips:
            for segment in trip['travel_data']:
                road_key = f"{segment['from']}-{segment['to']}"
                if segment['traffic'] in ['HEAVY', 'CONGESTED']:
                    road_congestion[road_key] += 1
        
        # Sort roads by congestion counts
        congested_roads = sorted(road_congestion.items(), key=lambda x: x[1], reverse=True)
        
        # Vehicle type statistics
        vehicle_stats = defaultdict(lambda: {'count': 0, 'total_time': 0})
        for trip in sorted_trips:
            v_type = trip['vehicle_type'].name
            vehicle_stats[v_type]['count'] += 1
            vehicle_stats[v_type]['total_time'] += trip['travel_time']
        
        for v_type in vehicle_stats:
            if vehicle_stats[v_type]['count'] > 0:
                vehicle_stats[v_type]['avg_time'] = vehicle_stats[v_type]['total_time'] / vehicle_stats[v_type]['count']
        
        # Prepare results
        results = {
            'total_trips': total_trips,
            'avg_travel_time': avg_travel_time,
            'fastest_trip': sorted_trips[0]['vehicle_id'] if sorted_trips else None,
            'slowest_trip': sorted_trips[-1]['vehicle_id'] if sorted_trips else None,
            'top_congested_roads': congested_roads[:5],
            'vehicle_stats': dict(vehicle_stats)
        }
        
        return results
    
    def merge_sort_by_time(self, trips):
        """Implementation of merge sort for traffic data processing"""
        if len(trips) <= 1:
            return trips
        
        # Divide
        mid = len(trips) // 2
        left = trips[:mid]
        right = trips[mid:]
        
        # Conquer
        left = self.merge_sort_by_time(left)
        right = self.merge_sort_by_time(right)
        
        # Combine
        return self.merge(left, right)
    
    def merge(self, left, right):
        """Merge two sorted lists of trips"""
        result = []
        i = j = 0
        
        while i < len(left) and j < len(right):
            if left[i]['travel_time'] < right[j]['travel_time']:
                result.append(left[i])
                i += 1
            else:
                result.append(right[j])
                j += 1
        
        result.extend(left[i:])
        result.extend(right[j:])
        return result
    
    def visualize_traffic(self):
        """Visualize current traffic network with colored edges for traffic conditions"""
        dot = graphviz.Digraph(format='png')
        
        # Add nodes
        for node in self.road_network.nodes():
            # Add node attributes
            light_state = "Unknown"
            if node in self.traffic_lights:
                light_state = self.traffic_lights[node].state
            
            # Set node color based on traffic light state
            node_color = "gray"
            if light_state == "RED":
                node_color = "red"
            elif light_state == "GREEN":
                node_color = "green"
            elif light_state == "YELLOW":
                node_color = "yellow"
                
            dot.node(node, node, style="filled", fillcolor=node_color)
        
        # Add edges with traffic information
        for source, target, data in self.road_network.edges(data=True):
            # Set edge color based on traffic condition
            edge_color = "green"  # Default
            if data['traffic_condition'] == TrafficCondition.MODERATE:
                edge_color = "orange"
            elif data['traffic_condition'] == TrafficCondition.HEAVY:
                edge_color = "red"
            elif data['traffic_condition'] == TrafficCondition.CONGESTED:
                edge_color = "purple"
            
            # Create edge label
            edge_label = f"{data['distance']}km, {data['max_speed']}km/h\n{data['traffic_condition'].name}"
            
            # Add edge to graph
            dot.edge(source, target, label=edge_label, color=edge_color)
        
        # Render the graph
        dot.render("traffic_network", view=True)
        return "traffic_network.png"
    
    def visualize_traffic_stats(self):
        """Generate visualizations of traffic statistics"""
        if not self.trip_records:
            return "No data to visualize"
            
        # Analyze data
        stats = self.analyze_traffic_data()
        
        # Create figure with subplots
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Vehicle type distribution
        vehicle_types = []
        counts = []
        avg_times = []
        
        for v_type, data in stats['vehicle_stats'].items():
            vehicle_types.append(v_type)
            counts.append(data['count'])
            avg_times.append(data['avg_time'])
        
        # Vehicle count plot
        ax1.bar(vehicle_types, counts)
        ax1.set_title('Vehicle Type Distribution')
        ax1.set_xlabel('Vehicle Type')
        ax1.set_ylabel('Count')
        
        # Average travel time plot
        ax2.bar(vehicle_types, avg_times, color='orange')
        ax2.set_title('Average Travel Time by Vehicle Type')
        ax2.set_xlabel('Vehicle Type')
        ax2.set_ylabel('Travel Time (hours)')
        
        plt.tight_layout()
        plt.savefig("traffic_stats.png")
        plt.close()
        
        # Create congestion plot
        if stats['top_congested_roads']:
            plt.figure(figsize=(10, 6))
            roads = [road for road, _ in stats['top_congested_roads']]
            counts = [count for _, count in stats['top_congested_roads']]
            
            plt.bar(roads, counts, color='red')
            plt.title('Most Congested Road Segments')
            plt.xlabel('Road Segment')
            plt.ylabel('Congestion Count')
            plt.xticks(rotation=45, ha='right')
            plt.tight_layout()
            plt.savefig("congestion_stats.png")
            plt.close()
        
        return ["traffic_stats.png", "congestion_stats.png"]
