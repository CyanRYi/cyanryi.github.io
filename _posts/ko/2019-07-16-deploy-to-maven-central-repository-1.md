---
title: 메이븐 중앙 저장소에 배포하기-1
category: oss
tags: [oss,gjall]
---

작년 2월부터 메이븐 중앙 저장소에 프로젝트를 배포해봤는데 생각보다는 복잡하지 않고, 그래도 시행착오를 몇번 겪을 정도로 조금 까다롭기도 해서 이런 내용을 정리한다.

배포하기 위한 저장소는 몇군데 선택지가 있다고는 하는데, 여기서는 내가 이용하고 있는 [OSSRH](https://oss.sonatype.org/)를 기준으로 설명한다.[^1]

추가로 gradle을 잘 못다루기 때문에 maven 기반으로 설명한다.

## 준비하기

### Group Id & Artifact Id

가장 먼저 준비해야 하는 것은 group id와 artifact Id이다.
[Maven의 공식 가이드](https://maven.apache.org/guides/mini/guide-naming-conventions.html)를 따라 보유하고 있는 도메인이 있다면 그 역순(우리가 예제에서 주로 보는 com.example 형태)으로 설정한다.

만약 소유하고 있는 도메인이 없다면 github 저장소의 주소를 통해 com.github.<github계정명>과 같이 설정한다.

artifact id는 프로젝트를 잘 설명할 수 있다면 뭐든 상관은 없다.

### 계정 만들기

배포를 위해서는 [OSSRH](https://oss.sonatype.org/)에 계정을 등록해야 한다.

[이 링크](https://issues.sonatype.org/secure/Signup!default.jspa)를 통해 가입할 수 있다.

### 저장소 신청하기

가입 완료 메일이 도착하면, Jira 이슈를 통해 [저장소 생성을 신청](https://issues.sonatype.org/secure/CreateIssue!default.jspa)해야 한다.

저장소를 신청하기 위해서는 Group Id를 기입해야 하며, 도메인을 사용했을 경우에는 해당 도메인의 소유권을 확인한다.

내 경우에는 github page를 통해서 프로젝트 페이지를 등록해 놓아 오래 걸리지 않아 통과할 수 있었다. [참조](https://issues.sonatype.org/browse/OSSRH-38065)

저장소 신청은 Group Id 단위이며, 이미 한번 저장소 생성을 했으면 이후에는 추가적인 신청이 필요 없다고 한다.[참조](https://issues.sonatype.org/browse/OSSRH-50132)

### Version

버전의 경우 조금 복잡할 수 있는데, 먼저 기본적으로는 숫자와 .을 조합한 형태가 주로 사용된다.
기본적으로는 [시맨틱 버저닝](https://semver.org/)이 많이 사용된다.
간단하게만 설명하면 1.0.10의 세자리 수를 주로 사용하며, 자세한 설명 이전의 간단한 설명을 먼저 하자면,

- 버전은 숫자가 아니라 .을 구분자로 갖는 numeric String이다. 1.9.0의 다음 마이너 업데이트 버전은 2.0.0이 아니라 1.10.0이다.
- 1.0.0과 그 이전 버전은 크게 다르다. 1.0.0부터를 공용(public) API로 본다.
- 따라서 0.x.x는 언제 무엇이 변해도 이상하지 않은 버전을 의미하며, 거꾸로 말하면 1.0.0부터는 이러한 변화에 보수적으로 접근해야 한다.

각 숫자의 위치에 대해 설명하면

- 세번째 자리(1.2.**_3_**)는 Patch 버전이다. 간단한 오류 수정시 숫자를 증가시킨다.
- 두번째 자리(1.**_2_**.3)는 Minor 버전이다. 기존 API와 호환 가능한 기능 변경이나 public API의 deprecated가 발생하는 경우 숫자를 증가시킨다. 패치 수준의 변경을 포함할 수 있으며, Minor 버전이 올라가면 Patch 버전은 0으로 초기화한다. 
- 첫번째 자리(**_1_**.2.3)는 Major 버전이다. 하위 버전과 호환되지 않는 정도의 큰 업데이트(지원하는 Java 버전이 변경된다거나...)를 의미한다고 보면 된다. 마이너, 패치 수준의 변경을 포함할 수 있으며, Major 버전이 올라가면, Minor 버전과 Patch 버전은 0으로 초기화한다.
- 위 버전에 추가적으로 사전 릴리즈 버전을 -(하이픈)과 함께 추가할 수 있습니다. 주로 1.0.0-SNAPSHOT 과 같은 형태로 사용된다.

처음 프로젝트를 만들게 되면 0.1.0 정도로, 안정화되는 버전은 1.0.0이 기준이 된다.
즉, 아래와 같은 상태.
```xml
    ...
    <groupId>tech.sollabs</groupId>
    <artifactId>gjall</artifactId>
    <version>1.0.0</version>
    ...
```

### 개발자 목록

오픈소스 프로젝트는 불특정 다수의 개발자의 참여가 기준이 되기 때문에, pom.xml 안에 개발자 목록을 정리하는 구획도 있다.
```xml
    ...
    <developers>
        <developer>
            <id>cyan.r.yi</id>
            <url>www.sollabs.tech</url>
            <name>Cyan Raphael Yi</name>
            <email>cyan.r.yi@gmail.com</email>
            <organization>sollabs</organization>
            <organizationUrl>www.sollabs.tech</organizationUrl>
            <timezone>GMT+0900</timezone>
        </developer>
    </developers>
    ...
```
모든 항목을 다 채울 필요는 없긴 할텐데, 이렇게 정리한 항목은 [mvnrepository](https://mvnrepository.com/)에서는 별도로 아래와 같이 확인되기도 한다.   
![개발자 목록](/images/190716/developers.PNG)

아직까지 받아본 적은 없지만, 만약 누군가의 PR이 들어온다면 merge하기 전에 이 부분도 업데이트 해줄 필요가 있다.


### License
오픈소스 라이센스는 다양하게 존재하지만, 주로 몇가지 라이센스 내에서 사용된다. 국내에도 정리된 [사이트](https://www.olis.or.kr/license/licenseClassiFication.do?mapcode=010001&page=1)가 존재한다.

여기서 이 부분까지 깊게 다루기엔 무리가 있을 것 같아 간단하게 정리하면

1. [자유소프트웨어 재단](https://www.fsf.org/)의 라이센스 중 GPL 계열
    - 최근에는 GPLv2, GPLv3가 주로 사용되며, 이 라이센스 내에는 **원본저작물 및 그에 기반한 저작물(Work based on the program)에 대한 소스코드를 제공하거나, 요청 시 제공하겠다는 약정서를 제공할 것** 이라는 강력한 copyleft 항목이 포함되어 있다.
    - 즉, 이 오픈소스 프로젝트를 수정하거나 단순 사용하면 그와 관련된 부분의 소스코드를 공개해야 한다는 것을 의미한다.[^2]
    - LGPL의 경우는 조금 다른데, 직접 수정하지 않고 단순 사용하는 경우에 대해서는 소스코드 공개의 의무가 발생하지 않는다. [MariaDB의 Java Client](https://search.maven.org/artifact/org.mariadb.jdbc/mariadb-java-client/2.4.2/jar)같은 경우 이 라이센스를 사용한다.
    
2. 이보다 조금 더 자유로운 라이센스 - BSD 계열
    - 세부적인 부분은 조금씩 다르지만[^3], 소스코드 제공 의무가 없고 상업적 이용도 가능하고 2차 저작물의 라이센스도 자유롭게 붙일 수 있는 경우이다.
    - APL2.0, MIT, BSD 2-clause[^4]를 자주 볼 수 있다. 

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

### 그 외 항목들

1. name : 프로젝트명을 기입한다.
2. description : 프로젝트에 대한 상세한 설명을 추가한다.
3. url : 프로젝트 페이지가 있다면 그 url을 추가해야 한다. mvnrepository에서도 볼 수 있다. 
4. scm : 소스 저장소의 url과 태그를 추가한다.

```xml
    <name>gjall</name>
    <description>Spring Extension 2nd Series. API Logging</description>
    <url>https://gjall.sollabs.tech</url>
    <scm>
        <url>https://github.com/CyanRYi/gjall.git</url>
        <tag>github</tag>
    </scm>
``` 

### 플러그인 추가하기

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
    - **절대, passphrase를 분실하면 안된다.**
    
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

### settings.xml 수정하기
사설 nexus 관련 설정을 해봤다면 알고 있겠지만, nexus에 deploy하기 위해 필요한 계정 정보를 프로젝트의 pom.xml에 담을수는 없다.   
별도의 settings.xml을 통해 외부 정보를 분리해서 관리하며 프로젝트별 설정에서 이를 참조하는 구조로 되어 있다.

보통 기본 경로는 ${USER_HOME}\.m2\settings.xml로 되어 있는데, 여기에 추가적인 정보를 기입해야 한다.

1. 서버는 복수를 등록할 수 있다.
    - 서버의 ID는 고유하게 식별할 수 있으면 된다. 여기서는 배포 서버인 OSSRH를 설정하고 있다.
    - username과 password는 최초에 [OSSRH](https://oss.sonatype.org/)에 가입했던 ID와 비밀번호를 기입한다.
```xml
<servers>
    <server>
        <id>ossrh</id>
        <username>계정명</username>
        <password>비밀번호</password>
    </server>
</servers>
```

1. 상황에 맞는 프로필을 선언해놓을 수 있다.
    - <id>는 프로필의 ID로 *위에 사용한 server의 ID와는 무관*하게 사용한다. 가능한 헷갈리지 않게 다르게 설정하는 것을 추천.
    - <properties>에는 각 프로필마다 고유하게 사용할 항목들을 선언하고, 이를 pom.xml에서 참조할 수 있다.  
```xml
<profiles>
    <profile>
        <id>oss-deployment</id>
        <properties>
            <gpg.passphrase>GPG passphrase를 여기에 기록한다.</gpg.passphrase>
        </properties>
    </profile>
</profiles>
```

1. <activeProfiles>를 통해 활성화할 profile을 미리 선언할 수도 있다.
```xml
<activeProfiles>
    <activeProfile>oss-deployment</activeProfile>
</activeProfiles>
```

### pom.xml에 배포 정보 추가하기   
꽤 다양한 방법이 있다고 하는데, 가장 간단한 방법은 아래의 경우였다.

1. distributionManagement 추가   
    - snapshotRepository만을 추가한다.
    - <id>는 settings.xml에 추가했던 server의 id와 동일해야 한다.
    - <url>은 아래 정보와 동일하다.(저장소를 생성해줄때 알려준다.)
```xml
<distributionManagement>
    <snapshotRepository>
        <id>ossrh</id>
        <url>https://oss.sonatype.org/content/repositories/snapshots</url>
    </snapshotRepository>
</distributionManagement>
```

2. 이전 단계에서 추가했던 3개의 plugin 외에 하나를 더 추가한다.
    - <configuration> 내의 <serverId>는 위와 마찬가지로 settings.xml에 추가했던 server의 id를 입력해야 한다.
    
```xml
<plugin>
    <groupId>org.sonatype.plugins</groupId>
    <artifactId>nexus-staging-maven-plugin</artifactId>
    <version>1.6.7</version>
    <extensions>true</extensions>
    <configuration>
        <serverId>ossrh</serverId>
        <nexusUrl>https://oss.sonatype.org/</nexusUrl>
        <autoReleaseAfterClose>true</autoReleaseAfterClose>
    </configuration>
</plugin>
```
 
---
[^1]: 다른 곳은 [bintray](https://bintray.com) 같은 곳을 주로 쓰는 듯 하다. [이동욱님의 블로그](https://jojoldu.tistory.com/161)에서는 그쪽을 다룬다.

[^2]: 만들때도, 사용할때도 주의를 크게 기울일 필요가 있는데, 회사에서 잘못 썼다가 크게 데이는 경우가 심심찮게 보인다.[이 뉴스](http://www.inews24.com/view/1023517)도 불과 2년전 얘기다.       
GPL 계열을 좋아하지 않는다는 점을 먼저 밝히면서 얘기하자면, 만드는 사람이 지켜야 할 것도 많고 사용자도 꺼리게 하는 라이센스라서 그리 추천하지는 않는다. 관상용 프로젝트를 만든다면 모를까..

[^3]: 쓰는건 상관없지만, 해당 라이센스를 '첨부' 해야 한다던가 하는 가벼운 제약 정도가 붙기도 한다.

[^4]: 조금 특이하게 BSD 2-clause, 3-clause 형태로 구분되는데, 2-caluse는 흔히 FreeBSD로도 불린다.(이 계열이 별명이 많더라..) 이름대로 조항 갯수가 2개냐 3개냐의 차이. 