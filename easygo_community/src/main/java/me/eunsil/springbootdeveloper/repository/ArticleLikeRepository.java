package me.eunsil.springbootdeveloper.repository;

import me.eunsil.springbootdeveloper.domain.Article;
import me.eunsil.springbootdeveloper.domain.ArticleLike;
import me.eunsil.springbootdeveloper.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ArticleLikeRepository extends JpaRepository<ArticleLike, Long> {
    boolean existsByArticleIdAndUserId(@Param("articleId") Long articleId, @Param("userId") Long userId);
    void deleteByArticleAndUser(Article article, User user);
} 