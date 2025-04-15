from typing import List, Optional, Dict
from datetime import datetime, timedelta
import logging
from .database import redis_client
from .models import PlaceData, CacheData

logger = logging.getLogger(__name__)

class PlaceRepository:
    @staticmethod
    def create_place(place_data: PlaceData) -> Optional[PlaceData]:
        """새로운 장소 정보 생성"""
        try:
            key = f"place:{place_data['region']}:{place_data['category']}:{place_data['name']}"
            place_data['created_at'] = datetime.utcnow().isoformat()
            redis_client.set_data(key, place_data)
            return place_data
        except Exception as e:
            logger.error(f"Error creating place: {str(e)}")
            return None

    @staticmethod
    def get_places(region: str, category: str, areas: List[str]) -> List[PlaceData]:
        """지역과 카테고리로 장소 검색"""
        try:
            all_places = []
            for area in areas:
                pattern = f"place:{region}:{category}:{area}:*"
                keys = redis_client.redis.keys(pattern)
                for key in keys:
                    if place_data := redis_client.get_data(key):
                        all_places.append(place_data)
            return all_places
        except Exception as e:
            logger.error(f"Error fetching places: {str(e)}")
            return []

    @staticmethod
    def bulk_create_places(places: List[PlaceData], region: str, category: str) -> List[PlaceData]:
        """여러 장소 정보 한 번에 생성"""
        try:
            created_places = []
            for place in places:
                key = f"place:{region}:{category}:{place['name']}"
                place['created_at'] = datetime.utcnow().isoformat()
                redis_client.set_data(key, place)
                created_places.append(place)
            return created_places
        except Exception as e:
            logger.error(f"Error in bulk create: {str(e)}")
            return []

    @staticmethod
    def update_place_cache(region: str, area: str, category: str) -> Optional[CacheData]:
        """캐시 정보 업데이트"""
        try:
            cache_data: CacheData = {
                'region': region,
                'area': area,
                'category': category,
                'last_updated': datetime.utcnow().isoformat()
            }
            key = f"cache:{region}:{category}:{area}"
            redis_client.set_data(key, cache_data)
            return cache_data
        except Exception as e:
            logger.error(f"Error updating cache: {str(e)}")
            return None

    @staticmethod
    def is_cache_valid(region: str, category: str, cache_duration: timedelta = timedelta(days=7)) -> bool:
        """캐시 유효성 검사"""
        try:
            pattern = f"cache:{region}:{category}:*"
            keys = redis_client.redis.keys(pattern)
            if not keys:
                return False
            
            for key in keys:
                if cache_data := redis_client.get_data(key):
                    last_updated = datetime.fromisoformat(cache_data['last_updated'])
                    if datetime.utcnow() - last_updated <= cache_duration:
                        return True
            return False
        except Exception as e:
            logger.error(f"Error checking cache validity: {str(e)}")
            return False 