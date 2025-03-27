package me.eunsil.springbootdeveloper.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import me.eunsil.springbootdeveloper.domain.Article;
import me.eunsil.springbootdeveloper.domain.User;
import me.eunsil.springbootdeveloper.dto.AddArticleRequest;
import me.eunsil.springbootdeveloper.dto.UpdateArticleRequest;
import me.eunsil.springbootdeveloper.repository.BlogRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import lombok.extern.slf4j.Slf4j;

@RequiredArgsConstructor // final이 붙거나 @NotNull이 붙은 필드의 생성자 추가
@Service
@Slf4j
public class BlogService {

    private final BlogRepository blogRepository;

    @Value("${file.upload.directory}")  // application.properties에서 설정
    private String uploadDirectory;

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

    public void delete(long id) {
        Article article = findById(id);
        authorizaeArticleAuthor(article);
        
        // 첨부 파일이 있다면 삭제
        if (article.getFileUrls() != null) {
            for (String fileUrl : article.getFileUrls()) {
                deleteFile(fileUrl);
            }
        }
        
        blogRepository.deleteById(id);
    }

    @Transactional
    public Article update(Long id, UpdateArticleRequest request, List<MultipartFile> files) {
        Article article = findById(id);
        authorizaeArticleAuthor(article);
        article.update(request.getTitle(), request.getContent(), request.getUpdatedAt());

        // 기존 파일 URL 유지
        if (request.getFileUrls() != null) {
            article.setFileUrls(request.getFileUrls());
        }

        // 새로운 파일이 있다면 처리
        if (files != null && !files.isEmpty()) {
            try {
                List<String> newFileUrls = saveFiles(files);  // 내부 메서드 사용
                if (request.getFileUrls() != null) {
                    newFileUrls.addAll(request.getFileUrls());
                }
                article.setFileUrls(newFileUrls);
            } catch (IOException e) {
                throw new RuntimeException("파일 저장 중 오류가 발생했습니다.", e);
            }
        }

        return article;
    }

    // 게시글을 작성한 유저인지 확인
    private static void authorizaeArticleAuthor(Article article) {
        String userName = SecurityContextHolder.getContext().getAuthentication().getName();
        if(!article.getUser().getEmail().equals(userName)){throw new IllegalArgumentException("not authorized");}
    }

    // 파일 저장 메서드
    public List<String> saveFiles(List<MultipartFile> files) throws IOException {
        List<String> fileUrls = new ArrayList<>();
        
        // 업로드 디렉토리가 없으면 생성
        File directory = new File(uploadDirectory);
        if (!directory.exists()) {
            directory.mkdirs();
        }
        
        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            
            try {
                // 파일 유효성 검사 추가
                validateFile(file);
                
                String originalFilename = file.getOriginalFilename();
                String fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
                String savedFilename = UUID.randomUUID().toString() + fileExtension;
                
                // 파일 저장
                File targetFile = new File(directory, savedFilename);
                file.transferTo(targetFile); // transferTo()는 MultipartFile의 내용을 서버 디스크에 실제로 저장하는 메서드
                
                // URL 생성
                String fileUrl = "/uploads/" + savedFilename;
                fileUrls.add(fileUrl);
                
                log.info("File saved at: {}", targetFile.getAbsolutePath());
                log.info("File URL: {}", fileUrl);
            } catch (IllegalArgumentException e) {
                log.error("File validation failed: {}", e.getMessage());
                throw e;
            }
        }
        
        return fileUrls;
    }

    private void validateFile(MultipartFile file) {
        // 파일 크기 검사
        if (file.getSize() > 10 * 1024 * 1024) { // 10MB
            throw new IllegalArgumentException("파일 크기는 10MB를 초과할 수 없습니다.");
        }
        
        // 파일 타입 검사
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("이미지 파일만 업로드 가능합니다.");
        }
    }

    // 파일 삭제 
    public void deleteFile(String fileUrl) {
        String fileName = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
        File file = new File(uploadDirectory + File.separator + fileName);
        if (file.exists()) {
            file.delete();
        }
    }
}
