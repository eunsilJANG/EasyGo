package me.eunsil.springbootdeveloper.config.oauth;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;


@Configuration
public class OAuth2ClientConfig {

    private final Dotenv dotenv = Dotenv.load();

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        return new InMemoryClientRegistrationRepository(googleClientRegistration());
    }

    private ClientRegistration googleClientRegistration() {

        return ClientRegistration.withRegistrationId("google")  // registrationId는 'google'로 설정
                .clientName("Google")
                .clientId(dotenv.get("GOOGLE_CLIENT_ID"))
                .clientSecret(dotenv.get("GOOGLE_CLIENT_SECRET"))
                .scope("profile", "email")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE) // authorizationGrantType 설정 추가
                .authorizationUri("https://accounts.google.com/o/oauth2/auth")
                // Google OAuth2 인증 페이지의 URL을 지정
                .redirectUri("http://localhost:8080/login/oauth2/code/google")
                .tokenUri("https://oauth2.googleapis.com/token")
                .userInfoUri("https://www.googleapis.com/oauth2/v3/userinfo")
                .userNameAttributeName("sub")  // 추가 tqtqtqtqtq
                .build();
    }
}
