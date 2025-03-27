package me.eunsil.springbootdeveloper.service;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.eunsil.springbootdeveloper.domain.Article;
import me.eunsil.springbootdeveloper.domain.Comment;
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

    public void deleteComment(Long articleId, Long commentId) {
        Comment comment = commentRepository.findById(commentId).orElseThrow(() -> new IllegalArgumentException("댓글이 존재하지 않습니다"));
        if(!comment.getArticle().getId().equals(articleId)){
            throw new IllegalArgumentException("해당 게시글의 댓글이 아님");}
        commentRepository.delete(comment);
        }

    }


