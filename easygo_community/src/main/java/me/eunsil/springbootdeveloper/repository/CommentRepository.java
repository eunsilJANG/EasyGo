package me.eunsil.springbootdeveloper.repository;

import me.eunsil.springbootdeveloper.domain.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
 // 메서드 정의
    List<Comment> findByArticleId(Long id);

  // 게시글의 모든 댓글 조회 (계층 구조로)
    @Query("SELECT c FROM Comment c WHERE c.article.id = :articleId AND c.parent IS NULL ORDER BY c.createdAt")
    List<Comment> findAllByArticleIdOrderByCreatedAt(@Param("articleId") Long articleId);
    
    // 특정 댓글의 대댓글 조회
    List<Comment> findByParentIdOrderByCreatedAt(Long parentId);
}
