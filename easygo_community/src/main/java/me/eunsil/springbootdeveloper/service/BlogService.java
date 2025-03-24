package me.eunsil.springbootdeveloper.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import me.eunsil.springbootdeveloper.domain.Article;
import me.eunsil.springbootdeveloper.domain.User;
import me.eunsil.springbootdeveloper.dto.AddArticleRequest;
import me.eunsil.springbootdeveloper.dto.UpdateArticleRequest;
import me.eunsil.springbootdeveloper.repository.BlogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor // final이 붙거나 @NotNull이 붙은 필드의 생성자 추가
@Service
public class BlogService {

    private final BlogRepository blogRepository;

    // 블로그 글 추가 메서드
    public Article save(Article article){
        return blogRepository.save(article);
    }

    public List<Article> findAll(){
        return blogRepository.findAll();
    }

    public Article findById(long id){
        return blogRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("not found: " + id));

    }

    public void delete(long id){
        blogRepository.deleteById(id);
    }

    @Transactional // @Transactional 애너테이션은 매칭한 메서드를 하나의 트랜잭션으로 묶는 역할
    public Article update(long id, UpdateArticleRequest request) {
        Article article = blogRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("not found:" + id));
//        get() 메서드를 호출하면, Optional이 비어 있지 않을 때 값이 반환됩니다.
//        그러나 Optional이 비어 있을 경우 (empty Optional) NoSuchElementException이 발생합니다.
        article.update(request.getTitle(), request.getContent(), request.getUpdatedAt()); // Article 클래스에 update 메소드 정의
        return article;
    }


}
