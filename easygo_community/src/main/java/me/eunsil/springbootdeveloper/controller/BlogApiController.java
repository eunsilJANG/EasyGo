package me.eunsil.springbootdeveloper.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.eunsil.springbootdeveloper.domain.Article;
import me.eunsil.springbootdeveloper.domain.User;
import me.eunsil.springbootdeveloper.dto.AddArticleRequest;
import me.eunsil.springbootdeveloper.dto.ArticleListViewResponse;
import me.eunsil.springbootdeveloper.dto.ArticleResponse;
import me.eunsil.springbootdeveloper.dto.UpdateArticleRequest;
import me.eunsil.springbootdeveloper.repository.ArticleLikeRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
@Slf4j
@RequiredArgsConstructor
@RestController // HTTP Response Body에 객체 데이터를 JSON 형식으로 반환하는 컨트롤러
public class BlogApiController {

    private final BlogService blogService;
    private final UserService userService;
    private final ArticleLikeRepository articleLikeRepository;

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
    public ResponseEntity<ArticleResponse> findArticle(@PathVariable("id") Long id) {
        Article article = blogService.findById(id);
        
        // 현재 로그인한 사용자의 좋아요 상태 확인
        boolean likecheck = false;
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // 인증된 사용자인 경우에만 좋아요 상태 확인
        if (authentication != null && authentication.isAuthenticated() 
                && !authentication.getPrincipal().equals("anonymousUser")) {
            String email = authentication.getName();
            User user = userService.findByEmail(email);
            // articleId와 userId로 좋아요 상태 확인
            likecheck = articleLikeRepository.existsByArticleIdAndUserId(article.getId(), user.getId());
            
            // 디버깅을 위한 로그 추가
            log.info("Article ID: {}, User ID: {}, LikeCheck: {}", article.getId(), user.getId(), likecheck);
        }
        
        return ResponseEntity.ok()
                .body(new ArticleResponse(article, likecheck));
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

    @PostMapping("/api/articles/{articleId}/view")
    public ResponseEntity<ArticleResponse> incrementViewCount(@PathVariable("articleId") Long articleId) {
        // 조회수 증가
        blogService.incrementViewCount(articleId);
        
        // 업데이트된 게시글 정보 반환
        Article article = blogService.findById(articleId);
        return ResponseEntity.ok()
            .body(new ArticleResponse(article, false));  // 조회수 API에서는 좋아요 상태는 불필요하므로 false로 설정
    }

    @PostMapping("/api/articles/{articleId}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(@PathVariable("articleId") Long articleId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String email = authentication.getName();
        User user = userService.findByEmail(email);
        
        boolean likecheck = blogService.toggleLike(articleId, user);
        Article article = blogService.findById(articleId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("likecheck", likecheck);
        response.put("likeCount", article.getLikeCount());
        
        return ResponseEntity.ok(response);
    }
}
