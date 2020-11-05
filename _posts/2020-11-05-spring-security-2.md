---
title: Spring Security-2 사용자 등록과 PasswordEncoder(비밀번호 암호화)
category: spring
tags: [spring, basic, usage]
hidden: true
---

### PasswordEncoder

본격적인 인증과정을 시작하기 이전에 인증과 관련된 기본적인 부분을 한가지 설명하고 진행해야 합니다.

**사용자의 인증에 필요한 암호는 '복호화될 수 없는' 방식으로 암호화되어 저장되어야 합니다.**

다양한 해싱 알고리즘 중 MD5, SHA1은 더이상 사용되지 않습니다. (분명히 쓰고 있는 곳은 있을텐데, 쓰면 안됩니다.)[^1]

Spring Security에서는 이러한 비밀번호 해싱을 위해 [PasswordEncoder](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/crypto/password/PasswordEncoder.html) interface와 함께 다양한 구현체를 제공하고 있습니다.

이중 Deprecated 되지 않은 항목은 BCrypt, SCrypt, PBKDF2, Argon2(5.3에 신규 등장) 이며, 여기서는 BCrypt(2a)를 사용할 예정입니다.

SecurityConfiguration 내에 PasswordEncoder Bean을 생성하도록 method를 추가합니다.

```java
@Bean
public PasswordEncoder passwordEncoder() {
  return new BCryptPasswordEncoder();
}
```

생성자에는 해싱에 사용할 salt[^2]와 해싱 강도값을 추가할 수 있습니다.

PasswordEncoder는 아래와 같은 두가지 Method를 가집니다.

- encode(String) : 주어진 plain text를 encode하여 반환합니다.
- matches(CharSequence, String) : plain text와 encode된 text를 받아 일치 여부를 확인합니다. parameter 주입순서에 주의하세요.


### Sign Up(신규 회원 등록)

MemberService를 추가하고 사용자 등록을 위한 기능을 API와 연결합니다.

```java
// MemberService.java
@Service
public class MemberService {

  private MemberRepository repository;
  private PasswordEncoder passwordEncoder;

  public MemberService(MemberRepository repository,
      PasswordEncoder passwordEncoder) {
    this.repository = repository;
    this.passwordEncoder = passwordEncoder;
  }

  public void createMember(Member member) {
    String encodedPassword = passwordEncoder.encode(member.getPassword());
    member.setPassword(encodedPassword);

    repository.save(member);
  }
}

// DummyController.java 수정
@PostMapping("/register")
@ResponseStatus(HttpStatus.CREATED)
public void registerMember(@RequestBody Member member) {
  service.createMember(member);
}
```

테스트 케이스를 수정하고 구동해보겠습니다.
```java
@Test
public void registerMember_201() throws Exception {
  this.mockMvc.perform(post("/api/register")
      .contentType(MediaType.APPLICATION_JSON)
      .content("{\"email\": \"cyan.yi@sollabs.tech\", \"password\": \"test!234\"}"))
      .andExpect(status().isCreated());
}
```

테스트에 성공했으니 실제 사용자를 등록합니다.

```
POST http://localhost:8080/api/register
Content-Type: application/json

{
  "email": "cyan.yi@sollabs.tech",
  "password": "test!234"
}
```

등록된 사용자 정보는 아래와 같습니다. password는 bcrypt로 암호화되어 있으며, 항상 60자의 길이를 가집니다.

![데이터](/images/201031/member.PNG)

### Sign In(로그인)

등록된 사용자로 로그인하기 위해서는 사용자를 조회해오는 과정이 필요합니다.

이 과정에서 Spring Security에서는 내부적으로 많은 단계를 거치지만, 우리가 가장 인지하기 쉬운 곳은 [UserDetailsService](https://docs.spring.io/spring-security/site/docs/4.2.18.RELEASE/apidocs/org/springframework/security/core/userdetails/UserDetailsService.html)입니다.

loadUserByUsername 하나의 Method를 가지며, 여기서 말하는 Username이 우리가 흔히 말하는 로그인 ID(혹은 그와 같은 역할을 하는 Email 주소 등)입니다.

UserDetailsService의 구현 클래스를 만들고 이를 Spring Bean으로 추가해줍니다.

지금 단계에서는 여기까지만 해도 DB의 사용자 데이터를 기반으로 로그인할 수 있습니다.

```java
public class DatabaseUserDetailsService implements UserDetailsService {

  private MemberRepository memberRepository;

  public DatabaseUserDetailsService(
      MemberRepository memberRepository) {
    this.memberRepository = memberRepository;
  }

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    return memberRepository.findByEmailIgnoreCase(username)
        .map(member -> new User(member.getEmail(), member.getPassword(), Collections.emptySet()))
        .orElseThrow(() -> new UsernameNotFoundException("Cannot find Member"));
  }
}
```

```java
@Override
protected void configure(HttpSecurity http) throws Exception {
  http
      .csrf(csrf -> csrf
          .ignoringRequestMatchers(new AntPathRequestMatcher("/api/**")))
      .authorizeRequests(request ->
          request
              .antMatchers(HttpMethod.POST, "/api/register").anonymous()
              .anyRequest().authenticated())
      .userDetailsService(userDetailsService())
      .formLogin(login -> login.loginProcessingUrl("/login"));
}

...

@Bean
public UserDetailsService userDetailsService(MemberRepository memberRepository) {
  return new DatabaseUserDetailsService(memberRepository);
}
```

---

[^1] 개인정보보호법 7조 5항에 의해 문제가 될 수 있습니다. 개인적으로 SHA2도 권장하지 않습니다.

[^2] 요리할때 소금을 치듯이 값을 해싱하는 과정에서 추가해주는 양념으로 이해하시면 됩니다.