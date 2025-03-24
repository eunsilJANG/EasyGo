package me.eunsil.springbootdeveloper.config.oauth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import me.eunsil.springbootdeveloper.util.CookieUtil;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.web.util.WebUtils;


// 권한 인증 흐름에서 클라이언트의 요청을 유지하는 데 사용하느 AuthorizationRequestRepository 클래스를 구현해 쿠키를 사용해 OAuth의 정보를 가져오고 저장하는 로직 작성
public class OAuth2AuthorizationRequestBasedOnCookieRepository implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    public final static String OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME = "oauth2_auth_request";
    private final static int COOKIE_EXPIRE_SECONDS = 18000;

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request, HttpServletResponse response) {
        return this.loadAuthorizationRequest(request);
        // **OAuth2 인증 요청을 "로드"**하는 역할을 하며, 로드된 요청을 반환하는 것
    }

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request){
        Cookie cookie = WebUtils.getCookie(request, OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME);
        return CookieUtil.deserialize(cookie, OAuth2AuthorizationRequest.class);
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest, HttpServletRequest request, HttpServletResponse response) {
        if(authorizationRequest == null ) {
            removeAuthorizationRequestCookies(request, response);
            return;
        }
        CookieUtil.addCookie(response, OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME, CookieUtil.serialize(authorizationRequest), COOKIE_EXPIRE_SECONDS);
    }

        public void removeAuthorizationRequestCookies(HttpServletRequest request, HttpServletResponse response) {
            CookieUtil.deleteCookie(request, response, OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME);
        }

}
//
//        OAuth2AuthorizationRequestBasedOnCookieRepository 클래스는 OAuth2 인증 요청을 쿠키 기반으로 저장하고 관리하는 클래스입니다.
//        주요 기능:
//        saveAuthorizationRequest: OAuth2 인증 요청을 쿠키에 저장합니다. 쿠키 이름은 "oauth2_auth_request"이며, 만료 시간은 18000초(5시간)입니다.
//        loadAuthorizationRequest: 쿠키에서 저장된 OAuth2 인증 요청을 불러옵니다.
//        removeAuthorizationRequest: 인증 요청을 제거할 때 사용됩니다.
//        이 코드는 구글 로그인 성공 후의 최종 인증 토큰을 저장하는 것이 아니라, OAuth2 인증 "과정"에서 필요한 임시 데이터를 저장하는 용도입니다.
//        실제 구글 로그인 성공 후의 인증 정보(액세스 토큰 등)는 별도의 처리가 필요합니다. 이는 보통 OAuth2SuccessHandler나 비슷한 클래스에서 처리됩니다


//        최초 구글 로그인 요청 시:
//        const handleGoogleLogin = () => {
//        window.location.href = 'http://localhost:8080/oauth2/authorization/google';
//        };
//
//        이 요청이 시작되면:
//        OAuth2AuthorizationRequestBasedOnCookieRepository의 역할:
//        이 클래스의 saveAuthorizationRequest 메소드는 구글 로그인 과정을 시작할 때 임시로 상태를 저장하는 용도입니다
//        여기서 저장하는 authorizationRequest는 구글에서 받은 액세스 토큰이 아닙니다
//        이것은 단지 인증 과정을 추적하기 위한 임시 데이터입니다 (state 값, redirect URI 등)
//        구글 로그인 완료 후:
//        사용자가 구글에서 로그인을 완료하면, 구글은 우리 서버로 인증 코드를 보냅니다
//        스프링 시큐리티가 자동으로 이 코드를 사용해서 구글 API로부터 실제 액세스 토큰을 받아옵니다
//        이 과정은 스프링 시큐리티가 자동으로 처리합니다
//        최종 처리 (OAuth2SuccessHandler):
//        구글 로그인이 성공하면 이 핸들러가 실행됩니다
