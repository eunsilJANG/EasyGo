package me.eunsil.springbootdeveloper.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.util.List;

@Getter
@AllArgsConstructor
public class RouteDTO {
    private List<SpotCoordinate> coordinates;
}
