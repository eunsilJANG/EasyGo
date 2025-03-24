package me.eunsil.springbootdeveloper.controller;


import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.eunsil.springbootdeveloper.config.jwt.TokenProvider;
import me.eunsil.springbootdeveloper.domain.User;
import me.eunsil.springbootdeveloper.dto.AddUserRequest;
import me.eunsil.springbootdeveloper.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@Slf4j
@RequestMapping("/api")
@RequiredArgsConstructor
@RestController
public class UserApiController {

    private final TokenProvider tokenProvider;
    private final UserService userService;
    private final AuthenticationManager authenticationManager;

    @PostMapping("/user/nickname")
    public ResponseEntity<Void> updateNickname(@RequestBody AddUserRequest request, Authentication authentication) {
        String email = authentication.getName();
        log.info("Received nickname update request for email: {}", email);
        log.info("New nickname: {}", request.getNickname());
        userService.updateNickname(request.getNickname(), email);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/user/me")
    public ResponseEntity<User> getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        User user = userService.findByEmail(email);
        return ResponseEntity.ok()
                .body(user);
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, String>> signup(@RequestBody AddUserRequest newuser) {
        userService.save(newuser);
        return ResponseEntity.ok(Map.of("message", "회원가입이 완료되었습니다."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AddUserRequest loginuser) {
        try {
            // UsernamePasswordAuthenticationToken을 사용해 인증
            UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                    loginuser.getEmail(), loginuser.getPassword());

            // AuthenticationManager를 사용하여 인증
            Authentication authentication = authenticationManager.authenticate(authenticationToken);

            // 인증 성공 시, SecurityContext에 인증 정보를 설정
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // 인증된 사용자 정보 가져오기
            User user = (User) authentication.getPrincipal();

            // JWT 토큰 생성 (예시)
            String jwtToken = "generated_jwt_token"; // JWT 생성 로직 추가 필요

            // 인증 성공 시 JWT 토큰과 사용자 정보를 응답
            return ResponseEntity.ok(Map.of("message", "로그인 성공", "jwtToken", jwtToken, "user", user));
        } catch (BadCredentialsException e) {
            // 인증 실패 시
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("잘못된 자격 증명");
        }
    }



}
