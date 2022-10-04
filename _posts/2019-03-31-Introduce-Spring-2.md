---
title: Spring framework를 대하는 자세(1) - Spring의 POJO
category: spring
tags: [spring]
hidden: true
---

토비의 스프링에서는 '개발자들이 스프링을 통해 얻게 되는 두 가지 중요한 가치[^1]' 라고 표현하는 두가지가 있다. 단순함에서 POJO를, 유연성에서 "항상 프레임워크 기반의 접근 방법을 사용해라"를 소개한다.

   



### 'Framework가 대체 뭔데?'

buzzword라고 말해지는 이 표현부터 문제인데, Library와 Framework 사이의 차이를 이해하는 것이 조금은 도움이 될 것이라 생각한다.

_Framework calls your code, your code calls Library_

내 코드를 호출하는 것이 프레임워크, 내 코드에 의해 호출 되는 것이 라이브러리 라는 표현이다. 이를 대략적인 그림으로 그려보면 아래와 같다.

![framework and library](/_posts/images/190318/application.PNG)

그럼 프레임워크와 라이브러리는 다른가?

대답은 글쎄...?

framework가 돌아가기 위해서는 스스로 돌아갈 수도 있지만, 그 과정에서 라이브러리를 필요로 하기도 한다. Spring의 경우 org.aopalliance나 org.apache.commons.logging 같은 라이브러리를 repack해서 가지고 있기도 하고, 당연히 그것들을 라이브러리처럼 소스코드에서 직접 호출해 사용할 수도 있다.






> 항상 프레임워크로 접근하라



먼저 Library, 간단한 [apache commons lang](https://search.maven.org/artifact/org.apache.commons/commons-lang3/3.8.1/jar) 같은 경우는 우리의 코드에 의해 사용된다.
{% highlight java %}

    RandomStringUtils.randomAlphabetic(128);
    
{% endhighlight %}

다른 것이 끼어들 여지 없이, 우리가 작성한 코드에 의해 호출된다. static이 아닌 경우도 마찬가지로, 우리 코드에 의해 객체가 생성되어, 호출된다. 전적으로 행위의 주체는 우리가 작성한 코드이다.

반면, Spring framework는 코드가 수행되면서 component-scan에 의해 우리가 만든 코드를 검색, 그 중 Spring Bean을 정해진 절차에 따라 생성해서 컨테이너 안에 담는다. 예를 들어 아래와 같은 코드

{% highlight java %}
@RestController
public class DummyController {

    @Autowired
    private DummyService dummyService;

    @RequestMapping(path = "/dummy", method = RequestMethod.GET)
    public DummyResult getDummy() {
    
        return dummyService.findDummy();
    }
    ...
{% endhighlight %}

DummyController.getDummy에서는 DummyService의 findDummy Method를 호출한다. 우리는 자연스레 dummyService 안에는 DummyService 인터페이스를 구현한 DummyServiceImpl의 객체가 들어 있을거라 생각하고, 실제 DummyServiceImpl의 findDummy를 호출한다고 생각하게 된다.
하지만 우리가 호출하는 것은 Spring에 의해 생성되고 주입된 DummyService type의 어떠한 객체이다. 우리는 저 안에 주입된 객체가 어느순간 DummyServiceImpl에서 NewDummyServiceImpl로 바뀐다고 해도 그것을 알 수 없다. 그 과정이 **오롯이 framework에 의해 실행**되기 때문이다.[^4]




 

---
[^1]: 개인적으로는 이 두가지를 'Spring framework의 핵심 철학' 이라고 표현하는데, 이 두가지가 Spring의 창조 이념에 가깝다고 생각될 정도로 소스코드 모든 곳에서 엿보이기 때문이다. 이는 [Spring reference 문서](https://docs.spring.io/spring-framework/docs/current/spring-framework-reference/overview.html#overview-philosophy)에 있는 Design Philosophy와는 다르다.

[^2]: [oracle 사이트](http://oracle.com.edgesuite.net/timeline/java/)에서는 이곳에서 확인할 수 있다. 보기 힘들어서 정리된 text 버전으로 연결했다.

[^3]: 아마도 글쓴이가 마지막에 말하는 a-POJO란 anti POJO가 아닐까 싶을 정도로 극단적으로 표현하지만, 비슷한 고민을 가졌던 것이 사실이다. 재밌는 것은, 댓글조차 찬반이 섞여 있다.  