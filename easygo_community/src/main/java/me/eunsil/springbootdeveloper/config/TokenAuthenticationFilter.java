package me.eunsil.springbootdeveloper.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.eunsil.springbootdeveloper.config.jwt.TokenProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;


@Slf4j
@RequiredArgsConstructor
public class TokenAuthenticationFilter extends OncePerRequestFilter {
    private final TokenProvider tokenProvider;
    private final static String HEADER_AUTHORIZATION = "Authorization";
    private final static String TOKEN_Prefix = "Bearer ";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        // 요청 헤더의 Authorization 키의 값 조회
        String authorizationHeader = request.getHeader(HEADER_AUTHORIZATION);
        log.info("Authorization Header: {}", authorizationHeader);  // debug -> info
        // 가져온 값에서 접두사 제거
        String token = getAccessToken(authorizationHeader);
        log.info("Extracted token: {}", token);  // debug -> info

        // 가져온 토큰이 유효한지 확인하고, 유효한 때는 인증 정보 설정
        if(tokenProvider.validToken(token)){
            Authentication authentication = tokenProvider.getAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        filterChain.doFilter(request, response);
    }


    private String getAccessToken(String authorizationHeader){
        log.debug("Authorization Header: {}", authorizationHeader); // ✅ 여기부터 찍히는지 확인
        if (authorizationHeader != null && authorizationHeader.startsWith(TOKEN_Prefix)) {
            String token = authorizationHeader.substring(TOKEN_Prefix.length()).trim(); // ✅ trim() 추가
            log.debug("Extracted token: {}", token);  // ✅ 올바른 방법
            return token;
        }
        return null;
    }
}
