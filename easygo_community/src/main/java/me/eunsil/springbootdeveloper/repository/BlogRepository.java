package me.eunsil.springbootdeveloper.repository;

import me.eunsil.springbootdeveloper.domain.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.stereotype.Repository;

@Repository
public interface BlogRepository extends JpaRepository<Article, Long> {

    @Query("SELECT CASE WHEN COUNT(al) > 0 THEN true ELSE false END FROM ArticleLike al WHERE al.article.id = :articleId AND al.user.id = :userId")
    boolean existsByArticleIdAndUserId(@Param("articleId") Long articleId, @Param("userId") Long userId);
}
