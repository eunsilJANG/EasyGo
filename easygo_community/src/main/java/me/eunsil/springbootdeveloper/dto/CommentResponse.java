package me.eunsil.springbootdeveloper.dto;

import lombok.*;
import me.eunsil.springbootdeveloper.domain.Comment;

import java.time.LocalDateTime;
import java.util.List;  // 이 import 추가
import java.util.stream.Collectors;  // 이것도 필요합니다


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
    private Long parentId;
    private Integer depth;
    private List<CommentResponse> children;


    public CommentResponse(Comment comment, Long currentUserId){
        this.id = comment.getId();
        this.articleId = comment.getArticle().getId();
        this.content = comment.getContent();
        this.nickname = comment.getUser().getNickname();
        this.userid = comment.getUser().getId();
        this.createdAt = comment.getCreatedAt();
        this.minecheck = comment.getUser().getId().equals(currentUserId);
        this.parentId = comment.getParent() !=null ? comment.getParent().getId() : null;
        this.depth = comment.getDepth();
        this.children = comment.getChildren().stream().map(child -> new CommentResponse(child, currentUserId)).toList();
        

    }


}
