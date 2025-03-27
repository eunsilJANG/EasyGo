package me.eunsil.springbootdeveloper.controller;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.eunsil.springbootdeveloper.domain.Article;
import me.eunsil.springbootdeveloper.domain.Comment;
import me.eunsil.springbootdeveloper.domain.User;
import me.eunsil.springbootdeveloper.dto.CommentDto;
import me.eunsil.springbootdeveloper.dto.CommentResponse;
import me.eunsil.springbootdeveloper.service.BlogService;
import me.eunsil.springbootdeveloper.service.CommentService;
import me.eunsil.springbootdeveloper.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RequiredArgsConstructor
@RestController
public class CommentApiController {

    private final UserService userService;
    private final CommentService commentService;
    private final BlogService blogService;

    @PostMapping("/api/articles/{articleId}/comments")
    public ResponseEntity<CommentResponse> addComment(@RequestBody CommentDto newComment, @PathVariable("articleId") long articleId){

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if(authentication == null || !authentication.isAuthenticated()){
            throw new IllegalArgumentException("Not authenticated");
        }

        String email = authentication.getName();
        User user = userService.findByEmail(email);
//        Long articleId = newComment.getArticleId();
        Article article = blogService.findById(articleId);

        Comment comment = Comment.builder()
                .content(newComment.getContent())
                .user(user)
                .article(article)
                .build();
        Comment savedComment = commentService.save(comment);
        return ResponseEntity.status(HttpStatus.CREATED).body(new CommentResponse(savedComment, user.getId()));

    }

    @GetMapping("/api/articles/{articleId}/comments")
    public ResponseEntity<List<CommentResponse>> findAllComments(@PathVariable("articleId") long articleId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        User user = userService.findByEmail(email);
        Long currentUserId = user.getId();
        List<CommentResponse> comments = commentService.findAll(articleId)
                .stream().map(comment -> new CommentResponse(comment, currentUserId)).toList();
        /* commentService.findAll(articleId)로부터 Comment 리스트를 받아, 
        각 Comment 객체를 CommentResponse 객체로 변환하여 새로운 리스트를 생성하는 역할을 함 */

//        return ResponseEntity.ok().body(comments); 아래처럼 직관적으로 쓸 것
          return ResponseEntity.ok(comments);

    }

    @PutMapping("api/articles/{articleId}/comments/{commentId}")
    public ResponseEntity<CommentResponse> updateComment(
            @PathVariable("articleId") long ai, @PathVariable("commentId") long ci,
            @RequestBody CommentDto comment) {
        String content = comment.getContent();
        CommentResponse updatedComment = commentService.updateComment(ai, ci, content);
        return ResponseEntity.ok(updatedComment);
    }

    @DeleteMapping("/api/articles/{articleId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable("articleId") long articleId,
            @PathVariable("commentId") long commentId) {
        commentService.deleteComment(articleId, commentId);
        return ResponseEntity.noContent().build();
    }

}

