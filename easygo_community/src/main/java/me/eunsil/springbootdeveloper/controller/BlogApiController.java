package me.eunsil.springbootdeveloper.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.eunsil.springbootdeveloper.domain.Article;
import me.eunsil.springbootdeveloper.domain.User;
import me.eunsil.springbootdeveloper.dto.AddArticleRequest;
import me.eunsil.springbootdeveloper.dto.ArticleListViewResponse;
import me.eunsil.springbootdeveloper.dto.ArticleResponse;
import me.eunsil.springbootdeveloper.dto.UpdateArticleRequest;
import me.eunsil.springbootdeveloper.service.BlogService;
import me.eunsil.springbootdeveloper.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.List;
@Slf4j
@RequiredArgsConstructor
@RestController // HTTP Response Body에 객체 데이터를 JSON 형식으로 반환하는 컨트롤러
public class BlogApiController {

    private final BlogService blogService;
    private final UserService userService;

    @PostMapping("/api/articles")
    public ResponseEntity<Article> addArticle(
        @RequestPart(value = "article") AddArticleRequest request,
        @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                throw new IllegalStateException("Not authenticated");
            }

            String email = authentication.getName();
            log.info("Current user email: {}", email);

            User user = userService.findByEmail(email);
            log.info("Found user: {}", user);

            if (user.getNickname() == null) {
                throw new IllegalStateException("Nickname not set");
            }
            Article article = Article.builder()
                    .title(request.getTitle())
                    .content(request.getContent())
                    .user(user)
                    .build();

            if (files != null && !files.isEmpty()) {
                try {
                    List<String> fileUrls = blogService.saveFiles(files);
                    article.setFileUrls(fileUrls);
                    log.info("Saved files with URLs: {}", fileUrls);
                } catch (IOException e) {
                    log.error("File save error: ", e);
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
                }
            }

            Article savedArticle = blogService.save(article);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedArticle);

        } catch (Exception e) {
            log.error("Article save error: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/api/articles")
    public ResponseEntity<List<ArticleListViewResponse>> findAllArticles() {
        List<ArticleListViewResponse> articles = blogService.findAll()
                .stream().map(ArticleListViewResponse::new).toList();
        log.info("게시글목록: {}", articles);
//        blogService.findAll()로부터 Article 리스트를 받아,
//        각 Article 객체를 ArticleResponse 객체로 변환하여 새로운 리스트를 생성하는 역할을 합니다.

        return ResponseEntity.ok().body(articles);
    }

    @GetMapping("/api/articles/{id}")
    public ResponseEntity<ArticleResponse> findArticle(@PathVariable("id") long id){
        Article article = blogService.findById(id);

        log.info("File URLs: {}", article.getFileUrls());   

        return ResponseEntity.ok().body(new ArticleResponse(article));
    }

    @DeleteMapping("/api/articles/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable("id") long id){
        blogService.delete(id);

        return ResponseEntity.status(200).build();
    }

    @PutMapping("/api/articles/{id}")
    public ResponseEntity<Article> updateArticle(
        @PathVariable(name = "id") long id,
        @RequestPart(value = "article") UpdateArticleRequest request,
        @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {
        Article updatedArticle = blogService.update(id, request, files);
        return ResponseEntity.ok()
            .body(updatedArticle);
    }
}
