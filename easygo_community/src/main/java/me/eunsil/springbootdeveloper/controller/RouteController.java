package me.eunsil.springbootdeveloper.controller;

import lombok.RequiredArgsConstructor;
import me.eunsil.springbootdeveloper.domain.Course;
import me.eunsil.springbootdeveloper.dto.RouteDTO;
import me.eunsil.springbootdeveloper.dto.SpotCoordinate;
import me.eunsil.springbootdeveloper.service.CourseService;
import me.eunsil.springbootdeveloper.service.KakaoMapService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/routes")
public class RouteController {

    private final CourseService courseService;
    private final KakaoMapService kakaoMapService;

    @GetMapping("/{courseId}")
    public ResponseEntity<RouteDTO> getRouteInfo(@PathVariable String courseId) {
        try {
            Course course = courseService.getCourseById(courseId);
            List<SpotCoordinate> coordinates = new ArrayList<>();

            // 각 일자별 스팟 좌표 변환
            for (Course.Day day : course.getDays()) {
                if (day.getSpots() != null) {
                    List<SpotCoordinate> dayCoordinates = day.getSpots().stream()
                        .filter(spot -> spot.getAddress() != null && !spot.getAddress().isEmpty())
                        .map(spot -> kakaoMapService.getCoordinates(spot))
                        .collect(Collectors.toList());
                    coordinates.addAll(dayCoordinates);
                }
            }

            return ResponseEntity.ok(new RouteDTO(coordinates));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new RouteDTO(new ArrayList<>()));
        }
    }
}

