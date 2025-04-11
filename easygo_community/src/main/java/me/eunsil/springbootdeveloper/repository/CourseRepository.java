package me.eunsil.springbootdeveloper.repository;

import me.eunsil.springbootdeveloper.domain.Course;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CourseRepository extends MongoRepository<Course, String> {
    List<Course> findByUserId(String userID);
}
