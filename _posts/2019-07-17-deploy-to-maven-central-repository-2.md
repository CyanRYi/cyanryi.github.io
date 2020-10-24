---
title: 메이븐 중앙 저장소에 배포하기-2
category: oss
tags: [oss]
---

[이전 글](/deploy-to-maven-central-repository-1)을 통해 프로젝트의 준비가 완료되었다면, 정식으로 배포하기 위한 과정을 진행해야 한다.

배포하기 위한 저장소는 몇군데 선택지가 있는데, 여기서는 내가 이용하고 있는 Open Source Software Repository Hosting(이하 OSSRH)를 기준으로 설명한다.[^1]

#### 계정 생성 & 저장소 신청하기

배포를 위해서는 [OSSRH](https://oss.sonatype.org/)에 계정을 등록해야 한다.
[이 링크](https://issues.sonatype.org/secure/Signup!default.jspa)를 통해 가입할 수 있다.

가입 완료 메일이 도착하면, Jira 이슈를 통해 [저장소 생성을 신청](https://issues.sonatype.org/secure/CreateIssue!default.jspa)해야 한다.[(참조)](https://issues.sonatype.org/browse/OSSRH-38065)   
저장소를 신청하기 위해서는 Group Id를 기입해야 하며, 도메인을 사용했을 경우에는 해당 도메인의 소유권을 확인한다.

내 경우에는 github page를 통해서 프로젝트 페이지를 등록해 놓아 금방 통과할 수 있었다.    
저장소 신청은 Group Id 단위이며, 이미 한번 저장소 생성을 했으면 이후에는 추가적인 신청이 필요 없다고 한다.[(참조)](https://issues.sonatype.org/browse/OSSRH-50132)

빠르면 하루, 주말이나 연휴가 끼는 경우라도 며칠내로 해결된다.

#### settings.xml 수정하기
사설 nexus 관련 설정을 해봤다면 알고 있겠지만, nexus에 배포하기 위해 필요한 계정 정보를 프로젝트의 pom.xml에 담을수는 없다... 라기보단 당연히 담아서는 안된다.   
별도의 settings.xml을 통해 외부 정보를 분리해서 관리하며 프로젝트별 설정에서 이를 참조하는 구조로 되어 있다.

보통 기본 경로는 ${USER_HOME}/.m2/settings.xml로 되어 있는데, 여기에 추가적인 정보를 기입해야 한다.

1. 서버는 복수를 등록할 수 있다.
    - 서버의 ID는 고유하게 식별할 수 있으면 된다. 여기서는 배포 서버인 OSSRH를 설정하고 있다.
    - `<username>`과 `<password>`는 최초에 [OSSRH](https://oss.sonatype.org/)에 가입했던 ID와 비밀번호를 기입한다.
    
```xml
<servers>
    <server>
        <id>ossrh</id>
        <username>계정명</username>
        <password>비밀번호</password>
    </server>
</servers>
```

2. 상황에 맞는 프로필을 선언한다.
    - `<id>`는 프로필의 ID로 *위에 사용한 server의 ID와는 무관*하게 사용한다. 가능한 헷갈리지 않게 다르게 설정하는 것을 추천.
    - `<properties>`에는 각 프로필마다 고유하게 사용할 항목들을 선언하고, 이를 pom.xml에서 참조할 수 있다.  
    - `<properties>`안에 `<gpg.passphrase>`라는 이름으로 이전 글에서 생성한 key를 기록해 놓으면 편리하다.
    
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

3. `<activeProfiles>`를 통해 활성화할 프로필을 미리 선언할 수도 있다.

```xml
<activeProfiles>
    <activeProfile>oss-deployment</activeProfile>
</activeProfiles>
```

#### pom.xml에 배포 정보 추가하기   
꽤 다양한 방법이 있다고 하는데, 가장 간단한 방법은 아래의 경우였다.

1. `<distributionManagement>` 추가   
    - `<snapshotRepository>`만을 추가한다.
    - `<id>`는 settings.xml에 추가했던 server의 id와 동일해야 한다.
    - `<url>`은 아래 정보와 동일하다.(저장소를 생성해줄때 알려준다.)
    
```xml
<distributionManagement>
    <snapshotRepository>
        <id>ossrh</id>
        <url>https://oss.sonatype.org/content/repositories/snapshots</url>
    </snapshotRepository>
</distributionManagement>
```

2. 이전 단계에서 추가했던 3개의 plugin 외에 하나를 더 추가한다.
    - `<configuration>` 내의 `<serverId>`는 위와 마찬가지로 settings.xml에 추가했던 server의 id를 입력해야 한다.
    - settings.xml에 등록했던 gpg.passphrase는 여기서 사용된다.
    
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
 
### 배포하기
버전 항목 뒤에 -SNAPSHOT을 추가하면 Snapshot이 배포되며, 그렇지 않은 경우는 Release 배포가 된다.   
Snapshot은 여러번 재배포가 가능하지만 Release는 재배포를 위해서는 버전을 변경해야만 하니 Release에는 주의해야 한다.

#### Snapshot 배포하기
maven으로 deploy phase를 실행하면 된다. 끝. 여기서부터는 간단한데, javadoc이나 기타 과정에서 오류가 발생할 수 있으나 에러 메시지를 보면 간단하게 해결할 수 있다.
deploy 진행 과정에서 Gpg key를 입력하는 팝업이 뜰텐데, gpg.passphrase를 입력하면 된다.

배포가 성공적으로 완료되었다면, https://oss.sonatype.org/content/repositories/snapshots/tech/sollabs/ 링크를 통해 확인할 수 있다.
링크의 뒷부분은 본인의 groupId로 수정해야 한다.

#### Release 배포하기
Snapshot 배포시와 동일하다. version에서 -SNAPSHOT을 제거하고 deploy phase를 진행하면 된다.
Snapshot과는 달리 별도의 플러그인을 사용하고 있기 때문에 Gpg Key를 입력하는 팝업도 뜨지 않는다.
다만 시간은 조금 더 오래 걸리는데, 본래 Staging Repository로 배포되고, Close 과정을 거쳐서 배포되기 때문이다.
이 과정이 종료되었다면, https://repo1.maven.org/maven2/tech/sollabs/ 링크를 통해 배포를 확인할 수 있다.

마찬가지로 https://search.maven.org/를 통해서 해당 프로젝트를 검색할 수 있는데 상황에 따라 몇분 정도의 시간은 더 필요하기도 하다.
(https://mvnrepository.com/ 의 경우에는 넉넉잡아 다음날 확인하는 것이 더 편하다.)

---
여기까지가 전체적인 배포 과정이다. 모두 성공했다면 이제는 내가, 혹은 다른 누군가가 해당 프로젝트를 라이센스에 따라 자유롭게 접근 가능하다.

OSSRH의 [nexus](https://oss.sonatype.org)에 접속해서 가입한 계정으로 로그인하면 좌측 메뉴에 [Central Statistics](https://oss.sonatype.org/#central-stat)가 존재하고, 클릭해보면 최근 1년간에 한해 프로젝트와 버전별 총 다운로드 수/고유 IP 기준의 다운로드 수 통계를 볼 수 있다.
하단의 상세 항목은 월별 통계는 확인이 가능하지만, Last ~~ Months, Year는 정상 작동하지 않는 듯 하다.   
  
![통계](/images/190717/statistics.PNG)


---
[^1]: [bintray](https://bintray.com) 같은 곳도 쓰는 듯 하다. [이동욱님의 블로그](https://jojoldu.tistory.com/161)에서는 그쪽을 다룬다.