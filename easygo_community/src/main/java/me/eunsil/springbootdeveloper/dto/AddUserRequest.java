package me.eunsil.springbootdeveloper.dto;

import lombok.*;

@Builder
@NoArgsConstructor
@AllArgsConstructor
@Setter
@Getter
public class AddUserRequest {
    private String email;
    private String password;
    private String nickname;

}
