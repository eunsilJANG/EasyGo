package me.eunsil.springbootdeveloper.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class SpotCoordinate {

    private String name;
    private String time;
    private double latitude;
    private double longitude;
}
