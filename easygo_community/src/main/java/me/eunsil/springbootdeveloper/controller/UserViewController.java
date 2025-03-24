//package me.eunsil.springbootdeveloper.controller;
//
//
//import jakarta.servlet.http.HttpServletRequest;
//import jakarta.servlet.http.HttpServletResponse;
//import lombok.RequiredArgsConstructor;
//import me.eunsil.springbootdeveloper.dto.AddUserRequest;
//import me.eunsil.springbootdeveloper.service.UserService;
//import org.springframework.security.core.context.SecurityContextHolder;
//import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
//import org.springframework.stereotype.Controller;
//import org.springframework.web.bind.annotation.GetMapping;
//import org.springframework.web.bind.annotation.PostMapping;
//
//@RequiredArgsConstructor
//@Controller
//public class UserViewController {
//
//    private final UserService userService;
//
//
//    @GetMapping("/login")
//    public String login(){
//        return "login";
//    }
//
//    @GetMapping("/signup")
//        public String signup() {
//            return "signup";
//
//        }
//
//    @GetMapping("/articles")
//    public String articleList() {
//        return "articleList";
//    }
//
//    @PostMapping("/user")
//    public String signup(AddUserRequest request) {
//        userService.save(request);
//        return "redirect:/login";
//
//
//    }
//
//    @GetMapping("/logout")
//    public String logout(HttpServletRequest request, HttpServletResponse response) {
//        new SecurityContextLogoutHandler().logout(request, response, SecurityContextHolder.getContext().getAuthentication());
//        return "redirect:/login";
//    }
//
//}
//
