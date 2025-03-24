package me.eunsil.springbootdeveloper.service;

import lombok.RequiredArgsConstructor;
import me.eunsil.springbootdeveloper.domain.RefreshToken;
import me.eunsil.springbootdeveloper.repository.RefreshTokenRepository;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor
@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshToeknRepository;
    // 전달받은 리프레시 토큰으로 리프레시 토큰 객체를 검색해서 전달하는 findByRefreshToekn() 메서드
    public RefreshToken findByRefreshToken(String refreshToken) {
        return refreshToeknRepository.findByRefreshToken(refreshToken).orElseThrow(() -> new IllegalArgumentException("Unexpected token"));
    }

}
