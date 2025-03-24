package me.eunsil.springbootdeveloper.dto;

import lombok.*;
import me.eunsil.springbootdeveloper.domain.Article;
import me.eunsil.springbootdeveloper.domain.User;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
public class AddArticleRequest {

    private String title;

    private String content;

    private User user;
}
