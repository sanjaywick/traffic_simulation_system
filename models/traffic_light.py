import numpy as np
from utils.enums import TrafficCondition

class TrafficLight:
    def __init__(self, env, location, junction_type, traffic_manager, cycle_time=60):
        self.env = env
        self.location = location
        self.junction_type = junction_type
        self.traffic_manager = traffic_manager
        self.base_cycle_time = cycle_time
        self.state = "RED"
        self.adaptive = (junction_type == "smart_intersection")
        self.process = env.process(self.run())
        self.traffic_history = []  # For dynamic programming optimization

    def run(self):
        while True:
            # Get current traffic densities from all incoming roads
            incoming_traffic = []
            for source, target, data in self.traffic_manager.road_network.edges(data=True):
                if target == self.location:
                    traffic_value = self.TRAFFIC_FACTOR[data['traffic_condition']]
                    incoming_traffic.append((source, traffic_value))
            
            # Sort incoming roads by traffic density
            incoming_traffic.sort(key=lambda x: x[1], reverse=True)
            
            # Save traffic pattern for dynamic programming
            self.traffic_history.append([t[1] for t in incoming_traffic])
            if len(self.traffic_history) > 100:  # Keep reasonable history
                self.traffic_history.pop(0)
            
            # Apply dynamic programming for smart intersections
            if self.adaptive and len(self.traffic_history) > 10:
                green_time = self.optimize_signals_dp()
            else:
                # Basic traffic-based optimization
                traffic_density = sum(t[1] for t in incoming_traffic) / max(1, len(incoming_traffic))
                green_time = self.optimize_green_time(traffic_density * 100)  # Scale to 0-100
            
            # Execute traffic light cycle
            self.state = "GREEN"
            print(f"{self.env.now:.1f}: Traffic light at {self.location} turned GREEN for {green_time}s")
            yield self.env.timeout(green_time)
            
            # Yellow transition
            self.state = "YELLOW"
            yield self.env.timeout(5)  # 5 seconds yellow
            
            self.state = "RED"
            red_time = self.base_cycle_time - green_time - 5  # Subtract yellow time
            print(f"{self.env.now:.1f}: Traffic light at {self.location} turned RED for {red_time}s")
            yield self.env.timeout(red_time)

    def optimize_green_time(self, traffic_density):
        # Different junction types get different green time optimization
        junction_multipliers = {
            "highway_intersection": 0.7,
            "city_intersection": 1.0,
            "rural_intersection": 1.3,
            "smart_intersection": 1.5  # Smart intersections have more flexibility
        }
        multiplier = junction_multipliers.get(self.junction_type, 1.0)
        return int(max(10, min(traffic_density * multiplier // 2, 60)))
    
    def optimize_signals_dp(self):
        """Dynamic Programming approach for traffic signal optimization"""
        # Use recent traffic history to predict pattern and optimize
        n = len(self.traffic_history)
        if n < 2:
            return 30  # Default if not enough history
        
        # Create a state transition model using recent history
        states = 5  # Discretize traffic into 5 levels
        transitions = np.zeros((states, states))
        
        # Convert traffic values to discrete states
        discretized_states = []
        for traffic in self.traffic_history:
            avg_traffic = sum(traffic) / max(1, len(traffic))
            state = min(int(avg_traffic * states), states - 1)
            discretized_states.append(state)
        
        # Count transitions
        for i in range(1, len(discretized_states)):
            prev_state = discretized_states[i-1]
            curr_state = discretized_states[i]
            transitions[prev_state][curr_state] += 1
        
        # Normalize to get probabilities
        for i in range(states):
            row_sum = sum(transitions[i])
            if row_sum > 0:
                transitions[i] = transitions[i] / row_sum
        
        # Predict next state
        curr_state = discretized_states[-1]
        next_state_probs = transitions[curr_state]
        predicted_state = np.argmax(next_state_probs)
        
        # Map predicted state to green time
        min_green = 15
        max_green = 60
        green_time = min_green + (predicted_state / (states - 1)) * (max_green - min_green)
        
        return int(green_time)
    
    # Traffic factor mapping for signal optimization
    TRAFFIC_FACTOR = {
        TrafficCondition.LIGHT: 0.2,
        TrafficCondition.MODERATE: 0.4,
        TrafficCondition.HEAVY: 0.7,
        TrafficCondition.CONGESTED: 1.0
    }
