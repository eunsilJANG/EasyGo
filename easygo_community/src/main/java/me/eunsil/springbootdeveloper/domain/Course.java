package me.eunsil.springbootdeveloper.domain;

import lombok.Data;
import lombok.NoArgsConstructor;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "courses")
@TypeAlias("Course")
@Data
@NoArgsConstructor
public class Course {
    @Id
    private String id;

    @org.springframework.data.mongodb.core.index.Indexed
    private String userId;
    private String name;
    private String location;
    private List<Day> days;
    private List<String> tags;
    @CreatedDate
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @NoArgsConstructor
    public static class Day {
        private String date;
        private List<Spot> spots;
    }

    @Data
    @NoArgsConstructor
    public static class Spot {
        private String name;
        private String time;
        private String address;
        private Coordinates coordinates;
        private String description;
        private String category;
    }

    @Data
    @NoArgsConstructor
    public static class Coordinates {
        private double lat;
        private double lng;
        
        public Coordinates(double lat, double lng) {
            this.lat = lat;
            this.lng = lng;
        }
    }
}
