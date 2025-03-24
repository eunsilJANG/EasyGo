//package me.eunsil.springbootdeveloper.config;
//
//import lombok.RequiredArgsConstructor;
//import me.eunsil.springbootdeveloper.service.UserDetailService;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.security.authentication.AuthenticationManager;
//import org.springframework.security.authentication.ProviderManager;
//import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
//import org.springframework.security.config.annotation.web.builders.HttpSecurity;
//import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
//import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
//import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
//import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
//import org.springframework.security.web.SecurityFilterChain;
//import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
//import org.springframework.web.cors.CorsConfiguration;
//import org.springframework.web.cors.CorsConfigurationSource;
//import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
//
//import java.util.List;
//
//import static org.springframework.boot.autoconfigure.security.servlet.PathRequest.toH2Console;
//
//
//import java.util.List;
//
//import static org.springframework.boot.autoconfigure.security.servlet.PathRequest.toH2Console;
//
//@Configuration
//@EnableWebSecurity
//@RequiredArgsConstructor
//public class WebSecurityConfig {
//
//    private final UserDetailService userService;
//
//    // 스프링 시큐리티의 기본 보안 설정을 무시할 경로 설정
//    @Bean
//    public WebSecurityCustomizer configure() {
//        return (web) -> web.ignoring()
//                .requestMatchers(toH2Console())  // H2 콘솔 보안 비활성화
//                .requestMatchers(new AntPathRequestMatcher("/static/**"));  // 정적 리소스에 대한 보안 비활성화
//    }
//
//    // HTTP 보안 설정
//    @Bean
//    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
//        return http
//                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
//                .authorizeHttpRequests(auth -> auth
//                        .requestMatchers(
//                                new AntPathRequestMatcher("/api/login"),
//                                new AntPathRequestMatcher("/api/signup"),
//                                new AntPathRequestMatcher("/api/token" +
//                                        "" +
//                                        ""),
//                                new AntPathRequestMatcher("/login"),
//                                new AntPathRequestMatcher("/signup"),
//                                new AntPathRequestMatcher("/user")
//                        ).permitAll()   // 위 경로들은 인증 없이 누구나 접근 허용
//                        .anyRequest().authenticated()  // 나머지 요청은 인증된 사용자만 접근 가능
//                )
////                .formLogin(formLogin -> formLogin
////                        .loginPage("/login")  // 로그인 페이지 URL
////                        .defaultSuccessUrl("http://localhost:5174/preferences", true)  // 로그인 성공 후 이동할 페이지
////                )
//
//                .logout(logout -> logout
//                        .logoutSuccessUrl("/api/login")  // 로그아웃 후 리디렉션할 페이지
//                        .invalidateHttpSession(true)  // 로그아웃 후 세션 무효화
//                )
//                .csrf(AbstractHttpConfigurer::disable)  // CSRF 비활성화
//                .build();
//    }
//
//    @Bean
//    public CorsConfigurationSource corsConfigurationSource() {
//        CorsConfiguration configuration = new CorsConfiguration();
//        configuration.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:5174")); // 리액트 앱의 도메인
//        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE")); // 허용할 HTTP 메서드
//        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type")); // 허용할 헤더
//        configuration.setAllowCredentials(true); // 자격 증명(쿠키) 허용
//        configuration.setMaxAge(3600L);
//
//        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
//        source.registerCorsConfiguration("/**", configuration); //  서버가 처리할 수 있는 모든 URL 경로에 CORS 정책을 적용
//        return source;
//    }
//
//    // AuthenticationManager 설정
//    @Bean
//    public AuthenticationManager authenticationManager(HttpSecurity http, BCryptPasswordEncoder bCryptPasswordEncoder, UserDetailService userDetailService) throws Exception {
//        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
//        authProvider.setUserDetailsService(userDetailService);  // 사용자 세부 정보 서비스 설정
//        authProvider.setPasswordEncoder(bCryptPasswordEncoder);  // 패스워드 인코더 설정
//        return new ProviderManager(authProvider);
//    }
//
//    // BCrypt 패스워드 인코더 설정
//    @Bean
//    public BCryptPasswordEncoder bCryptPasswordEncoder() {
//        return new BCryptPasswordEncoder();
//    }
//}
//
//
//
//
//
////AuthenticationManager
////DaoAuthenticationProvider는 Spring Security의 기본 인증 제공자로,
////데이터베이스에 저장된 사용자 정보를 이용해 인증을 처리합니다.
////DaoAuthenticationProvider는 데이터베이스에서 사용자 정보를 조회하고,
////사용자가 입력한 비밀번호를 암호화된 비밀번호와 비교하여 인증을 처리합니다.
////return new ProviderManager(authProvider);:
////ProviderManager는 여러 개의 AuthenticationProvider를 관리하고, 인증 요청을 처리하는 역할을 합니다. 여러 인증 제공자(예: 데이터베이스 인증, LDAP 인증 등)를 사용할 수 있지만, 이 코드에서는 DaoAuthenticationProvider만 사용합니다.
////ProviderManager는 DaoAuthenticationProvider를 통해 사용자 인증을 처리합니다.
////AuthenticationManager:
////AuthenticationManager는 Spring Security에서 인증을 수행하는 인터페이스입니다.
////이 인터페이스는 사용자가 제공한 인증 정보를 기반으로 사용자가 유효한지, 비밀번호가 맞는지 등을 검사합니다.
////ProviderManager는 AuthenticationManager 인터페이스를 구현한 클래스입니다.
////이 클래스는 여러 AuthenticationProvider를 사용하여 인증을 처리합니다.
