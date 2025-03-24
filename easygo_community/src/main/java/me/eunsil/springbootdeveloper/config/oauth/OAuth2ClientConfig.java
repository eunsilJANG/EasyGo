package me.eunsil.springbootdeveloper.config.oauth;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;

@Configuration
public class OAuth2ClientConfig {

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        return new InMemoryClientRegistrationRepository(googleClientRegistration());
    }

    private ClientRegistration googleClientRegistration() {

        return ClientRegistration.withRegistrationId("google")  // registrationId는 'google'로 설정
                .clientName("Google")
                .clientId("879463592635-01pd5l2gcm6ltq5553ibkpi0f8qklq7q.apps.googleusercontent.com")
                .clientSecret("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")
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
