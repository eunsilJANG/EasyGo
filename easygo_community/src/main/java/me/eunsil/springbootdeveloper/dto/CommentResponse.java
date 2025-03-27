package me.eunsil.springbootdeveloper.dto;

import lombok.*;
import me.eunsil.springbootdeveloper.domain.Comment;

import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Builder
public class CommentResponse {

    private Long id;
    private Long articleId;
    private String content;
    private String nickname;
    private long userid;
    private LocalDateTime createdAt;
    private boolean minecheck;

    public CommentResponse(Comment comment, Long currentUserId){
        this.id = comment.getId();
        this.articleId = comment.getArticle().getId();
        this.content = comment.getContent();
        this.nickname = comment.getUser().getNickname();
        this.userid = comment.getUser().getId();
        this.createdAt = comment.getCreatedAt();
        this.minecheck = comment.getUser().getId().equals(currentUserId);
    }


}
