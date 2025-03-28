package me.eunsil.springbootdeveloper.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;


@EntityListeners(AuditingEntityListener.class)
@Entity
@Setter
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10000)
    private String content;

    @CreatedDate
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "article_id")
    private Article article;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // 부모 댓글 참조
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Comment parent;

    // 자식 댓글들 참조
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> children = new ArrayList<>();

    // 댓글의 깊이
    @Column(nullable = false)
    private Integer depth = 0;

    // 댓글의 순서
    @Column(nullable = false)
    private Integer orderNo = 0;

    @Builder
    public Comment(String content, Article article, User user, Comment parent, Integer depth) {
        this.content = content;
        this.article = article;
        this.user = user;
        this.parent = parent;
        this.depth = (parent != null) ? parent.getDepth() + 1 : 0;
        this.children = new ArrayList<>();
    }

    public void updateContent(String newContent) {
        this.content = newContent;
    }

    // 대댓글 추가 메서드
    public void addReply(Comment child) {
        this.children.add(child); //  List 자료구조에서 제공하는 기본 메서드
        child.setParent(this);
        child.setDepth(this.depth + 1);
    }

    // 대댓글 삭제 메서드
    public void removeReply(Comment child) {
        this.children.remove(child);
        child.setParent(null);
        child.setDepth(0);
    }

    // 대댓글 여부 확인 메서드
    public boolean ReplyCheck() {
        return this.parent != null;
    }

    // 원댓글 여부 확인 메서드
    public boolean OnlyOneCheck() {
        return this.parent == null;
    }
}
