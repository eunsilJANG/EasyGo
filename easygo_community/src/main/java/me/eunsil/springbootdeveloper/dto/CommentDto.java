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
    private Long parentId;  // 대댓글인 경우 부모 댓글 ID
}
