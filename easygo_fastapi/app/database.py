import redis
from typing import Dict, List, Optional
import json
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

class RedisClient:
    def __init__(self):
        self.redis = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=int(os.getenv('REDIS_DB', 0)),
            decode_responses=True
        )
        self.CACHE_TTL = 60 * 60 * 24  # 24시간

    def get_key(self, *args) -> str:
        return ':'.join(map(str, args))

    def set_data(self, key: str, data: Dict, ttl: int = None) -> None:
        self.redis.setex(key, ttl or self.CACHE_TTL, json.dumps(data))

    def get_data(self, key: str) -> Optional[Dict]:
        data = self.redis.get(key)
        return json.loads(data) if data else None

redis_client = RedisClient() 