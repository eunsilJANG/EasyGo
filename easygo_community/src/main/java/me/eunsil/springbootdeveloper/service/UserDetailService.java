package me.eunsil.springbootdeveloper.service;

import lombok.RequiredArgsConstructor;
import me.eunsil.springbootdeveloper.domain.User;
import me.eunsil.springbootdeveloper.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor
@Service
// 스프링 시큐리티에서 사용자 정보를 가져오는 인터페이스
// UserDetailsService 인터페이스를 구현하여, 사용자의 정보(예: 사용자 이름, 비밀번호 등)를 데이터베이스에서 가져오는 역할
public class UserDetailService implements UserDetailsService {


    private final UserRepository userRepository;

    // 사용자 이름(email)으로 사용자의 정보를 가져오는 메서드
    @Override
    public User loadUserByUsername(String email){
        return userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException(email));
    }
}
