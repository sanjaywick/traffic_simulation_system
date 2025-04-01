import random
import simpy
from models.vehicle import Vehicle
from utils.enums import VehicleType
from models.traffic_manager import TrafficManager

class TrafficSimulation:
    def __init__(self, env=None, simulation_time=2000):
        self.env = env if env else simpy.Environment()  # Use provided env or create new one
        self.traffic_manager = TrafficManager(self.env)
        self.vehicles = []
        self.simulation_time = simulation_time
        self.env.process(self.generate_random_vehicles())

    def add_vehicle(self, vehicle_id, vehicle_type, start, destination):
        """Add a new vehicle to the simulation"""
        # Only add vehicle if start and destination nodes exist
        if start in self.traffic_manager.road_network.nodes() and destination in self.traffic_manager.road_network.nodes():
            vehicle = Vehicle(self.env, vehicle_id, vehicle_type, start, destination, self.traffic_manager)
            self.vehicles.append(vehicle)
            self.env.process(vehicle.drive())
            return True
        else:
            print(f"Error: Cannot add vehicle {vehicle_id}. Invalid start or destination.")
            return False
    
    def generate_random_vehicles(self):
        """Generate random vehicles throughout the simulation"""
        while True:
            # Wait random interval between adding vehicles
            yield self.env.timeout(random.randint(10, 40))
            
            # Only add vehicles up to certain simulation time
            if self.env.now < self.simulation_time * 0.9:  # Stop adding vehicles near end
                # Get random start and destination
                nodes = list(self.traffic_manager.road_network.nodes())
                start = random.choice(nodes)
                
                # Choose a different node for destination
                possible_destinations = [n for n in nodes if n != start]
                if possible_destinations:
                    destination = random.choice(possible_destinations)
                    
                    # Random vehicle type
                    vehicle_type = random.choice(list(VehicleType))
                    vehicle_id = f"{vehicle_type.name[:3]}-{random.randint(1000, 9999)}"
                    
                    self.add_vehicle(vehicle_id, vehicle_type, start, destination)
    
    def run(self):
        """Run the simulation for the specified time"""
        # Starting vehicles
        self.add_vehicle("Truck1", VehicleType.TRUCK, "Mumbai", "Bangalore")
        self.add_vehicle("Car1", VehicleType.CAR, "Pune", "Bangalore")
        self.add_vehicle("Bus1", VehicleType.BUS, "Nashik", "Nagpur")
        self.add_vehicle("Motorcycle1", VehicleType.MOTORCYCLE, "Hyderabad", "Mumbai")
        self.add_vehicle("Car2", VehicleType.CAR, "Delhi", "Chennai")
        self.add_vehicle("Bus2", VehicleType.BUS, "Kolkata", "Mumbai")
        
        # Start simulation
        print(f"Starting traffic simulation for {self.simulation_time} time units...")
        self.env.run(until=self.simulation_time)
        
        # After simulation is complete, analyze traffic data
        self.analyze_results()
    
    def analyze_results(self):
        """Analyze and visualize simulation results"""
        print("\n===== SIMULATION RESULTS =====")
        
        # Get trip statistics
        stats = self.traffic_manager.analyze_traffic_data()
        
        # Print results
        if isinstance(stats, dict):
            print(f"Total trips completed: {stats['total_trips']}")
            print(f"Average travel time: {stats['avg_travel_time']:.2f} hours")
            
            if stats['fastest_trip']:
                print(f"Fastest trip: {stats['fastest_trip']}")
            
            if stats['slowest_trip']:
                print(f"Slowest trip: {stats['slowest_trip']}")
            
            print("\nMost congested roads:")
            for road, count in stats['top_congested_roads']:
                print(f"  {road}: {count} congestion events")
            
            print("\nVehicle type statistics:")
            for v_type, data in stats['vehicle_stats'].items():
                print(f"  {v_type}: {data['count']} vehicles, avg travel time: {data.get('avg_time', 0):.2f} hours")
        else:
            print(stats)  # Error message
        
        # Generate traffic network visualization
        self.traffic_manager.visualize_traffic()
        
        # Generate statistical visualizations
        self.traffic_manager.visualize_traffic_stats()
        
        print("\nSimulation complete. Visualizations saved.")
