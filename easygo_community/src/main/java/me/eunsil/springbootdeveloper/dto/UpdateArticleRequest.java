package me.eunsil.springbootdeveloper.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Getter
public class UpdateArticleRequest {

private Long id;
private String title;
private String content;
private LocalDateTime updatedAt;
private List<String> fileUrls;

}
