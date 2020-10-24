---
title: ContentCachingRequestWrapper
category: spring
tags: [spring, usage]
---

![조환님의 피드백](/images/190624/feedback.PNG)

언제나 facebook에 '알수도 있는 친구'로 자주 보이시는 분이 popit에 피드백을 남겨주신 것을 늦게 확인했는데, 

[예전 글](/Request-Logging-Filter)에 대한 접근 경로를 봤을 때도 마찬가지로, ContentCachingRequestWrapper나 ContentCachingResponseWrapper를 키워드로 접근하는 부분이 꽤 많이 보여서 이에 대한 추가 글을 작성할 필요성이 있을 것 같다.

(다만 popit에 추가 기고를 할지는 음..)

API Logging 과정에서 body까지도 확인하기 위해서는 request body를 읽을 수 있어야 하지만 기본적으로 사용되는 HttpServletRequest 같은 경우 InputStream은 한번만 읽어올 수 있으며, 두번째 읽기 시도를 하는 순간 아름다운 IOException을 발생시킨다.

그래서 추가적인 Wrapper를 구현하는 과정을 필요로 했다. 주로 [이런 글](https://meetup.toast.com/posts/44)을 참고하면서.

여기서부터가 RequestLoggingFilter에 대한 이전 글의 시작점이 된다.

이 글의 제목은 ContentCachingRequestWrapper이지만 ResponseWrapper도 함께 다루게 될텐데 이 두가지 클래스에 대해 간략한 소개와 몇가지 주의사항만을 설명한다.


#### ContentCachingRequestWrapper

이 클래스는 4.1.3에 정식으로 처음 등장했다.

HttpServletRequestWrapper의 구현체이며, Spring 내부에서 사용되는 곳은 AbstractRequestLoggingFilter가 유일하다.


#### ContentCachingResponseWrapper

동일하게 4.1.3에 정식으로 처음 등장했지만, 4.2에서 편의성을 위한 method가 추가되었다.

HttpServletResponseWrapper의 구현체이며, Spring 내부에서 사용되는 곳은 ShallowEtagHeaderFilter가 유일하다.

---
위 두개의 클래스 모두 Filter 내부에서 body에 접근하기 위해 사용되며

기존 개발자가 작업하던 부분을 Spring Project에서 직접 관리하기 때문에 안정성 측면에서는 훨씬 나아졌다고 말 할 수 있다.

[gjall](https://gjall.sollabs.tech)에서는 RequestWrapper 뿐 아니라 ResponseWrapper도 사용하는데, 지난 1년간 위 클래스들로 인한 문제점은 아직 발견/보고되지 않았다.



### 사용시의 주의점

1. 위 두 클래스에만 해당되는 내용은 아니지만, Request/Response의 구현 패턴 상 [WebUtils](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/util/WebUtils.html) 클래스의 getNativeRequest(Class)[^1] 를 사용하여 변환해야 한다.

2. ContentCachingResponseWrapper를 사용할 경우, Body를 돌려주기 위해서는 copyBodyToResponse method를 호출해야 한다. 그렇지 않을 경우 responseBody가 돌아가지 않는 난감한 상황에 빠질 수 있다.


#### 마치며

Spring이 제공하는 바퀴를 만들지 않아도 되는 기능 중 하나이며 Servlet를 사용한다면 언젠가 한번쯤은 사용할 기회가 오는 기능이다.

다만 이 기능을 사용하더라도 ServletRequest, ServletResponse가 어떻게 구현되어 있는지는 대략적으로라도 알아두는 것이 도움이 된다. 

AS성의 글이기 때문에 별도의 예제코드는 없으며, [gjall Project의 소스코드](https://github.com/CyanRYi/gjall/blob/master/src/main/java/tech/sollabs/gjall/GjallRequestLoggingFilter.java)로 대체한다.

※ 변변찮은 글에 피드백을 주신 조환님께 감사드립니다.

---
[^1]: Response의 경우 당연히 getNativeResponse(Class). 재귀호출을 통해 Decorator 내부를 탐색하며 type과 일치하는 녀석을 찾아준다. 없으면 null을 리턴한다.