import random
import enum
from utils.enums import VehicleType, TrafficCondition

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
    
    TRAFFIC_FACTOR = {
        TrafficCondition.LIGHT: 1.0,
        TrafficCondition.MODERATE: 0.8,
        TrafficCondition.HEAVY: 0.5,
        TrafficCondition.CONGESTED: 0.2
    }

    def __init__(self, env, vehicle_id, vehicle_type, start, destination, traffic_manager):
        self.env = env
        self.vehicle_id = vehicle_id
        self.vehicle_type = vehicle_type
        self.start = start
        self.destination = destination
        self.traffic_manager = traffic_manager
        self.speed_multiplier = self.SPEED_MULTIPLIERS[vehicle_type.value]
        self.route = []
        self.current_node = start
        self.next_node = None
        self.travel_data = []  # Store travel segments for later analysis
        self.route_replanning_threshold = 0.7  # Reroute if congestion reduces speed by 70%
        self.total_travel_time = 0
        
    def plan_route(self):
        # Initially use Dijkstra's algorithm for shortest path
        self.route = self.traffic_manager.find_shortest_path(self.start, self.destination, self.vehicle_type)
        print(f"{self.vehicle_id} ({self.vehicle_type.name}) Initial Route: {' -> '.join(self.route)}")
        
    def consider_rerouting(self, current_node):
        # Dynamic rerouting based on real-time traffic conditions
        # Only consider rerouting if we're not too close to destination
        if current_node != self.destination and current_node != self.route[-2]:
            current_idx = self.route.index(current_node)
            remaining_route = self.route[current_idx:]
            
            # Check traffic conditions on planned route
            congestion_level = 0
            for i in range(len(remaining_route) - 1):
                node1, node2 = remaining_route[i], remaining_route[i+1]
                traffic = self.traffic_manager.road_network.edges[node1, node2]['traffic_condition']
                congestion_level += self.TRAFFIC_FACTOR[traffic]
            
            average_congestion = congestion_level / (len(remaining_route) - 1) if len(remaining_route) > 1 else 0
            
            # If average congestion is high, consider rerouting
            if average_congestion < self.route_replanning_threshold:
                new_route = self.traffic_manager.find_shortest_path(current_node, self.destination, self.vehicle_type)
                if new_route and len(new_route) > 1:
                    old_remaining = ' -> '.join(remaining_route)
                    new_remaining = ' -> '.join(new_route)
                    
                    # Only reroute if the new route is significantly different
                    if new_remaining != old_remaining:
                        print(f"{self.vehicle_id} REROUTING at {current_node}: {new_remaining}")
                        # Replace the remainder of the route with the new path
                        self.route = self.route[:current_idx] + new_route
                        return True
        return False

    def drive(self):
        # Plan initial route
        self.plan_route()
        
        if not self.route or len(self.route) < 2:
            print(f"{self.vehicle_id} ({self.vehicle_type.name}) No valid route found from {self.start} to {self.destination}")
            return
            
        for i in range(len(self.route) - 1):
            current_node = self.route[i]
            self.current_node = current_node
            next_node = self.route[i + 1]
            self.next_node = next_node
            
            # Check if we should reroute based on current traffic conditions
            if i > 0 and random.random() < 0.3:  # 30% chance to consider rerouting at each junction
                if self.consider_rerouting(current_node):
                    # If route was changed, restart the loop with new route
                    return self.env.process(self.drive())
            
            # Wait for traffic light if it's red
            traffic_light = self.traffic_manager.traffic_lights.get(current_node)
            if traffic_light and traffic_light.state == "RED":
                delay = random.randint(10, 60)
                print(f"{self.env.now:.1f}: {self.vehicle_id} waiting at RED light in {current_node} for {delay}s")
                yield self.env.timeout(delay)
                self.total_travel_time += delay
            
            # Travel to next node
            edge_data = self.traffic_manager.road_network.edges[current_node, next_node]
            traffic_condition = edge_data['traffic_condition']
            
            # Calculate travel time based on distance, speed limit, vehicle type, and traffic
            base_travel_time = edge_data['distance'] / edge_data['max_speed']
            traffic_factor = self.TRAFFIC_FACTOR[traffic_condition]
            actual_travel_time = base_travel_time / (self.speed_multiplier * traffic_factor)
            
            # Record this segment for later analysis
            self.travel_data.append({
                'from': current_node,
                'to': next_node,
                'distance': edge_data['distance'],
                'road_type': edge_data['road_type'],
                'traffic': traffic_condition.name,
                'travel_time': actual_travel_time
            })
            
            print(f"{self.env.now:.1f}: {self.vehicle_id} ({self.vehicle_type.name}) traveling from {current_node} to {next_node} with {traffic_condition.name} traffic (Time: {actual_travel_time:.1f}hr)")
            
            # Update traffic condition as vehicle enters the road
            self.traffic_manager.update_road_traffic(current_node, next_node, 0.1)  # Slightly increase traffic
            
            yield self.env.timeout(actual_travel_time * 60)  # Convert to minutes for simulation
            self.total_travel_time += actual_travel_time * 60
            
            # Update traffic condition as vehicle leaves the road
            self.traffic_manager.update_road_traffic(current_node, next_node, -0.05)  # Slightly decrease traffic
        
        print(f"{self.env.now:.1f}: {self.vehicle_id} ({self.vehicle_type.name}) reached destination {self.destination} in {self.total_travel_time/60:.2f}hr")
        
        # Record total trip statistics
        self.traffic_manager.record_trip(self.vehicle_id, self.vehicle_type, self.start, self.destination, 
                                        self.route, self.total_travel_time/60, self.travel_data)
