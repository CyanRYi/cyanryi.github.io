---
title: 메이븐 중앙 저장소에 배포하기-1
category: oss
tags: [oss]
hidden: true
---

작년 2월부터 메이븐 중앙 저장소에 프로젝트를 배포해봤는데 생각보다는 복잡하지 않았는데, 어디까지나 '생각보다는' 이지 혼자 github에 올리는 것보다는 신경쓸 부분이 많은 것이 사실이다. 

첫 프로젝트를 어느정도 마감한 시점에서 되짚어 보면 시행착오도 많았고 특히 버전 관리나 라이센스 부분 등은 대충 처리하기엔 조금 알아둬야 할 것도 많다. 

첫번째 글에서는 배포 단계 이전에 프로젝트 생성과 관리 단계를 maven 기반으로 설명한다.

### pom.xml 준비하기

프로젝트의 기본적인 작성을 끝내고 배포를 준비하고 있다면, 특히 프로젝트 설정 관련한 부분을 한번 점검해볼 필요가 있다.

#### `<groupId>`, `<artifactId>`

이 둘은 낯설지 않은 개념인데, 실제 의존성을 추가할때 많이 보게 되는 항목이다.   
[Maven의 공식 가이드](https://maven.apache.org/guides/mini/guide-naming-conventions.html)에 맞춰 우리가 만든 프로젝트도 어딘가에서 참조되도록 하기 위해서 이 값을 설정해야 하는데, 

`<artifactId>`는 그냥 (group id 내에서)고유한 이름이다.   
이희승 개발자님의 'netty'라거나 아파치의 'commons-lang3'에 해당하는 부분이다.   
규칙은 그냥 소문자와 하이픈 정도의 특수문자로 자유롭게 지으면 되지만,   
알아보기 쉬우면서 부르기도 쉬운 브랜드명을 짓는 것과 같은 부분이라 제일 어려운 부분이기도 하다.

`<groupId>`는 보유하고 있는 도메인이 있다면 그 역순(우리가 예제에서 주로 보는 com.example 형태)으로 설정한다.
만약 소유하고 있는 도메인이 없다면 github 저장소의 주소를 통해 com.github.`<github계정명>`과 같이 설정한다.

#### `<version>`

버전의 경우 조금 복잡할 수 있는데, 보통 [시맨틱 버저닝](https://semver.org/)이 많이 사용된다. 
생각보다 익숙치 않은 사람들이 꽤 있어서 간단한 설명을 먼저 하자면,

- 버전은 숫자가 아니라 .을 구분자로 갖는 numeric String이다. 1.9.0의 다음 마이너 업데이트 버전은 2.0.0이 아니라 1.10.0이다.
- 1.0.0과 그 이전 버전은 크게 다르다. 1.0.0부터를 공용(public) API로 본다.
- 따라서 0.x.x는 언제 무엇이 변해도 이상하지 않은 버전을 의미하며, 거꾸로 말하면 1.0.0부터는 이러한 변화에 보수적으로 접근해야 한다.
- 간혹 2.0.0보다 1.2.3의 배포일자가 더 최신이라 당황하는 사람들이 있는데.. 정상이다.

세부적인 구조를 설명하면
- 세번째 자리(1.2.**_3_**)는 Patch 버전이다. 간단한 오류 수정시 숫자를 증가시킨다.
- 두번째 자리(1.**_2_**.3)는 Minor 버전이다. 기존 API와 호환 가능한 기능 변경이나 public API의 deprecated가 발생하는 경우 숫자를 증가시킨다. 패치 수준의 변경을 포함할 수 있으며, Minor 버전이 올라가면 Patch 버전은 0으로 초기화한다. 
- 첫번째 자리(**_1_**.2.3)는 Major 버전이다. 하위 버전과 호환되지 않는 정도의 큰 업데이트(지원하는 Java 버전이 변경된다거나...)를 의미한다고 보면 된다. 마이너, 패치 수준의 변경을 포함할 수 있으며, Major 버전이 올라가면, Minor 버전과 Patch 버전은 0으로 초기화한다.
- 위 버전에 추가적으로 사전 릴리즈 버전을 -(하이픈)과 함께 추가할 수 있다. 주로 1.0.0-SNAPSHOT 과 같은 형태로 사용된다.

처음 프로젝트를 만들게 되면 0.1.0 정도로, 안정화되는 버전은 1.0.0이 기준이 된다.
즉, 아래와 같은 상태.
```xml
    <groupId>tech.sollabs</groupId>
    <artifactId>gjall</artifactId>
    <version>1.0.0</version>
```

#### `<licenses>`
오픈소스 라이센스는 다양하게 존재하지만, 주로 몇가지 라이센스 내에서 사용된다. 국내에도 정리된 [사이트](https://www.olis.or.kr/license/licenseClassiFication.do?mapcode=010001&page=1)가 존재한다.
깊이 들어가면 한도 끝도 없지만 크게 두 부류로 구분할 수 있다.

1. [자유소프트웨어 재단](https://www.fsf.org/)의 라이센스 - GPL 계열
    - [GPLv2](https://opensource.org/licenses/gpl-2.0.php), [GPLv3](https://opensource.org/licenses/GPL-3.0)가 주로 사용되며, 이 라이센스 내에는 **원본저작물 및 그에 기반한 저작물(Work based on the program)에 대한 소스코드를 제공하거나, 요청 시 제공하겠다는 약정서를 제공할 것** 이라는 강력한 copyleft 항목이 포함되어 있다.
    - 즉, 이 오픈소스 프로젝트를 수정하거나 단순 사용하면 그와 관련된 부분의 소스코드를 공개해야 한다는 것을 의미한다.[^1]
    - [LGPL](https://opensource.org/licenses/lgpl-3.0.html)의 경우는 조금 다른데, 직접 수정하지 않고 단순 사용하는 경우에 대해서는 소스코드 공개의 의무가 발생하지 않는다. [MariaDB의 Java Client](https://search.maven.org/artifact/org.mariadb.jdbc/mariadb-java-client/2.4.2/jar)같은 경우 이 라이센스를 사용한다.
    
2. 이보다 조금 더 자유로운 라이센스 - BSD 계열
    - 세부적인 부분은 조금씩 다르지만[^3], 소스코드 제공 의무가 없고 상업적 이용도 가능하고 2차 저작물의 라이센스도 자유롭게 붙일 수 있는 경우이다.
    - [Apache License 2.0](https://opensource.org/licenses/Apache-2.0), [MIT](https://opensource.org/licenses/MIT), [BSD 2-clause](https://opensource.org/licenses/BSD-2-Clause)[^4]를 자주 볼 수 있다. 

선택은 자유이지만 나는 현재 MIT를 쓰고 있고, BSD-2-clause으로의 변경을 고려하고 있다.
차이는 그냥 저작자 명과 라이센스 첨부 의무가 생기는 정도인데 어차피 자기만족으로 OSS 하는거니 그정도 욕심은 부려도 되지 않나 싶기도..

이 부분을 추가하면 이렇다.
```xml
    ...
    <licenses>
        <license>
            <name>MIT</name>
            <url>https://opensource.org/licenses/MIT</url>
            <distribution>repo</distribution>
        </license>
    </licenses>
    ...
```
물론 이 라이센스는 저장소 내의 License.md 에도 추가되어야 한다.(깃헙이 자동으로 만들어주니까.)

#### `<developers>`

오픈소스 프로젝트는 불특정 다수의 개발자의 참여가 기준이 되기 때문에, pom.xml 안에 개발자 목록을 정리하는 구획도 있다.
```xml
    <developers>
        <developer>
            <name>Cyan Raphael Yi</name>
            <email>cyan.r.yi@gmail.com</email>
            <organization>sollabs</organization>
            <organizationUrl>www.sollabs.tech</organizationUrl>
            <timezone>GMT+0900</timezone>
        </developer>
    </developers>
```
모든 항목을 다 채울 필요는 없긴 할텐데, 이렇게 정리한 항목은 [mvnrepository](https://mvnrepository.com/)에서는 별도로 아래와 같이 확인되기도 한다.   
![개발자 목록](/images/190716/developers.PNG)

아직까지 받아본 적은 없지만, 만약 누군가의 PR이 들어온다면 merge하기 전에 이 부분도 업데이트 해줄 필요가 있다.

#### 그 외 항목들

1. `<name>` : 프로젝트명을 기입한다.
2. `<description>` : 프로젝트에 대한 상세한 설명을 추가한다.
3. `<url>` : 프로젝트 페이지가 있다면 그 url을 추가해야 한다. mvnrepository에서도 볼 수 있다. 
4. `<scm>` : 소스 저장소의 정보를 추가한다. 깃헙을 쓴다면 항목간에 큰 차이는 없고 보통 비슷비슷한데,  
5. `<packaging>` : jar가 아닌 형태(war, pom ....)라면 입력해 줘야 한다. jar가 기본값이다.

```xml
    <name>gjall</name>
    <description>Spring Extension 2nd Series. API Logging</description>
    <url>https://gjall.sollabs.tech</url>
    <scm>
        <connection>scm:git:https://github.com/CyanRYi/gjall.git</connection>
        <developerConnection>scm:git:https://github.com/CyanRYi/gjall.git</developerConnection>
        <url>https://github.com/CyanRYi/gjall.git</url>
        <tag>${project.version}</tag>
    </scm>
``` 

지금까지 나온부분을 쭉 정리하면 이렇게 된다.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>tech.sollabs</groupId>
    <artifactId>gjall</artifactId>
    <version>1.0.0-RELEASE</version>
    <packaging>jar</packaging>
    <name>gjall</name>
    <description>Spring Extension 2nd Series. API Logging</description>
    <url>https://gjall.sollabs.tech</url>

    <licenses>
        <license>
            <name>MIT</name>
            <url>https://opensource.org/licenses/MIT</url>
            <distribution>repo</distribution>
        </license>
    </licenses>
    
    <developers>
        <developer>
            <name>Cyan Raphael Yi</name>
            <email>cyan.r.yi@gmail.com</email>
            <organization>sollabs</organization>
            <organizationUrl>www.sollabs.tech</organizationUrl>
            <timezone>GMT+0900</timezone>
        </developer>
    </developers>
    
    <scm>
        <connection>scm:git:https://github.com/CyanRYi/gjall.git</connection>
        <developerConnection>scm:git:https://github.com/CyanRYi/gjall.git</developerConnection>
        <url>https://github.com/CyanRYi/gjall.git</url>
        <tag>${project.version}</tag>
    </scm>
    .......
```

#### 플러그인 추가하기

플러그인은 3개 정도를 추가해서 사용하고 있다.

1. maven-source-plugin
    - 소스코드 첨부를 위한 플러그인이다. 오픈소스라는 특성상, IDE에서 바로 볼 수 있게 해주는 부분이니 사실상 필수.

2. maven-javadoc-plugin
    - javadoc을 추가해준다. 마찬가지로 IDE에서 javadoc을 바로 확인할 수 있도록 하기 위해서는 필수적이다.
    
3. maven-gpg-plugin
    - 이 부분이 조금 까다로울 수 있는데, 위변조를 막기 위해 전자서명을 해야하는 부분이다. 
    - Linux 사용자는 os마다 다를 수 있지만 내장된 gpg를 사용해서 생성하고, http://pgp.mit.edu/에 직접 업로드할 수 있다. 
    - Mac의 경우 : [이동욱님의 블로그](https://jojoldu.tistory.com/161)
    - Windows의 경우 : [전광섭님의 블로그](https://www.lesstif.com/pages/viewpage.action?pageId=30277671#id-%EB%A9%94%EC%9D%B4%EB%B8%90%EC%A4%91%EC%95%99%EC%A0%80%EC%9E%A5%EC%86%8C%EC%97%90%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8%EC%97%85%EB%A1%9C%EB%94%A9-maven-uploadingartifacttocentralrepository-GPG%ED%82%A4%EC%83%9D%EC%84%B1)
    
```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-source-plugin</artifactId>
            <version>3.0.1</version>
            <executions>
                <execution>
                    <id>attach-sources</id>
                    <goals>
                        <goal>jar</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-javadoc-plugin</artifactId>
            <executions>
                <execution>
                    <id>attach-javadocs</id>
                    <goals>
                        <goal>jar</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-gpg-plugin</artifactId>
            <version>1.5</version>
            <executions>
                <execution>
                    <id>sign-artifacts</id>
                    <phase>verify</phase>
                    <goals>
                        <goal>sign</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

### 마지막으로 점검할 것

- javadoc을 잘 작성하였는가? : 사용자를 고려하는 것도 있지만, javadoc 플러그인을 추가했기 때문에 배포가 안될 수 있다.
- Test Case는 중요하다 : 내가 제일 크게 고생한 부분인데, 우리는 전업 오픈소스 개발자가 아니고 이 프로젝트를 몇 개월만에 다시 열어볼 수도 있다. 그때 이 프로젝트가 어디까지 돌아가고 있는지, 그리고 나 자신도 (시간에 따라 잊어버린) side effect 발생을 막기 위해 굉장히 중요한 역할을 해준다.
- 언어도 한번은 고민해 보자 : 필수적인 사항은 아니지만, 간단하게 쓰더라도 영어로 작성하려 한다. 누구라도 접근할 수 있는 프로젝트이기 때문에, 많은 사람이 읽을 수 있는 언어로 쓰는게 좋지 않나 하는 생각이 있다. 
 
 
---
[^1]: 만들때도, 사용할때도 주의를 크게 기울일 필요가 있는데, 회사에서 잘못 썼다가 크게 데이는 경우가 심심찮게 보인다.[이 뉴스](http://www.inews24.com/view/1023517)도 불과 2년전 얘기다. GPL을 쓰다가 다른 라이센스로 변경할 수도 있지만, 누군가가 기여한 부분이 있다면 그 부분 관련해서 또 복잡해진다.

[^2]: 쓰는건 상관없지만, 해당 라이센스를 '첨부' 해야 한다던가 하는 가벼운 제약 정도가 붙기도 한다.

[^3]: 여러 종류가 있고 심지어 별명들도 많아서 복잡하지만, BSD 2-clause, [3-clause](https://opensource.org/licenses/BSD-3-Clause) 형태로 구분되는데, 이름대로 조항 갯수가 2개냐 3개냐의 차이. 