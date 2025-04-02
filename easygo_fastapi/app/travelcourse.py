from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import re
from openai import OpenAI
import os
from dotenv import load_dotenv
import traceback

# .env 파일 로드
load_dotenv()

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class TravelPreference(BaseModel):
    region: str
    startDate: str
    endDate: str
    ageGroup: str
    travelers: dict

class TravelSpot(BaseModel):
    name: str
    time: str
    address: str
    image_url: Optional[str] = None
    description: Optional[str] = None

class TravelDay(BaseModel):
    date: str
    spots: List[TravelSpot]

class TravelCourse(BaseModel):
    days: List[TravelDay]
    tags: List[str]

def parse_generated_text(text: str, start_date: str, end_date: str) -> TravelCourse:
    print("\n=== Parsing Debug Logs ===")
    print("1. Input Text:")
    print(text)
    
    days = []
    
    # 날짜 형식 정규화
    start_date = start_date.split('T')[0]  # YYYY-MM-DD 형식으로 변환
    
    # 일차별로 분리
    day_pattern = r'(\d+)일차\s*\(([^)]+)\)(.*?)(?=\d+일차|\Z)'
    day_matches = re.finditer(day_pattern, text, re.DOTALL)
    
    print("\n2. Finding Day Sections:")
    day_sections = list(day_matches)
    print(f"Found {len(day_sections)} day sections")
    
    for match in day_sections:
        day_num = match.group(1)
        date = match.group(2).split('T')[0]  # YYYY-MM-DD 형식으로 변환
        content = match.group(3)
        
        print(f"\n3. Processing Day {day_num}:")
        print(f"Date: {date}")
        print(f"Content:\n{content}")
        
        spots = []
        # 시간과 장소 정보 추출
        spot_pattern = r'(\d{2}:\d{2})\s+(.*?)\s+-\s+(.*?)\s+-\s+(.*?)(?=\n\d{2}:\d{2}|\Z)'
        spot_matches = re.finditer(spot_pattern, content.strip(), re.DOTALL)
        
        print("\n4. Extracting Spots:")
        for spot_match in spot_matches:
            time, name, address, description = [s.strip() for s in spot_match.groups()]
            print(f"\nSpot found:")
            print(f"Time: {time}")
            print(f"Name: {name}")
            print(f"Address: {address}")
            print(f"Description: {description}")
            
            spots.append(TravelSpot(
                name=name,
                time=time,
                address=address,
                description=description
            ))
        
        if spots:
            print(f"\nAdding day {day_num} with {len(spots)} spots")
            days.append(TravelDay(
                date=date,
                spots=spots
            ))
        else:
            print(f"\nNo spots found for day {day_num}")

    # 텍스트에서 키워드 추출하여 태그 생성
    keywords = ["맛집", "관광", "문화", "쇼핑", "자연", "휴식", "체험", "역사"]
    tags = [kw for kw in keywords if kw in text]
    if not tags:
        tags = ["추천 코스"]

    print("\n5. Final Result:")
    print(f"Total days: {len(days)}")
    print(f"Tags: {tags}")
    
    result = TravelCourse(days=days, tags=tags)
    print("\n6. Generated Course Object:")
    print(result.model_dump_json(indent=2))
    
    return result

@router.post("", response_model=TravelCourse)
async def generate_travel_course(preferences: TravelPreference):
    try:
        start_date = preferences.startDate.split('T')[0]
        end_date = preferences.endDate.split('T')[0]
        
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        total_days = (end - start).days + 1

        # 연령대와 인원에 따른 맞춤형 추천을 위한 상세 정보
        age_preferences = {
            '10대': '트렌디한 장소, 인스타감성의 카페, 즐거운 액티비티',
            '20대': '핫플레이스, SNS 맛집, 분위기 좋은 카페',
            '30대': '여유로운 관광, 맛집 탐방, 문화예술 공간',
            '40대': '편안한 관광지, 전통 맛집, 역사문화 명소',
            '50대': '자연 명소, 건강식당, 전통시장',
            '60대 이상': '접근성 좋은 관광지, 편한 식당, 휴식공간'
        }

        prompt = f"""
당신은 {preferences.region} 지역 전문 여행 플래너입니다. 
{preferences.ageGroup}와 함께하는 {total_days}일간의 여행 일정을 만들어주세요.

여행 조건:
1. 여행객 정보:
   - 연령대: {preferences.ageGroup} ({age_preferences.get(preferences.ageGroup, '일반적인 선호')})
   - 인원: {', '.join(f'{k}: {v}명' for k, v in preferences.travelers.items() if v > 0)}

2. 일정 구성 시 고려사항:
   - 아침은 호텔 조식 또는 현지 유명 식당
   - 점심과 저녁은 지역 맛집 추천
   - 관광지 사이에 휴식을 위한 카페 포함
   - 저녁에는 야경이 좋은 장소나 로컬 분위기의 장소 추천
   - 숙소는 접근성과 편의성을 고려하여 추천

3. 장소별 포함할 정보:
   - 정확한 도로명 주소
   - 유명한 메뉴나 볼거리
   - 예상 소요시간
   - 특별한 팁이나 주의사항

다음 형식으로 일정을 작성해주세요:
"""
        # 각 일차별 템플릿 생성
        for day in range(total_days):
            current_date = start + timedelta(days=day)
            prompt += f"""
{day+1}일차 ({current_date.strftime('%Y-%m-%d')})
08:00 아침식사 장소 - 주소 - 추천메뉴 및 설명
10:00 오전 관광지 - 주소 - 주요 볼거리 및 설명
12:30 점심식사 장소 - 주소 - 추천메뉴 및 설명
14:00 오후 관광지 - 주소 - 주요 볼거리 및 설명
16:00 카페 또는 휴식 장소 - 주소 - 분위기 및 추천메뉴
18:00 저녁식사 장소 - 주소 - 추천메뉴 및 설명
20:00 야간 관광지 - 주소 - 특별한 즐길거리
"""

        if total_days > 1:
            prompt += f"""
숙소 추천:
- 위치: 주요 관광지와의 접근성
- 등급: 3성급 이상 추천
- 주변 편의시설 정보
"""

        prompt += f"""
추가 고려사항:
1. 동선 최적화: 이동 시간 최소화
2. 날씨와 계절성 고려
3. {preferences.ageGroup}의 선호도와 체력 고려
4. 식사 시간은 적절한 간격으로 배치
5. 각 장소의 혼잡도와 대기 시간 고려
6. 대중교통 또는 도보 이동 가능성 명시
"""

        print("\n2. Generated Prompt:")
        print(prompt)
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "당신은 여행 전문 플래너입니다. 현지의 숨은 명소와 맛집까지 상세히 알고 있으며, 여행객의 특성에 맞는 최적의 일정을 제안합니다."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        generated_text = response.choices[0].message.content
        print("\n3. GPT Response:")
        print(generated_text)
        
        travel_course = parse_generated_text(generated_text, start_date, end_date)
        return travel_course

    except Exception as e:
        print(f"\nError occurred: {str(e)}")
        print(f"Error details: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
