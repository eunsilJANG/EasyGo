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
    private final Long userId;
    private final LocalDateTime createdAt;
    private final List<String> fileUrls;
    private final Long viewCount;
    private final Long likeCount;
    private boolean likecheck;  // liked에서 likecheck로 변경

    public ArticleResponse(Article article, boolean likecheck) {  // 파라미터 이름 변경
        this.id = article.getId();
        this.title = article.getTitle();
        this.content = article.getContent();
        this.nickname = article.getUser().getNickname();
        this.userId = article.getUser().getId();
        this.createdAt = article.getCreatedAt();
        this.fileUrls = article.getFileUrls() != null ? article.getFileUrls() : new ArrayList<>();
        this.viewCount = article.getViewCount();
        this.likeCount = article.getLikeCount();
        this.likecheck = likecheck;  // 변수명 변경
    }

    // 기존 생성자도 유지 (isLiked를 false로 기본 설정)
    public ArticleResponse(Article article) {
        this(article, false);
    }

    public boolean getLikecheck() {  // getLiked에서 getLikecheck로 변경
        return likecheck;
    }
}
