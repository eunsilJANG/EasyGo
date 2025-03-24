package me.eunsil.springbootdeveloper.util;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.util.SerializationUtils;

import java.util.Base64;

public class CookieUtil {
    // 요청값(이름, 값, 만ㄱ료 기간)을 바탕으로 쿠키 추가
    public static void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
        Cookie cookiee = new Cookie(name, value);
        cookiee.setPath("/");
        cookiee.setMaxAge(maxAge);
        cookiee.setMaxAge(maxAge);
//        cookiee.setHttpOnly(true);     // JavaScript 접근 막기
//        cookiee.setSecure(false);      // 개발환경은 HTTP라서 false로 설정
//        cookiee.setDomain("localhost");
//        cookiee.setAttribute("SameSite", "None"); // 크로스 도메인 쿠키 허용

        response.addCookie(cookiee);
    }

    // 쿠키의 이름을 입력받아 쿠키 삭제
    public static void deleteCookie(HttpServletRequest request, HttpServletResponse response, String name) {
        Cookie[] cookies = request.getCookies();
        if(cookies ==  null){
            return;
        }

        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())){
                cookie.setValue("");
                cookie.setPath("/");
                cookie.setMaxAge(0);
                response.addCookie(cookie);
            }
        }
    }

    // 객체를 직렬화해 쿠키의 값에 들어갈 값으로 변환
    // 직렬화(Serialization)"는 객체를 바이트 스트림으로 변환하는 과정입니다. 이 과정은 객체를 저장하거나 전송할 수 있는 형태로 변환하는 데 사용
    public static String serialize(Object object) {
        return Base64.getUrlEncoder().encodeToString(SerializationUtils.serialize(object));
    }
//    SerializationUtils.serialize(object)는 객체를 직렬화하여 바이트 배열로 변환합니다.


//    Base64.getUrlEncoder().encodeToString(...)는 이 바이트 배열을 Base64로 인코딩하여 URL-safe 형식의 문자열로 변환합니다.
//    최종적으로, 이 Base64 문자열을 반환합니다.



    // 쿠키를 역직렬화해 객체로 변환
    public static <T> T deserialize(Cookie cookie, Class<T> cls) {
        return cls.cast(
                SerializationUtils.deserialize(Base64.getUrlDecoder().decode(cookie.getValue()))
        );

//        cookie.getValue()는 Cookie에서 저장된 직렬화된 데이터를 가져옵니다.
//        Base64.getUrlDecoder().decode()는 직렬화된 바이트 데이터를 디코딩합니다.
//        SerializationUtils.deserialize()는 디코딩된 데이터를 객체로 역직렬화합니다.
//        cls.cast()는 역직렬화된 객체를 cls로 지정된 타입으로 캐스팅합니다. (T 타입으로 반환)
    }
}
