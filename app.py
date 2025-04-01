from flask import Flask, render_template, jsonify, send_from_directory
import json
import simpy
from models.traffic_manager import TrafficManager
from models.vehicle import Vehicle
from models.traffic_light import TrafficLight
from models.traffic_simulation import TrafficSimulation
from utils.enums import EnumEncoder

app = Flask(__name__, static_folder="static")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

@app.route('/simulate', methods=['POST'])
def simulate():

    env = simpy.Environment()
    traffic_sim = TrafficSimulation(env)
    traffic_sim.run()

    simulation_data = {
        "vehicles": [{"x": v.position[0], "y": v.position[1], "type": v.vehicle_type.name} for v in traffic_sim.vehicles],
        "traffic_lights": [{"x": tl.position[0], "y": tl.position[1], "state": tl.state} for tl in traffic_sim.traffic_manager.traffic_lights]
    }

    return app.response_class(
        response=json.dumps(simulation_data, cls=EnumEncoder),
        status=200,
        mimetype='application/json'
    )

if __name__ == '__main__':
    app.run(debug=True)
