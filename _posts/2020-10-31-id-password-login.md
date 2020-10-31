---
title: Spring Security 기초
hidden: true
---

Spring Security와 Spring Web을 포함한 신규 프로젝트를 생성했습니다.
구성은 아래와 같습니다.

![initial](/images/201031/initial.PNG)

![import](/images/201031/import.PNG)

* 여기에 필요하다면 사용자 정보를 저장하고 제공하기 위한 Database 관련 항목을 추가하시면 됩니다. 여기서는 h2를 이용한 spring-data-jpa를 사용합니다. *

![data](/images/201031/schema.PNG)

UUID 형태의 ID 하나와 로그인을 위한 email(username), password를 포함하고 있습니다.

이제 Web 접근을 위한 Controller를 하나 추가하고 호출해보겠습니다.

{% highlight java %}

    @RestController
    public class DummyController {
    
      @GetMapping("/get")
      public void getTest() {
        // return none;
      }
    }
{% endhighlight %}

/get API를 호출하면 200이 돌아와야 할것 같지만, spring-security를 import 했기 때문에 spring boot의 autoconfigure를 통해 기본적으로 인증 없이는 접근할 수 없도록 되어 있을 겁니다.
따라서 아래 Test Case는 성공하게 됩니다.

{% highlight java %}

    @WebMvcTest(controllers = DummyController.class)
    public class DummyControllerTests {
    
      private MockMvc mockMvc;
    
      @BeforeEach
      public void setUp(@Autowired WebApplicationContext context,
          @Autowired FilterChainProxy springSecurityFilterChain) {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context)
            .alwaysDo(print())
            .apply(springSecurity(springSecurityFilterChain))
            .build();
      }
    
      @Test
      public void getTest_200() throws Exception {
        this.mockMvc.perform(get("/get"))
            .andExpect(status().isUnauthorized());
      }
    }
{% endhighlight %}


---