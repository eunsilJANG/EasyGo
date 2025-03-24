package me.eunsil.springbootdeveloper;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing // createdAt, updatedAt 자동 업데이트
@SpringBootApplication
public class SpringBootDeveloperApplication {

    public static void main(String[] args){
        SpringApplication.run(SpringBootDeveloperApplication.class, args);
    }

}
