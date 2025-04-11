package me.eunsil.springbootdeveloper.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import me.eunsil.springbootdeveloper.domain.Course;
import me.eunsil.springbootdeveloper.repository.CourseRepository;
import me.eunsil.springbootdeveloper.exception.ResourceNotFoundException;
import me.eunsil.springbootdeveloper.exception.UnauthorizedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class CourseService {
     private final CourseRepository courseRepository;

     public Course saveCourse(Course course, String userId) {
        course.setUserId(userId);
        course.setCreatedAt(LocalDateTime.now());
        return courseRepository.save(course);
     }

     public List<Course> getUserCourses(String userId) {
        return courseRepository.findByUserId(userId);
     }

     public void deleteCourse(String courseId, String userId) {
        Course course = courseRepository.findById(courseId).orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        if(!course.getUserId().equals(userId)) {
            throw new UnauthorizedException("Not authorized to delete this course");
        }

        courseRepository.delete(course);
     }
}
