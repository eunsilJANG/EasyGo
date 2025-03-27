package me.eunsil.springbootdeveloper.repository;

import me.eunsil.springbootdeveloper.domain.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
 // 메서드 정의
    List<Comment> findByArticleId(Long id);
}
