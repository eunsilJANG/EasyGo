package me.eunsil.springbootdeveloper.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Article {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Id", updatable = false)
    private Long id;

    @CreatedDate // 엔티티가 생성될 때 생성 시간 저장
    @Column(name = "createdat")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updatedat")
    private LocalDateTime updatedAt;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "content", nullable = false)
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @ElementCollection  // 컬렉션 매핑
    @CollectionTable(
        name = "article_file_urls",  // 새로운 테이블 이름
        joinColumns = @JoinColumn(name = "article_id")  // 외래 키
    )
    @Column(name = "file_url")
    private List<String> fileUrls = new ArrayList<>();  // 파일 URL 목록

    @Builder(toBuilder = true)
    public Article(String title, String content, User user, LocalDateTime createdAt, LocalDateTime updatedAt, List<String> fileUrls) {
        this.title = title;
        this.content = content;
        this.user = user;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        if (fileUrls != null) {
            this.fileUrls = fileUrls;
        }
    }

//    클래스 위에 @Builder: 클래스의 모든 생성자에 대해 빌더 패턴을 자동으로 적용합니다.
//    여러 생성자에서 빌더 패턴을 사용할 수 있습니다.

//    생성자 위에 @Builder: 해당 생성자에만 빌더 패턴을 적용합니다.
//    다른 생성자에서는 빌더 패턴을 사용할 수 없습니다.

    public void update(String title, String content, LocalDateTime updatedAt){
        this.title = title;
        this.content = content;
        this.updatedAt = updatedAt;
    }

    // fileUrls setter 메서드 추가
    public void setFileUrls(List<String> fileUrls) {
        this.fileUrls = fileUrls;
    }
}