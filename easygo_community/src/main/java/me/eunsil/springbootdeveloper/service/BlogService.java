package me.eunsil.springbootdeveloper.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import me.eunsil.springbootdeveloper.domain.Article;
import me.eunsil.springbootdeveloper.domain.User;
import me.eunsil.springbootdeveloper.dto.AddArticleRequest;
import me.eunsil.springbootdeveloper.dto.UpdateArticleRequest;
import me.eunsil.springbootdeveloper.repository.BlogRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor // final이 붙거나 @NotNull이 붙은 필드의 생성자 추가
@Service
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

    // 파일 저장 메서드
    public List<String> saveFiles(List<MultipartFile> files) {
        List<String> fileUrls = new ArrayList<>();
        
        try {
            // 업로드 디렉토리 생성
            File directory = new File(uploadDirectory);
            if (!directory.exists()) {
                directory.mkdirs(); // 디렉토리가 없으면 생성
            }

            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;

                // 파일명 생성
                String originalFilename = file.getOriginalFilename();
                String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
                String newFilename = UUID.randomUUID().toString() + extension;

                // 파일 저장
                File destFile = new File(directory, newFilename);
                file.transferTo(destFile);

                // URL 생성
                String fileUrl = "/uploads/" + newFilename;
                fileUrls.add(fileUrl);
            }
        } catch (IOException e) {
            throw new RuntimeException("파일 저장 중 오류가 발생했습니다.", e);
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
