---
title: Spring Security-2 사용자 등록(Sign Up)/로그인(Sign In)
category: spring
tags: [spring, basic, usage]

---

### 사전 설정

 지난 시간에 설정한 DB 관련 항목에 추가적으로 설정합니다.

##### resources/application.yml

```yaml
spring:
  datasource:
    hikari:
      jdbc-url: jdbc:h2:file:./target/h2db/db/spring-security
      username: sa
  jpa:
    database: h2
    hibernate:
      ddl-auto: update
```

기본 서버 구동을 위한 DB 설정입니다. File DB를 통해 영속성을 관리합니다.

##### resources/application-test.yml

```yaml
spring:
  datasource:
    hikari:
      jdbc-url: jdbc:h2:mem:test
      username: sa
    initialization-mode: always
    data:
  jpa:
    database: h2
    hibernate:
      ddl-auto: create-drop
```

test 프로파일에서 In-Memory DB를 통해 구동시마다 새로운 DB를 사용하도록 합니다.(테스트 케이스의 멱등성을 유지) 
이와 관련하여 필요한 DDL은 별도 sql을 통해 설정합니다.

##### H2Configuration.java

```java
@Configuration
public class H2Configuration {

  @Bean
  @Profile("!test")
  @ConfigurationProperties("spring.datasource.hikari")
  public DataSource dataSource() throws SQLException {
    Server.createTcpServer("-tcp", "-tcpAllowOthers", "-tcpPort", "9092").start();
    return new HikariDataSource();
  }
}
```

H2 File DB는 동시에 하나의 커넥션만 연결이 가능합니다.   
서버가 구동시에 TCP를 통해 터널링을 추가해줍니다. 서버를 구동한 뒤에 `jdbc:h2:tcp://localhost:9092/./target/h2db/db/spring-security` 로 접속이 가능합니다.  
9092 이후는 application.yml에 설정된 file 경로입니다.

### 사용자 비밀번호의 암호화

 사용자를 등록하기 위해서는 로그인 비밀번호를 저장해야 합니다.   
로그인 비밀번호를 저장하기 위해서는 지켜야 하는 규약이 존재합니다.
국내에서는 **[개인정보의 안전성 확보조치 기준](https://www.law.go.kr/%ED%96%89%EC%A0%95%EA%B7%9C%EC%B9%99/%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4%EC%9D%98%EC%95%88%EC%A0%84%EC%84%B1%ED%99%95%EB%B3%B4%EC%A1%B0%EC%B9%98%EA%B8%B0%EC%A4%80)** 7조에 의해 아래와 같이 규정되어 있습니다.

> 개인정보처리자는 비밀번호 및 바이오정보는 암호화하여 저장하여야 한다. 다만, 비밀번호를 저장하는 경우에는 복호화되지 아니하도록 일방향 암호화하여 저장하여야 한다. (7조 2항)   
> 개인정보처리자는 제1항, 제2항, 제3항, 또는 제4항에 따라 개인정보를 암호화하는 경우 안전한 암호알고리즘으로 암호화하여 저장하여야 한다. (7조 5항)

정리하면  
1. 복호화가 불가능한 단방향 알고리즘 
2. 안전한 알고리즘(응?)   
의 두가지 조건을 만족해야 합니다.

OWASP10 2017버전에서는 A3 - Sensitive Data Exposure(민감한 데이터의 노출) 의 하나로 약한 암호화 알고리즘 등을 언급합니다.   
또한 그 대안으로 안전한 알고리즘을 추천합니다. 내용은 아래와 같습니다.[^1]

> Store passwords using strong adaptive and salted hashing functions with a work factor (delay factor), such as Argon2, scrypt, bcrypt or PBKDF2.

다시 한번 강조하자면, **MD5, SHA1, SHA2 등의 알고리즘은 해당하지 않습니다.**

### PasswordEncoder

Spring Security에서는 이러한 비밀번호 해싱을 위해 [PasswordEncoder](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/crypto/password/PasswordEncoder.html) interface와 함께 다양한 구현체를 제공하고 있습니다.

이중 Deprecated 되지 않은 항목은 BCrypt, SCrypt, PBKDF2, Argon2(5.3에 신규 등장) 이며, 여기서는 BCrypt를 사용할 예정입니다.

PasswordEncoder는 3개의 Method를 가지고 있고, 그 중 2개의 Method를 집중해서 살펴보겠습니다.

> String encode(CharSequence rawPassword) : Plain Text를 구현체의 알고리즘으로 암호화해줍니다.
> boolean matches(CharSequence rawPassword, String encodedPassword) : Plain Text와 encoded Text가 일치하는지 검증해줍니다. 

encode는 비밀번호 저장시에 사용하고 matches는 로그인, 비밀번호 변경 이전 검증 등의 과정에서 사용합니다.   
String이 CharSequence의 구현체이기 때문에 matches를 사용할 때는 parameter 순서에 주의하세요.  

생성자에는 해싱에 사용할 salt[^2]와 strength(해싱 강도), 알고리즘을 추가할 수 있습니다.

SecurityConfiguration 내에 PasswordEncoder Bean을 생성하도록 method를 추가합니다.   
여기서는 BCryptPasswordEncoder를 기본 생성자로 사용합니다. 적용되는 기본값은 아래와 같습니다.

- salt: new SecureRandom()
- strength: 10
- algorithm: 2A

```java
@Bean
public PasswordEncoder passwordEncoder() {
  return new BCryptPasswordEncoder();
}
```


### Sign Up(신규 회원 등록)

MemberService를 추가하고 사용자 등록을 위한 기능을 API와 연결합니다.

```java
// MemberService.java
@Service
public class MemberService {

  private MemberRepository repository;
  private PasswordEncoder passwordEncoder;  // (1)

  public MemberService(MemberRepository repository,
      PasswordEncoder passwordEncoder) {
    this.repository = repository;
    this.passwordEncoder = passwordEncoder;
  }

  public Member createMember(Member member) {   // (2)
    String encodedPassword = passwordEncoder.encode(member.getPassword());
    member.setPassword(encodedPassword);

    return repository.save(member);
  }
}

// MemberController.java 수정
@PostMapping("/register")
@ResponseStatus(HttpStatus.CREATED)
public void registerMember(@RequestBody Member member) {
  service.createMember(member);
}
```

> (1): 사용자 등록을 연결하기 위한 방법은 UserDetailsManager 인터페이스를 사용할 수도 있습니다...만, 여기서는 직접 PasswordEncoder를 다룹니다.  
> (2): Member 반환 여부는 선택입니다만, 여기서는 Member를 사용자에게 리턴할지 여부는 Controller에서 판단하도록 역할을 나눴습니다.

MemberServiceTests에 테스트 케이스를 추가하고, MemberController의 기존 테스트를 수정하고 구동해보겠습니다.
```java
@SpringBootTest
@ActiveProfiles("test")
public class MemberServiceTests {

  @Autowired
  private MemberService memberService;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @Test
  public void createMember_success() {
    String plainPassword = "test!234";
    Member member = new Member();
    member.setEmail("test@sollabs.tech");
    member.setPassword(plainPassword);

    Member result = memberService.createMember(member);

    assertThat(result.getPassword(), is(not(plainPassword)));   // (1)
    assertThat(passwordEncoder.matches(plainPassword, result.getPassword()), is(true));   // (2)
  }
}

@Test
public void registerMember_201() throws Exception {
  mockMvc.perform(post("/api/register")
      .contentType(MediaType.APPLICATION_JSON)
      .content("{\"email\" : \"test@sollabs.tech\", \"password\" : \"test!234\" }"))
      .andExpect(status().isCreated());
}
```

> (1): 실제 저장된 Entity의 Password가 입력된 Password가 다름을 확인합니다.  
> (2): 저장된 Entity의 Password가 passwordEncoder를 통해 일치하는지를 확인합니다.

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

![데이터](/images/201105/member.PNG)

### Sign In(로그인)

등록된 사용자로 로그인하기 위해서는 사용자를 조회해오는 과정이 필요합니다.

이 과정에서 Spring Security에서는 내부적으로 많은 단계를 거치지만 우리가 가장 알기 쉬운 곳은 [UserDetailsService](https://docs.spring.io/spring-security/site/docs/4.2.18.RELEASE/apidocs/org/springframework/security/core/userdetails/UserDetailsService.html)입니다. [^3]

loadUserByUsername 하나의 Method를 가지며, 여기서 말하는 Username이 우리가 흔히 말하는 로그인 ID(혹은 그와 같은 역할을 하는 Email 주소 등)입니다.

반환하는 것은 UserDetails 인터페이스, 기본 구현체로는 User가 있습니다. 이것이 Spring Security에서 사용하는 '로그인 사용자' 개념에 해당한다고 볼 수 있습니다.

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
        .map(member -> new User(member.getEmail(), member.getPassword(), Collections.emptySet())) // (1)
        .orElseThrow(() -> new UsernameNotFoundException("Member cannot Found"));
  }
}
```

> (1): UserDetails의 구현체인 User의 마지막 파라미터는 권한을 주입하는 부분입니다. 권한(인가 - Authorization)에 대한 부분은 차후에 따로 진행할 예정이라 여기서는 빈 Set을 주입했습니다.

SecurityConfiguration에 로그인 설정을 활성화하고 UserDetailsService의 Bean을 생성해줍니다.

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
      .formLogin();  // (1)
}

...

@Bean
public UserDetailsService userDetailsService(MemberRepository memberRepository) {   // (2)
  return new DatabaseUserDetailsService(memberRepository);
}

```

> (1): Spring Security에서는 기본적으로 formLogin을 지원합니다. 위와 같이 기본 설정만 활성화하면 로그인 URL(loginProcessingUrl)은 /login이 됩니다.  
> (2): UserDetailsService를 직접 Spring Bean으로 만들지 않고 SecurityConfiguration에서 Bean 생성에 대한 책임을 함께 가져가도록 했습니다. Spring Security는 복잡한 내부구조상 순환 참조(Circular Reference) 문제가 자주 발생합니다. Bean 생성 역할을 한곳에 모아놓으면 그러한 문제가 한결 덜해집니다.

로그인을 수행하기 위한 준비는 끝났습니다.   
테스트는 위해 한가지 준비가 더 필요합니다.    
사전 설정에서 기본 Profile과 test Profile의 설정을 나눠놓았기 때문에 테스트 환경에서 로그인을 위해서는 '등록된 사용자' 정보를 위해 Insert SQL문이 동작해야 합니다.    
사용자 등록 단계에서 DB에 등록된 데이터를 통해 INSERT문을 생성하시면 됩니다. 
이 문서상의 SQL문은 아래와 같습니다.  
```sql
INSERT INTO MEMBER
VALUES ('81575bac-828b-4765-8128-fa651b8cdd90', 'test@sollabs.tech',
        '$2a$10$O7h.WnTzat6CLlzTH.DMEu7evfDAI1mCERTqbX1qgCntT.5qUDTzK');
```

여기까지 구성하셨다면 아래의 테스트 케이스를 통해 검증하실 수 있습니다.

```java
@SpringBootTest
@ActiveProfiles("test")   // (1)
public class SecurityConfigurationTests {

  private MockMvc mockMvc;

  @BeforeEach
  public void setUp(@Autowired WebApplicationContext applicationContext) {
    this.mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
        .apply(springSecurity())
        .alwaysDo(print())
        .build();
  }

  @Test
  @Sql("classpath:sql/member.sql")    // (2)
  public void login_success() throws Exception {
    mockMvc.perform(post("/login")
        .contentType(MediaType.APPLICATION_FORM_URLENCODED)   // (3)
        .content("username=test@sollabs.tech&password=test!234"))
        .andExpect(status().isFound())    // (4)
        .andExpect(header().stringValues(HttpHeaders.LOCATION, "/"));
  }

  @Test
  public void login_badCredential() throws Exception {
    mockMvc.perform(post("/login")
        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
        .content("username=invalid@sollabs.tech&password=test!234"))
        .andExpect(status().isFound())
        .andExpect(header().stringValues(HttpHeaders.LOCATION, "/login?error"));
  }
}
```

> (1): 이 부분이 존재하기에 이 테스트 클래스는 'test' Profile로 작동하게 됩니다. 없으면 기본(default) Profile로 작동하면서 application-test.yml을 적용하지 않을 겁니다.
> (2): 위에 작성한 sql문을 해당 테스트 케이스 동작 전에 실행하도록 하는 구문입니다. 예시는 `src/main/test/resources/sql/member.sql` 인 경우입니다.  
> (3): formLogin이기 때문에 application/json이 아닌 application/x-www-form-urlencoded 를 content-type으로 사용하도록 했습니다.  
> (4): 마찬가지로 고전적인 formLogin에서는 로그인 성공/실패시 Page 전환을 통해 결과를 알려주도록 되어 있습니다. Found는 302입니다. 


### 마치며

여기까지가 Database를 사용한 Spring Security의 로그인 과정입니다.   
다만 form login 방식이라는 부분과 다양한 로그인의 기능(인가를 포함해서)이 빠져 있기 때문에 이대로 실무에서 사용할 수는 없습니다.    
지금까지의 2회차는 'Working Program'을 만들기 위한 준비과정이었다면,    
다음회차부터 이러한 인증 과정이 Spring Security 내에서 어떤 과정을 거치는지 살펴보면서, 실제 우리가 사용하기 위해 필요한 부분을 확장하여 실제 '사용할 수 있는 프로그램'을 만드는 단계를 시작하겠습니다.

    
**기본적인 부분을 마지막으로 한번 더 강조하자면, 사용자의 비밀번호는 잘 관리되어야 합니다.**   
이 부분을 인지하지 못하고 있는 곳들이 생각보다도 꽤 많이 있습니다.

[영상가이드(Youtube)](https://youtu.be/WF8PoBLzQkk)  
[소스 저장소(Github)](https://github.com/CyanRYi/Sollabs-basic/releases/tag/spring-security-w2)

---

[^1]: [OWASP](https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure) How To Prevent 탭에서 확인하실 수 있습니다.

[^2] 요리할때 소금을 치듯이 값을 해싱하는 과정에서 추가해주는 양념으로 이해하시면 됩니다.

[^3]: 위에서도 언급했듯이, UserDetailsManager, UserDetailsPasswordService라는 것도 존재합니다. 살펴보면, 사용자 생성, 삭제, 비밀번호 변경 등의 기본적인 기능의 인터페이스입니다.