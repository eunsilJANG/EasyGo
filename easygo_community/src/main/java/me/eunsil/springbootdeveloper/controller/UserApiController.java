package me.eunsil.springbootdeveloper.controller;


import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.eunsil.springbootdeveloper.config.jwt.TokenProvider;
import me.eunsil.springbootdeveloper.domain.RefreshToken;
import me.eunsil.springbootdeveloper.domain.User;
import me.eunsil.springbootdeveloper.dto.AddUserRequest;
import me.eunsil.springbootdeveloper.repository.RefreshTokenRepository;
import me.eunsil.springbootdeveloper.service.UserService;
import me.eunsil.springbootdeveloper.util.CookieUtil;
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
import org.springframework.web.util.UriComponentsBuilder;

import java.security.Principal;
import java.time.Duration;
import java.util.Map;

@Slf4j
@RequestMapping("/api")
@RequiredArgsConstructor
@RestController
public class UserApiController {

    private final TokenProvider tokenProvider;
    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final RefreshTokenRepository refreshTokenRepository;

    public static final String REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
    public static final Duration REFRESH_TOKEN_DURATION = Duration.ofDays(14);
    public static final Duration ACCESS_TOKEN_DURATION = Duration.ofDays(1);
    private static final String PREFERENCES_REDIRECT_PATH = "http://localhost:5173/preferences";

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
    public ResponseEntity<?> login(@RequestBody AddUserRequest loginuser, 
                                 HttpServletRequest request,
                                 HttpServletResponse response) {
        try {
            log.info("Login attempt - Email: {}", loginuser.getEmail());
            // 실제 운영 환경에서는 비밀번호를 로그에 출력하면 안됩니다!
            // 테스트 목적으로만 사용하세요
            log.debug("Attempting login with password: {}", loginuser.getPassword());

            // UsernamePasswordAuthenticationToken을 사용해 인증
            UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                    loginuser.getEmail(), loginuser.getPassword());

            // AuthenticationManager를 사용하여 인증
            Authentication authentication = authenticationManager.authenticate(authenticationToken);

            // 인증 성공 시, SecurityContext에 인증 정보를 설정
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // 인증된 사용자 정보 가져오기
            User user = (User) authentication.getPrincipal();
            
            // 사용자 정보 로깅
            log.info("Authenticated user: {}", user);
            log.info("User nickname: {}", user.getNickname());
            
            // 리프레시 토큰 생성 -> 저장 -> 쿠키에 저장
            String refreshToken = tokenProvider.generateToken(user, REFRESH_TOKEN_DURATION);
            saveRefreshToken(user.getId(), refreshToken);
            addRefreshTokenToCookie(request, response, refreshToken);

            // 엑세스 토큰 생성
            String accessToken = tokenProvider.generateToken(user, ACCESS_TOKEN_DURATION);

            // 리다이렉트 URL은 프론트엔드에서 처리하도록 수정
            return ResponseEntity.ok(Map.of(
                "jwtToken", accessToken,
                "user", Map.of(
                    "id", user.getId(),
                    "email", user.getEmail(),
                    "nickname", user.getNickname()
                ),
                "message", "로그인 성공"
            ));
        } catch (BadCredentialsException e) {
            log.error("Login failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("잘못된 자격 증명");
        }
    }

    // 리프레시 토큰 저장 메서드
    private void saveRefreshToken(Long userId, String newRefreshToken) {
        RefreshToken refreshToken = refreshTokenRepository.findByUserId(userId)
            .map(entity -> entity.update(newRefreshToken))
            .orElse(new RefreshToken(userId, newRefreshToken));
        refreshTokenRepository.save(refreshToken);
    }

    // 리프레시 토큰을 쿠키에 저장
    private void addRefreshTokenToCookie(HttpServletRequest request, HttpServletResponse response, String refreshToken) {
        int cookieMaxAge = (int) REFRESH_TOKEN_DURATION.toSeconds();
        CookieUtil.deleteCookie(request, response, REFRESH_TOKEN_COOKIE_NAME);
        CookieUtil.addCookie(response, REFRESH_TOKEN_COOKIE_NAME, refreshToken, cookieMaxAge);
    }

}
