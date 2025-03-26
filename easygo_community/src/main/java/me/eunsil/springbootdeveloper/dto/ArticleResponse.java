package me.eunsil.springbootdeveloper.dto;

import lombok.Getter;
import lombok.ToString;
import me.eunsil.springbootdeveloper.domain.Article;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@ToString
@Getter
public class ArticleResponse {
    private final Long id;
    private final String title;
    private final String content;
    private final String nickname;
    private final LocalDateTime createdAt;
    private final List<String> fileUrls;

    public ArticleResponse(Article article) {
        this.id = article.getId();
        this.title = article.getTitle();
        this.content = article.getContent();
        this.nickname = article.getUser().getNickname();
        this.createdAt = article.getCreatedAt();
        this.fileUrls = article.getFileUrls() != null ? article.getFileUrls() : new ArrayList<>();
    }
}
