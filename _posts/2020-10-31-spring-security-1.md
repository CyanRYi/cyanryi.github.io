---
title: Spring Security-1 접근제어 설정 및 MockMvc를 통한 테스트
category: spring
tags: [spring, basic, usage]

---

### 프로젝트 설정

Spring Security와 Spring Web을 포함한 신규 프로젝트를 생성합니다. 구성은 아래와 같습니다.

![initial](/images/201031/initial.PNG)

![import](/images/201031/import.PNG)

> 여기에 사용자 정보를 저장하고 제공하기 위한 Database 관련 항목을 추가하시면 됩니다. 여기서는 spring-data-jpa/h2 DB를 사용합니다.

![data](/images/201031/schema.PNG)

UUID 형태의 ID 하나와 로그인을 위한 email(username), password를 포함하고 있습니다.


### 기본 API 등록 및 테스트

이제 Web 접근을 위한 Controller를 하나 추가하고 테스트 케이스를 통해 호출해보겠습니다.

```java
@RestController
@RequestMapping("/api")
public class MemberController {

  private MemberService service;

  public MemberController(MemberService service) {
    this.service = service;
  }

  @GetMapping("/current")
  public Member getCurrentMember() {
    return null;  // 이후에 구현
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public void registerMember(@RequestBody Member member) {
    // 잠시후에 구현
  }
}
```

```java
@SpringBootTest
@ActiveProfiles("test")
public class MemberControllerTests {

  private MockMvc mockMvc;

  @BeforeEach
  public void setUp(@Autowired WebApplicationContext applicationContext) {
    this.mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
        .apply(springSecurity())
        .alwaysDo(print())
        .build();
  }

  @Test
  public void getCurrentMember_401() throws Exception {
    mockMvc.perform(get("/api/current"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  public void registerMember_401() throws Exception {
    mockMvc.perform(post("/api/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\" : \"test@sollabs.tech\", \"password\" : \"test!234\" }"))
        .andExpect(status().isUnauthorized());
  }
}
```

Spring Boot에서는 autoconfigure를 지원하기 떄문에 spring-security 의존성을 import 한것만으로 기본 설정이 적용됩니다.[^1]
따라서 API를 직접 호출해보면 API에 자동으로 접근제어가 설정되어 있는 것을 확인하실 수 있습니다.
다만 이러한 적용을 위해서 MockMvc에 springSecurity() 설정을 활성화 해줘야 동일한 환경에서 테스트할 수 있습니다.

이후 `GET /api/current` API를 호출하면 200이 아닌 401(Unauthorized)가 돌아옵니다. 
다만 `POST /api/register` API를 호출하면 403(Forbidden)이 돌아오는데 이는 Spring Security의 설정이 기본적으로 CSRF를 활성화하고 POST method에 작동하기 때문입니다.[^2]


#### CSRF란?
[Cross Site Request Forgery(CSRF)](https://owasp.org/www-community/attacks/csrf#:~:text=Cross%2DSite%20Request%20Forgery%20(CSRF,which%20they're%20currently%20authenticated.))는 Server side에서 View를 제어하던 시절(Controller가 정말로 Controller이던 시절) 사용되던 보안 방식중 하나입니다. 지금처럼 API 제공을 위주로 하는 방식에서는 크게 중요하지는 않을 수 있으나 이후 CORS와 함께 따로 다룰 예정입니다.

### API의 접근 허용

API별 권한 설정을 위한 Configuration class를 하나 추가합니다.   
신규 사용자 가입을 위한 `POST /api/register` API는 익명 사용자만 접근할 수 있도록 하고,   
현재 사용자를 조회하는 `GET /api/current` API를 포함한 다른 API들은 인증 사용자만 접근할 수 있도록 설정할 생각입니다.
 
```java
@Configuration
public class SecurityConfiguration extends WebSecurityConfigurerAdapter {

  @Override
  protected void configure(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf
            .ignoringRequestMatchers(new NegatedRequestMatcher(new AntPathRequestMatcher("/"))))  // (1)
        .authorizeRequests(
            requests ->
                requests.antMatchers(HttpMethod.POST, "/api/register").anonymous()  // (2)
                    .anyRequest().authenticated());
  }
}
```

(1): 기본 index 루트를 제외한 모든 요청에 대해 CSRF를 무시하도록 설정했습니다. 
(2): /api/register 경로에 대한 POST 요청에 대해서 익명 사용자만 접근 가능하도록 설정했습니다. 
ant matcher 대신 *.mvcMatchers(HttpMethod.POST, "/api/register")* 처럼 설정해도 동일하게 작동합니다.

authorizeRequests를 설정할 때 몇가지 주의점이 있습니다.
- anyRequest()는 항상 마지막에 선언되어야 합니다.
- matcher는 먼저 선언한 순서대로 적용됩니다. 

즉 아래와 같이 설정하면 `POST /api/register`에 대한 익명 접근 허용이 적용되지 않게 됩니다.
```java
requests
    .antMatchers(HttpMethod.POST, "/api/**").hasRole("ADMIN")   // /api로 시작하는 모든 경로에 대해 먼저 처리됨.
    .mvcMatchers(HttpMethod.POST, "/api/register").anonymous()  // 윗줄의 설정이 적용되었기 때문에 무시됨.
    .anyRequest().authenticated());
```

즉 모든 matcher는 if... if else... 처럼 동작하다가 마지막 anyRequest()가 else 문의 역할을 한다고 이해하시면 됩니다.

테스트 케이스를 수정하겠습니다.

```java
@Test
public void getCurrentMember_403() throws Exception {
  mockMvc.perform(get("/api/current"))
      .andExpect(status().isForbidden());
}

@Test
public void registerMember_201() throws Exception {
  mockMvc.perform(post("/api/register")
      .contentType(MediaType.APPLICATION_JSON)
      .content("{\"email\" : \"test@sollabs.tech\", \"password\" : \"test!234\" }"))
      .andExpect(status().isCreated());
}
```

영상 가이드: https://youtu.be/krBgmoHDqFQ (2020-11-07 18:15 공개)  
깃헙 저장소: https://github.com/CyanRYi/Sollabs-basic/releases/tag/spring-security-w1

---

[^1]: 더 정확히는 @SpringBootApplication 애노테이션이 @EnableAutoConfiguration을 포함하여 적용하기 떄문입니다.

[^2]: CSRF에 대해서는 자세히 얘기하는 것을 다음으로 미루겠습니다만, 백엔드가 View(JSP 등)을 직접 핸들링 하던 시절의 보안 수단중 하나입니다.
  Spring Security의 기본 CSRF 설정에서는 GET, HEAD, TRACE, OPTIONS 메소드 요청에 대해서는 CSRF를 면제(allow)해서 POST에서만 403이 적용됩니다.