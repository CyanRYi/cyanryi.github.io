---
title: Spring framework를 대하는 자세(2) - 모듈들
category: spring
tags: [spring]
---


### Spring framework의 Module들

기본적으로는 모두 org.springframework의 group id를 가진다. 아래는 모두 artifact id를 기준으로 나열한다.

'토비의 Spring'에 잘 설명되어 있으나, Spring 5 이후 약간의 변경이 있는 점(특히 3.2.x 이후) 등을 추가로 반영하여 설명한다.

최근 몇년 사이에는 Spring Boot를 통해 사용하게 되면서 직접 모듈의 의존성 관리를 할 일이 드물어졌는데, Spring의 내부 작동을 이해하기 위해서는 사실 아래 내용을 좀 이해할 필요는 있다.


#### Spring Framework 상에서도 꽤 상위에 있는 모듈들

아래 모듈들은 Spring Framework 내부의 의존관계에서도 꽤 상위에 존재하는 모듈들이다. 
Spring에서 제공하는 기능중 핵심인 DI와 AOP를 위한 기능을 제공하는 모듈을 자의적으로 구분했으며,  
core, beans, aop, expression, context, context-support 까지는 이렇게 구분한다.[^5]  

1. spring-core : 
Spring framework의 최상위 모듈. 이전에는 최상위가 core, asm으로 나뉘어 있었지만 3.2부터 통합되었다. (asm은 core 모듈 내부에 패키지로 존재)  
Spring framework 내부의 하위 모듈들이 공통으로 사용하는 Util 등도 이곳에 포함되어 있으며, 내용물은 정말 방대하지만, 우리에게 익숙한 것은 [Converter](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/core/convert/converter/Converter.html), [Environment](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/core/env/Environment.html)가 여기에 있다.

2. spring-beans : 
Spring DI를 위한 기능을 한다. [@Autowired](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/beans/factory/annotation/Autowired.html), [BeanFactory](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/beans/factory/BeanFactory.html)가 여기에 있다.  
물론 그 외에도 Bean 생명주기에 관련된 여러가지 기본 기능들이 이 모듈 안에 존재하며, 추가적으로 [Property Editor](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/beans/propertyeditors/package-frame.html)들도 여기에 있다.

3. spring-aop :
AOP 기능을 위한 모듈로, 안에 함께 패키징된 org.aopalliance 패키지 안에는 Rod Johnson의 손길로 가득차 있다. AOP를 위한 기능은 대부분 여기에 들어 있는데, 요즘은 AspectJ를 통해 사용하는 경우가 많아서 spring-aspects 모듈을 통해 간접적으로 사용되는 경우가 더 많다. 다만 실질적인 구현을 위해 필요한 Proxy, Advice, Pointcut등을 위한 클래스들은 여기에 속해 있다.

4. spring-context
Container로써의 기능을 제공하기 위한 수많은 기능이 들어 있다.[^6]
[ApplicationContext](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/context/ApplicationContext.html)가 여기 있으며, [@Component](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/stereotype/Component.html), [@Configuration](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/context/annotation/Configuration.html) 등, Spring Bean 생성을 위한 Annotation들, Spring 내부 Event 전달을 위한 [ApplicationEvent](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/context/ApplicationEvent.html)도 여기에 있다.
외에도 Caching, Scheduling, Validation, jmx 등 다양한 기능을 위한 interface와 구현체를 포함하고 있어, Spring framework의 소스코드에 접근하기 시작하게 되면 빈번하게 접근할 수 밖에 없다.

5. spring-context-support
spring-context 모듈에 존재하는 caching(caffeine, ehcache, jcache 구현체 및 tx 관리), scheduling(commonj, quartz 구현), mail에 대한 기능이 이곳에 존재한다. Spring을 사용하여 Web 구현을 하게 되면, 필요한 경우 이 모듈을 자연스럽게 가져오게 되니 사실 크게 신경쓸 필요가 없다.[^7]

6. spring-expression  
Spring에서 쓰이는 표현식을 위한 모듈이다. 정식으로는 스프링 표현식 언어, SpEL이라고 부른다.
많은 영역에서 쓰이고, 아래와 같은 경우가 흔히 보이는 경우이다. 
{% highlight java %}
@Value("#{member.firstName.concat(' ').concat(member.lastName)}")

@Pointcut("execution(* transfer(..))")
{% endhighlight %}

#### Data Access 관련 모듈
아래 모듈들은 Spring framework 내에서 Data Access와 관련된 역할을 하는 모듈들이다. 물론 위의 상위 모듈들에 대한 의존성이 필요하다.

7. spring-tx(spring transaction)
이름 그대로 Transaction에 관련된 기능([@Transactional](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/annotation/Transactional.html) 등)이 있다. 다만 여기에 국한되는 것은 아니고, 조금 넓게 Data Access Layer에 대한 표준화 기능도 포함하고 있다. DBMS마다 다른 오류 코드를 표준화하기 위한 다양한 Exception class는 물론, 직접 다룰 일은 흔치 않아진 [DaoSupport](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/dao/support/DaoSupport.html)도 이 모듈 안에 있다.

8. spring-jdbc
jdbc 연결을 위한 모듈로, orm이나 querymapper 사용시에도 당연히 이를 의존한다. 최근에는 직접 다룰 일이 드문 PreparedStatement 등이 여기에 있고, [AbstractDataSource](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/datasource/AbstractDataSource.html) 등, javax.sql 패키지의 인터페이스를 Spring framework를 통해 사용하기 위한 구현체나 추상 클래스 등이 이곳에 있다.

9. spring-orm
spring framework에서 orm을 사용하기 위한 기술인데, java에서의 orm 표준인 jpa 관련 모듈이 들어가는 것은 당연하고, 패키지는 hibernate만 별도로 존재한다.(클래스 레벨에서는 Eclipse Link 관련도 보이는데, 써보지도, 열어보지도 않아서 전혀 모른다) 다만 spring 3.x까지는 이 안에 iBatis 관련 패키지도 존재햇다.[^8]


#### Web 환경 관련 모듈

Web 모률
Web은 스프링 웹 기술의 공통적인 기능을 정의한 모률이다. 스프링 MVC 외에도
스프링이 직접 지원하는 스트릿츠， JSF 등을 적용할 때도 펼요하다. 또한 Caucho,
HttpInvoker, JAX-RPC, JAX-WS 등의 리모팅 기능도 포함하고 있다. 기본적인 바
인딩， 컨텍스트 로더， 필터， 멀티파트， 메시지 컨버터 기능도 제공한다.
Web 모률은 Context 모률을 필수 모률로 갖고 있다.XML을 사용히는 메시지 컨버
터 기능에는 OXM 모률이 필요할 수 있다. 

Aspects 모률
Aspects는 스프링이 제공히는 ApsectJ AOP 기능을 사용할 때 펼요한 모률이다. 스프
링이 직접 제공하는 AspectJ로 만든 기능은 @Configurable을 이용한 도메인 오브젝트
DI 기능， JPA 예외 변환기， AspectJ 방식의 트랜잭션 기능 등이 있다.
Aspects의 펼수 의존모률은 없다. JPA 지원 기능을 사용할 때는 ORM, 트랜잭션 지
원 기능을 시용할 때는 Transaction 모율에 선택적으로 의존한다. 

Test 모률
Test는 스프링의 테스트 지원 기능을 가진 모률이다. 테스트 컨텍스트 프레임워크나 목
오브젝트 등을 이용해 태스트를 만들 때 사용한다. 테스트용 모률이기 때문에 운영 중
에는시용되지않는다. 

WebMVC
WebFlux
JMS
   



---
[^1]: 개인적으로 2개를 꼽자면, 'POJO', '항상 framework로 접근하라' 이 2개를 꼽을 수 있다. 

[^2]: 물론 저 뒤에 따라오는 말은 'C#은 그런거 없이도 다 된다' 이긴 했다. 여기서는 불필요해서 제거한다.

[^3]: 
    Spring framework 소스코드를 뜯어보던 초보 개발자때 토비(이일민)님 블로그에 다다른 적이 있었다.  
    그리고 봤다. '스프링 소스코드를 보는건 언제나 어렵다' 라고 쓰여 있던..  
    
[^4]:
    작년에도 도움이 필요한 후배 개발자 때문에 처음 Spring 공부할때 썼던 xml 설정을 다시 꺼내본적이 있는데
    지금봐도 어려웠다. 사실 가능하다면 Java Config를 쓰는게 훨씬 편하다(고 생각한다). 
 
[^5]: 물론 완전히 자의적인 것은 아니고, Spring reference guide에서 '[Spring Core Technologies](https://docs.spring.io/spring/docs/current/spring-framework-reference/core.html)' 라는 제목 아래 다루는 영역이 이 정도다.

[^6]: '토비의 스프링'에서는 **본격적인 엔터프라이즈 애플리케이션 프레임워크로 사용하기 위해 반드시 필요한 모듈**로 표현한다. 

[^7]: spring-web은 spring-context-support와 무관하다. 하지만 webmvc와 webflux가 context-support에 의존성을, optional로 가지고 있다.

[^8]: 그때까지만 해도 드물지 않게 myBatis(혹은 iBatis)가 ORM이냐 아니냐에 대한 논쟁이 해외에서 종종 보이곤 했는데, Spring의 이 모듈도 논란에 일조했으리라 어렴풋이 짐작할 뿐이다. 지금 생각하면 대체 왜 그런 무의미한 논쟁이 있었는지...

### 실사용예 보기

Spring-data-jpa(+QueryDsl)를 쓴다면 이런 코드에 익숙할 것이다.
 
{% highlight java %}
    @RequestMapping(path = "/test", method = RequestMethod.GET)
    public String getTest(Pageable page) {

        log.info("size : " + page.getPageSize());
        log.info("number : " + page.getPageNumber());
        
        return "SUCCESS";
    }
{% endhighlight %}

{% highlight shell %}  
curl -X GET \
  'http://localhost:12001/test?page=0&size=50' \
  -H 'Accept: application/json' \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -H 'Postman-Token: 715f37b6-2516-4182-9440-826e2ee2277f'
{% endhighlight %}

```
2019-03-05 16:05:21.761  INFO 21332 --- [io-12001-exec-4] tech.sollabs.webdemo.TestResource        : size : 50
2019-03-05 16:05:21.761  INFO 21332 --- [io-12001-exec-4] tech.sollabs.webdemo.TestResource        : number : 0
```

page parameter에는 @RequestParam도, @ModelAttribute도, @RequestBody도 없지만 이러한 기능을 가능케 하는 것이 HandlerMethodArgumentResolver이다.

이 기능을 위해 활성시켜야 하는 것이 @EnableSpringDataWebSupport이고, 해당 @Enable Annotation은 QuerydslWebConfiguration을 활성화시킨다.

그리고 해당 Configuration 안에서는 [QuerydslPredicateArgumentResolver](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/web/querydsl/QuerydslPredicateArgumentResolver.html)를 구현해서 등록해준다.


### 써보기

지금 하고 있는 프로젝트에서도 페이징을 하는데, parameter가 pagenum, pagesize라고 하자.

덤으로 JPA를 안쓰기 때문에 spring-data-jpa도 안쓴다고 하자.

(내가 생각했지만 실화 같다..)

이러면 만들어 써야지..

{% highlight java %}
    public class PagingRequest {
    
        private int pagenum;
    
        private int pagesize;
    
        public PagingRequest(int pagenum, int pagesize) {
            this.pagenum = pagenum;
            this.pagesize = pagesize;
        }
    
        public int getPagenum() {
            return pagenum;
        }
    
        public int getPagesize() {
            return pagesize;
        }
    }
{% endhighlight %}

일단 필요한건 요거부터. 그리고 ArgumentResolver를 만들어 보면..

{% highlight java %}
    public class PagingRequestArgumentResolver implements HandlerMethodArgumentResolver {
    
        @Override
        public boolean supportsParameter(MethodParameter methodParameter) {
            return methodParameter.getParameterType().isAssignableFrom(PagingRequest.class);
        }
    
        @Override
        public Object resolveArgument(MethodParameter methodParameter, ModelAndViewContainer modelAndViewContainer, NativeWebRequest nativeWebRequest, WebDataBinderFactory webDataBinderFactory) throws Exception {
    
            int pageNum = Integer.parseInt(nativeWebRequest.getParameter("pagenum"));
            int pageSize = Integer.parseInt(nativeWebRequest.getParameter("pagesize"));
    
            return new PagingRequest(pageNum, pageSize);
        }
    }
{% endhighlight %}
> null check나 기타 Validation은 각자 재량껏 하자.

{% highlight java %}
    @EnableWebMvc
    @Configuration
    public class WebConfig extends WebMvcConfigurerAdapter {
    
        @Override
        public void addArgumentResolvers(List<HandlerMethodArgumentResolver> argumentResolvers) {
            argumentResolvers.add(new PagingRequestArgumentResolver());
        }
    }
{% endhighlight %}

가장 쉽게 활성화 시킬 수 있는 방법이다.

{% highlight java %}
    @RequestMapping(path = "/test", method = RequestMethod.GET)
    public void getTest(PagingRequest page, @RequestParam("other") String otherParameter) {
    
        log.info("page size : " + page.getPagesize());
        log.info("page number : " + page.getPagenum());

        log.info("parameter : " + otherParameter);
    }
{% endhighlight %}

Controller를 바꿔서 호출해 보면,

{% highlight shell %}
curl -X GET \
  'http://localhost:12001/test?pagenum=2&pagesize=51&other=PARAMETER' \
  -H 'Accept: application/json' \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -H 'Postman-Token: c61ab1b8-7667-4d71-a79d-b59193191ea6'
{% endhighlight %}

```
2019-03-05 17:36:10.428  INFO 21272 --- [io-12001-exec-3] tech.sollabs.webdemo.TestResource        : page size : 51
2019-03-05 17:36:10.428  INFO 21272 --- [io-12001-exec-3] tech.sollabs.webdemo.TestResource        : page number : 2
2019-03-05 17:36:10.429  INFO 21272 --- [io-12001-exec-3] tech.sollabs.webdemo.TestResource        : parameter : PARAMETER
```

있는지만 알아두면 다양하게 응용하기도 좋고 전역 설정을 하기도 좋다.(가장 좋은건 쓰기 쉽다.)

특히 유사한 구조가 많기 때문에 응용의 폭이 훨씬 더 넓어진다는게 장점.