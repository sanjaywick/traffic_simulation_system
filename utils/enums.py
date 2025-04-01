import json
import enum

class EnumEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, enum.Enum):
            return obj.name
        return super().default(obj)

class VehicleType(enum.Enum):
    TRUCK = 1
    CAR = 2
    BUS = 3
    MOTORCYCLE = 4

class TrafficCondition(enum.Enum):
    LIGHT = 1
    MODERATE = 2
    HEAVY = 3
    CONGESTED = 4
