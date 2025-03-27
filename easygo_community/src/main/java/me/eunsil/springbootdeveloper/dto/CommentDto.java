package me.eunsil.springbootdeveloper.dto;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CommentDto {

    private String content;
    private Long articleId;
    private Long userId;
}
