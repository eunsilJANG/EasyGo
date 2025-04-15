package me.eunsil.springbootdeveloper.controller;

import lombok.RequiredArgsConstructor;
import me.eunsil.springbootdeveloper.domain.Course;
import me.eunsil.springbootdeveloper.service.CourseService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/courses")
public class SaveCourseController {
  private final CourseService courseService;

    @PostMapping
    public ResponseEntity<Course> saveCourse(
        @RequestBody Course course,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        Course savedCourse = courseService.saveCourse(course, userDetails.getUsername());
        return ResponseEntity.ok(savedCourse);
    }

    @GetMapping("/user")
    public ResponseEntity<List<Course>> getUserCourses(
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        List<Course> courses = courseService.getUserCourses(userDetails.getUsername());
        return ResponseEntity.ok(courses);
    }

    @DeleteMapping("/{courseId}")
    public ResponseEntity<Void> deleteCourse(
        @PathVariable("courseId") String courseId,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        courseService.deleteCourse(courseId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{courseId}")
    public ResponseEntity<Course> updateCourse(
        @PathVariable("courseId") String courseId,
        @RequestBody Course course,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        Course updatedCourse = courseService.updateCourse(courseId, course, userDetails.getUsername());
        return ResponseEntity.ok(updatedCourse);
    }
}

