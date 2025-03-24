package me.eunsil.springbootdeveloper.config;


import lombok.RequiredArgsConstructor;
import me.eunsil.springbootdeveloper.config.jwt.TokenProvider;
import me.eunsil.springbootdeveloper.config.oauth.OAuth2AuthorizationRequestBasedOnCookieRepository;
import me.eunsil.springbootdeveloper.config.oauth.OAuth2SuccessHandler;
import me.eunsil.springbootdeveloper.config.oauth.OAuth2UserCustomService;
import me.eunsil.springbootdeveloper.repository.RefreshTokenRepository;
import me.eunsil.springbootdeveloper.service.UserDetailService;
import me.eunsil.springbootdeveloper.service.UserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

import static org.springframework.boot.autoconfigure.security.servlet.PathRequest.toH2Console;

@EnableWebSecurity
@RequiredArgsConstructor
@Configuration
public class WebOAuthSecurityConfig {

    private final OAuth2UserCustomService oAuth2UserCustomService;
    private final TokenProvider tokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserService userService;
    private final ClientRegistrationRepository clientRegistrationRepository; // ✅ 추가

    @Bean
    public WebSecurityCustomizer configure(){ // 스프링 시큐리티 기능 비활성화
        return (web) -> web.ignoring()
                .requestMatchers("/img/**", "/css/**", "/js/**");
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // 토큰 방식으로 인증할 하기 때문에 기존에 사용하던 폼 로그인, 세션 비활성화.
        return http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(management -> management.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // 헤더를 확인할 커스텀 필터 추가
                .addFilterBefore(tokenAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class)
                // 토큰 재발급 url은 인증 없이 접근 가능하도록 설정. 나머지 api url은 인증 필요
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/token", "/api/login", "/api/signup", "/login/oauth2/code/**", "/oauth2/**", "/login", "/", "/error", "/api/user/nickname")
                        // /api/token 토큰 재발급 url
                        .permitAll()
                        .anyRequest().authenticated())
                .oauth2Login(oauth2 -> oauth2
                        .clientRegistrationRepository(clientRegistrationRepository)
                        .loginPage("/login") // React에서 로그인 페이지를 처리하도록 설정
                        //.defaultSuccessUrl("http://localhost:5173/preferences") // 로그인 성공 후 React 애플리케이션으로 리디렉션
                        .failureUrl("http://localhost:5173/login")  // 로그인 실패 시 React 애플리케이션의 로그인 페이지로 리디렉션
                        .authorizationEndpoint(endpoint -> endpoint
                                .authorizationRequestRepository(oAuth2AuthorizationRequestBasedOnCookieRepository()))
//                                .baseUri("/oauth2/authorization")
//                        )
//                        .redirectionEndpoint(endpoint -> endpoint
//                                .baseUri("/login/oauth2/code/*")
//                        )
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(oAuth2UserCustomService)
                        )
                        .successHandler(oAuth2SuccessHandler())
                )
                .exceptionHandling(exceptionHandling ->
                        exceptionHandling.defaultAuthenticationEntryPointFor(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED), new AntPathRequestMatcher("/api/**")))
                        .build();
    }


//        authorizationEndpoint(): OAuth2 인증 요청을 처리하는 엔드포인트를 설정합니다. 여기서 요청의 상태를 저장하는 방법을 정의하는데, 쿠키를 사용하여 인증 요청 상태를 저장할 수 있습니다.
//        userInfoEndpoint(): 인증 후 사용자 정보를 처리하는 엔드포인트를 설정합니다. 사용자 정보를 처리할 서비스(oAuth2UserCustomService)를 설정하여, 인증된 사용자 정보를 가져오고, 이를 애플리케이션에서 활용할 수 있습니다.

    @Bean
    public TokenAuthenticationFilter tokenAuthenticationFilter() {
        return new TokenAuthenticationFilter(tokenProvider);
    }

    @Bean
    public OAuth2AuthorizationRequestBasedOnCookieRepository oAuth2AuthorizationRequestBasedOnCookieRepository() {
        return new OAuth2AuthorizationRequestBasedOnCookieRepository();
    }

    @Bean
    public BCryptPasswordEncoder bCryptPasswordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:5174")); // 리액트 앱의 도메인
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS")); // OPTIONS 추가
        configuration.setAllowedHeaders(List.of("*")); // 모든 헤더 허용
        configuration.setAllowCredentials(true); // 자격 증명(쿠키) 허용
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration); //  서버가 처리할 수 있는 모든 URL 경로에 CORS 정책을 적용
        return source;
    }

    // AuthenticationManager 설정
    @Bean
    public AuthenticationManager authenticationManager(HttpSecurity http, BCryptPasswordEncoder bCryptPasswordEncoder, UserDetailService userDetailService) throws Exception {
        AuthenticationManagerBuilder authenticationManagerBuilder = http.getSharedObject(AuthenticationManagerBuilder.class);
        authenticationManagerBuilder.userDetailsService(userDetailService)
                .passwordEncoder(bCryptPasswordEncoder);
        return authenticationManagerBuilder.build();
    }

    @Bean
    public OAuth2SuccessHandler oAuth2SuccessHandler() {
        return new OAuth2SuccessHandler(tokenProvider, refreshTokenRepository, oAuth2AuthorizationRequestBasedOnCookieRepository(), userService);
    }


//    @Bean
//    public AuthenticationManager authenticationManager(HttpSecurity http, BCryptPasswordEncoder bCryptPasswordEncoder, UserDetailService userDetailService) throws Exception {
//        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
//        authProvider.setUserDetailsService(userDetailService);  // 사용자 세부 정보 서비스 설정
//        authProvider.setPasswordEncoder(bCryptPasswordEncoder);  // 패스워드 인코더 설정
//        return new ProviderManager(authProvider);
//    }

//DaoAuthenticationProvider는 Spring Security의 기본 인증 제공자로,
//데이터베이스에 저장된 사용자 정보를 이용해 인증을 처리합니다.
//DaoAuthenticationProvider는 데이터베이스에서 사용자 정보를 조회하고,
//사용자가 입력한 비밀번호를 암호화된 비밀번호와 비교하여 인증을 처리합니다.
//return new ProviderManager(authProvider);:
//ProviderManager는 여러 개의 AuthenticationProvider를 관리하고, 인증 요청을 처리하는 역할을 합니다. 여러 인증 제공자(예: 데이터베이스 인증, LDAP 인증 등)를 사용할 수 있지만, 이 코드에서는 DaoAuthenticationProvider만 사용합니다.
//ProviderManager는 DaoAuthenticationProvider를 통해 사용자 인증을 처리합니다.
//AuthenticationManager:
//AuthenticationManager는 Spring Security에서 인증을 수행하는 인터페이스입니다.
//이 인터페이스는 사용자가 제공한 인증 정보를 기반으로 사용자가 유효한지, 비밀번호가 맞는지 등을 검사합니다.
//ProviderManager는 AuthenticationManager 인터페이스를 구현한 클래스입니다.
//이 클래스는 여러 AuthenticationProvider를 사용하여 인증을 처리합니다.

}
