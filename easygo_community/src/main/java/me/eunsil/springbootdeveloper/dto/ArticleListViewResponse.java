package me.eunsil.springbootdeveloper.dto;

import lombok.Getter;
import me.eunsil.springbootdeveloper.domain.Article;

import java.time.LocalDateTime;

@Getter
public class ArticleListViewResponse {
    private final Long id;
    private final String title;
    private final String content;
    private final String nickname;  // User의 nickname을 저장
    private final LocalDateTime createdAt;
    private final Long viewCount;
    private final Long likeCount;

    public ArticleListViewResponse(Article article) {
        this.id = article.getId();
        this.title = article.getTitle();
        this.content = article.getContent();
        this.nickname = article.getUser().getNickname();  // User 엔티티에서 nickname 가져오기
        this.createdAt = article.getCreatedAt();
        this.viewCount = article.getViewCount();
        this.likeCount = article.getLikeCount();
    }
}
