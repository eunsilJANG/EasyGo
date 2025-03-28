package me.eunsil.springbootdeveloper.service;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.eunsil.springbootdeveloper.domain.Article;
import me.eunsil.springbootdeveloper.domain.Comment;
import me.eunsil.springbootdeveloper.domain.User;
import me.eunsil.springbootdeveloper.dto.CommentResponse;
import me.eunsil.springbootdeveloper.repository.BlogRepository;
import me.eunsil.springbootdeveloper.repository.CommentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;


@Slf4j
@RequiredArgsConstructor
@Service
public class CommentService {
    private final BlogRepository blogRepository;
    private final CommentRepository commentRepository;

    public Comment save(Comment comment){
        return commentRepository.save(comment);
    }

    public List<Comment> findAll(long articleId){
        return commentRepository.findByArticleId(articleId);
    }

    // 댓글 목록 조회 (계층 구조로)
    @Transactional(readOnly = true)
    public List<CommentResponse> findAllByArticleId(Long articleId, Long currentUserId) {
        return commentRepository.findAllByArticleIdOrderByCreatedAt(articleId).stream().map(comment -> new CommentResponse(comment, currentUserId)).toList();
    }

    // 댓글 작성 (원댓글/대댓글 모두 처리)
    @Transactional
    public CommentResponse createComment(String content, Article article, User user, Long parentId) {
        Comment parent = null;

        if (parentId != null) {
            parent = commentRepository.findById(parentId)
                    .orElseThrow(() -> new IllegalArgumentException("부모 댓글이 존재하지 않습니다."));
        }

        Comment comment = Comment.builder()
                .content(content)
                .user(user)
                .article(article)
                .parent(parent)
                .build();

        // 부모 댓글이 있다면 자식 댓글로 등록
        if (parent != null) {
            parent.addReply(comment);  // 양방향 연관관계 설정 (optional)
        }

        Comment savedComment = commentRepository.save(comment);
        return new CommentResponse(savedComment, user.getId());
    }

    @Transactional
    public CommentResponse updateComment(Long articleId, Long commentId, String content) {
        Comment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new IllegalArgumentException("댓글이 존재하지 않습니다."));
        
        // 게시글 ID 확인
        if (!comment.getArticle().getId().equals(articleId)) {
            throw new IllegalArgumentException("해당 게시글의 댓글이 아님");
        }
        
        comment.updateContent(content);
        
        return CommentResponse.builder()
            .id(comment.getId())
            .content(comment.getContent())
            .createdAt(comment.getCreatedAt())
            .nickname(comment.getUser().getNickname())
            .build();
    }

    // 댓글 삭제 (대댓글 포함)
    @Transactional
    public void deleteComment(Long articleId, Long commentId) {
        Comment comment = commentRepository.findById(commentId).orElseThrow(() -> new IllegalArgumentException("댓글이 존재하지 않습니다"));
        if(!comment.getArticle().getId().equals(articleId)){
            throw new IllegalArgumentException("해당 게시글의 댓글이 아님");}

        if(comment.getParent() != null){
            comment.getParent().removeReply(comment);
        }
        commentRepository.delete(comment);
        

    }
}


