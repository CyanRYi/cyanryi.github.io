---
title: Spring framework를 대하는 자세(1) - Spring의 POJO
category: spring
tags: [spring, basic]
hidden: true
---

토비의 스프링에서는 '개발자들이 스프링을 통해 얻게 되는 두 가지 중요한 가치[^1]' 라고 표현하는 두가지가 있다. 단순함에서 POJO를, 유연성에서 "항상 프레임워크 기반의 접근 방법을 사용해라"를 소개한다.

### POJO(Plain Old Java Object)

> (...) In the talk we were pointing out the many benefits of encoding business logic into regular java objects rather than using Entity Beans. We wondered why people were so against using regular objects in their systems and concluded that it was because simple objects lacked a fancy name. So we gave them one, and it's caught on very nicely  
    - [Martin Fowler](https://www.martinfowler.com/bliki/POJO.html)
    
2000년 9월에 등장한 이 용어는 지금까지도 살아서 통용되고 있으며, 심지어 다른 언어로 이식되기도 했다(C#에서의 PONO - Plain Old .NET Object - 라던가).
[기록된 역사](https://www.javatpoint.com/history-of-java)[^2]를 참고하면, 이 때는 Java 1.3이 나온지 몇개월이 채 지나지 않은 시기였다. 하지만 아직은 enum도, generic도, @애노테이션도 없었다.   
생태계에서는 Struts가 갓 생겨나기 시작했고, 그 1년 뒤에 Hibernate가, 그로부터 또 1년이 더 지나서야 Spring이 0.9로 얼굴을 드러냈다.
20세기의 마지막 해인 저 해에 한국에서 태어난 아이는 올해 대학생이 되었을 긴 세월이다. 조금 이르지만, 이러한 부분을 먼저 언급하고 지나가야 할 것 같다.

#### 그래서 POJO가 뭔데?

간단하게 말해 Java로 프로그램을 만드는 과정에서 많은 '규약'을 들어내는 것이다. 특정 벤더, 기술, 혹은 상속이나 구현에 대한 강요로부터 벗어나는 것을 의미한다. 웹 프로그래밍을 구현하기 위해서는 HttpServlet을 상속받아야 했다. 웹 페이지를 만들기 위해서는 jsp가 강요되었다. 불과 몇년 전까지도 겪었던 이러한 규약으로부터 벗어나는 것이 POJO가 등장한 목적이었다. 보통 이 용어를 설명할때는 "POJO? 그거 그냥 마케팅 용어야. '순수한 자바' 정도 될까?" 라고 표현하곤 한다. 

#### POJO와 @애노테이션

먼저 한가지를 짚고 넘어가야 한다. POJO에 대해 얘기하면서 상속이나 구현에 대한 강요로부터 벗어나는 것에 대한 얘기를 했다. 그렇다면 Annontation은? 우리가 Spring, 혹은 다른 기술을 사용하는 과정에서 익숙하게 사용하는 이 개념에 대해서는 우리가 어떻게 받아들여야 할까? 라는 질문이다.

먼저 한가지 전제를 해야 한다. POJO라는 용어가 등장할때는 위에서도 언급한대로 Java에 그런게 없었다. 그리고 등장 이후, POJO와 연결되어 [논란](https://xebia.com/blog/a-pojo-with-annotations-is-not-plain/)[^3]이 있었던 것도 사실이다(나 또한 이와 같은 고민을 했었고, 나도 애노테이션이 적용된 Java를 본래 말해지던 POJO라고 말하기는 힘들다고 보는 쪽이긴 하다). 혹자는 XML을 사용하던 시절의 Spring이 애노테이션을 사용하는 지금의 Spring보다 더 POJO에 가깝다고 말하기도 한다.

그러면 묻자.  
벤더, 기술이 아니라 XML이라고 하는 특정 포맷에 대한 의존성을 가지는 Spring은 POJO인가?  
혹은, 비즈니스 로직에서 ApplicationContext에 직접 접근해서 Bean을 꺼내 쓴다면, 그것은 POJO인가?

너무 집착하지 말자. POJO가 중요한 것이 아니라, POJO라는 단어를 만들어내면서까지 강조하고자 했던 프로그래밍 철학이 더 중요하다는 것을 잊지 말자.
POJO, 객체지향 개발, 더 거슬러 올라가서 소프트웨어 개발에서 지켜야 하는 철학이 중요하다.

개인적으로는 애노테이션을 대체할 무언가가 있었으면 하는 욕심도 있지만, 이를 통해 얻게 되는 '명료한 코드'의 가치도 무시할 수 없다고 보는 편이다.
재봉선이 없는 옷은 없다. 화려한 드레스일수록, 재봉선은 많아질 수 밖에 없다.

이러한 방식을 APOJO(Annotated POJO - 애노테이션을 걷어내면 다시 POJO로 돌아갈 수 있는 상태)라고 부른 적도 있다는 것 같은데, 사실 지금 시점에서 POJO에 대해 말하는 많은 경우는 APOJO까지 포함된 넓은 표현이라는 것이 맞는 것 같다.

Spring에서는 별도의 [가이드](https://spring.io/understanding/POJO)에서 '특정 인터페이스의 구현을 강제하는 것을 피하기 위해, 애노테이션을 사용한다.' 라는 내용을 위주로 설졍하고 있다.

#### Spring에서의 POJO

> The essence of Spring is in providing enterprise services to Plain Old Java Objects(POJOs). This is particularly valuable in a J2EE environment, but application code delivered as POJOs is naturally reusable in a variety of runtime environments.
    스프링의 본질은 엔터프라이즈 서비스를 POJO에 제공하는 것. 이는 J2EE 환경에서 특히 유용하지만, POJO로 전달되는 응용프로그램 코드는 다양한 런타임 환경에서 자연스럽게 재사용될 수 있다.   
    - Professional Java Development with the Spring framework(Rod Johnson, Juergen Hoeller, Alef Arendsen, Thomas Risberg, Colin Sampaleanu), Wiley Publishing
        
Spring에 있어 POJO는 가장 중요한 요소 중 하나이다. 위와 같은 본질에 충실하기 위해 - POJO로 다양한 기능을 수행할 수 있도록 하기 위해 - DI나 AOP, 추상화와 같은 기술적 원리를 적용하고 있다. 동일한 저서에서 서술하는 11가지의 Spring의 가치[^4] 대부분이 직간접적으로 POJO와 연관이 있다고 볼 수도 있다.


---
[^1]: 개인적으로는 이 두가지를 'Spring framework의 핵심 철학' 이라고 표현하는데, 이 두가지가 Spring의 창조 이념에 가깝다고 생각될 정도로 소스코드 모든 곳에서 엿보이기 때문이다. 이는 [Spring reference 문서](https://docs.spring.io/spring-framework/docs/current/spring-framework-reference/overview.html#overview-philosophy)에 있는 Design Philosophy와는 다르다.

[^2]: [oracle 사이트](http://oracle.com.edgesuite.net/timeline/java/)에서는 이곳에서 확인할 수 있다. 보기 힘들어서 정리된 text 버전으로 연결했다.

[^3]: 아마도 글쓴이가 마지막에 말하는 a-POJO란 Anti-POJO가 아닐까 싶을 정도로 극단적으로 표현하지만, 비슷한 고민을 했었다. 재미있게도, 댓글조차 찬반이 섞여 있다.  

[^4]: 이후 따로 한번 다룰 생각이다.