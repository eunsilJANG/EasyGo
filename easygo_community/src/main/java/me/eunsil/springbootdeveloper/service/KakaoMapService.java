package me.eunsil.springbootdeveloper.service;

import lombok.RequiredArgsConstructor;
import me.eunsil.springbootdeveloper.domain.Course;
import me.eunsil.springbootdeveloper.dto.SpotCoordinate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class KakaoMapService {

    @Value("${kakao.api.key}")
    private String kakaoApiKey;

    private final RestTemplate restTemplate;

    public SpotCoordinate getCoordinates(Course.Spot spot) {
        String url = "https://dapi.kakao.com/v2/local/search/address.json";
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "KakaoAK " + kakaoApiKey);
        
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(url)
            .queryParam("query", spot.getAddress());
        
        HttpEntity<?> entity = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                builder.toUriString(),
                HttpMethod.GET,
                entity,
                Map.class
            );
            
            Map<String, Object> body = response.getBody();
            List<Map<String, Object>> documents = (List<Map<String, Object>>) body.get("documents");
            
            if (!documents.isEmpty()) {
                Map<String, Object> firstResult = documents.get(0);
                double latitude = Double.parseDouble((String) firstResult.get("y"));
                double longitude = Double.parseDouble((String) firstResult.get("x"));
                
                // 좌표 정보를 Spot 객체에도 저장
                spot.setCoordinates(new Course.Coordinates(latitude, longitude));
                
                return new SpotCoordinate(
                    spot.getName(),
                    spot.getTime(),
                    latitude,
                    longitude
                );
            }
            
            throw new RuntimeException("주소를 찾을 수 없습니다: " + spot.getAddress());
        } catch (Exception e) {
            throw new RuntimeException("좌표 변환 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
}
