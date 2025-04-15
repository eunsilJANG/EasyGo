from typing import TypedDict, Optional, List
from datetime import datetime

class PlaceData(TypedDict):
    name: str
    address: str
    category: str
    region: str
    area: str
    latitude: Optional[float]
    longitude: Optional[float]
    created_at: str

class CacheData(TypedDict):
    region: str
    area: str
    category: str
    last_updated: str 