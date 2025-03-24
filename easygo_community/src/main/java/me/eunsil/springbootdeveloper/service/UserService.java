package me.eunsil.springbootdeveloper.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.eunsil.springbootdeveloper.domain.User;
import me.eunsil.springbootdeveloper.dto.AddUserRequest;
import me.eunsil.springbootdeveloper.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Slf4j
@RequiredArgsConstructor
@Service
//  AddUserRequest 객체를 인수로 받는 회원 정보 추가 메서드 위함
public class UserService {

    private final UserRepository userRepository;
//    private final BCryptPasswordEncoder bCryptPasswordEncoder;

    public Long save(AddUserRequest dto) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        return userRepository.save(User.builder()
                .email(dto.getEmail())
                .password(encoder.encode(dto.getPassword())).nickname(dto.getNickname())
                .build())
                .getId();
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("Unexpected user"));
    }

    public User findById(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("unexpected user"));
    }

    public User updateNickname(String nickname, String email) {
        log.info("Attempting to update nickname for email: {}", email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("User not found for email: {}", email);
                    return new IllegalArgumentException("사용자를 찾을 수 없습니다.");
                });
        log.info("Found user: {}", user);
        User updatedUser = user.update(nickname);
        log.info("Updating nickname to: {}", nickname);
        return userRepository.save(updatedUser);
    }
}


