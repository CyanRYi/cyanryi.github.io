---
title: AbstractRoutingDataSource
category: spring
tags: [spring, usage]
---
> 상황에 따라 동일한 스키마를 갖는 3개의 Database 중 하나에서 데이터를 불러와야 한다[^1].

이런 상황에 맞닥뜨린 경험이 있다. 서비스 내부에 분산된 3개의 DB를 지켜보며 운영상에 발생하는 문제를 모니터링해야하는 부분이었는데 실제 Production에서는 3개의 DB를 EntityManager 레벨에서 인스턴스화 시켜서 static한 map에 담아 쓰고 있었고 여기까지 가다 보니 메모리에 부담이 꽤 크게 오는 상태였다.
우연하게 이 모듈 - 정식 모듈은 아니고, 개발팀이 반쯤 토이프로젝트처럼 관리하는 모듈이었다. - 의 접근 권한을 얻게 되었는데, 가능하면 여기서라도 좀 부담을 줄이고 싶었다. 

머릿속에 떠올랐던 것은 복수의 Datasource에 대한 factory를 구현하는 것이었다. 직접 구현하려다 보니 EntityManager나 TransactionManager까지 걱정이 되던 와중에 게으름의 신이 내게 영감을 주셨다.

> Spring Source 애들이 이런 패턴 좋아하지 않나?

운좋게 예상은 적중했다. [AbstractRoutingDataSource](https://docs.spring.io/spring/docs/current/javadoc-api/org/springframework/jdbc/datasource/lookup/AbstractRoutingDataSource.html)는 Spring에서 이미 만들어 놓았다.[^2]

#### AbstractRoutingDataSource의 내부

AbstractRoutingDataSource는 IsolationLevelDataSourceRouter라는 기본적인 1개의 구현체만을 가지고 있어서, 이 경우가 아니라면 직접 구현체를 만들어야 한다.
하지만 다행히도 지금부터 설명하려는 내용이 별 의미가 없을 정도로 내부 소스코드는 간단하게 되어 있다. 우리가 봐야 하는 부분은 targetDataSources와 defaultTargetDataSource이다.

- targetDataSources의 Entry에는 식별을 위한 Key와 Value가 들어간다. Value에는 DataSource가 들어갈 수도 있고, String이 들어갈 수도 있다. 후자의 경우, DataSourceLookup을 통해 DataSource를 가져오는 과정을 거친다. 이 글에서는 DataSource를 직접 담아 사용한다.
- targetDataSources에서 원하는 DataSource를 가져올 수 없을 때 사용할 DataSource 하나를 설정한다. targetDataSources와 동일한 규칙으로 DataSource/String중 하나가 사용되어야 한다.

위 2개의 field(Lookup을 사용한다면 dataSourceLookup과 lenientFallback까지)를 사용하여 Bean 초기화 이후에는 resolvedDataSources, resolvedDefaultDataSource를 갖게 되며, 런타임에서는 이 필드를 기준으로 DataSource를 라우팅하게 된다.
resolvedDataSources에서 사용할 DataSource를 가져오는 기준은 추상메소드 determineCurrentLookupKey의 구현에 달려 있다.  

#### 예제 생성

① 당시의 상황과 비슷하게 3개의(A, O, T라는 이름을 사용했다.) Datasource를 만들고 각 DB에 Human 테이블 하나씩을 생성했다.
``` sql
create table human (id bigint not null, age integer, description varchar(255), name varchar(255), primary key (id))
```
```java
spring.jpa.show-sql=true
spring.jpa.hibernate.ddl-auto=validate

datasource.a.name=a
datasource.a.url=jdbc:h2:file:~/a;DB_CLOSE_ON_EXIT=FALSE
datasource.a.username=sa

datasource.o.name=o
datasource.o.url=jdbc:h2:file:~/o;DB_CLOSE_ON_EXIT=FALSE
datasource.o.username=sa

datasource.t.name=t
datasource.t.url=jdbc:h2:file:~/t;DB_CLOSE_ON_EXIT=FALSE
datasource.t.username=sa
```
![Data](/images/190331/Data.png)  
그리고 위와 같이 임의의 데이터를 넣어놓았다.(위에서부터 A, O, T 순)  
  
※ Property를 손으로 바인딩하기 귀찮아서 RoutingDataSource에 탑재할 TypedDataSourceWrapper를 생성했다.
```java
public enum DataSourceType {
    A, O, T;
}

public class TypedDataSourceWrapper {

    private DataSourceType name;
    private DataSourceBuilder dataSourceBuilder = DataSourceBuilder.create();

    public DataSourceType getName() { return name; }
    public void setName(DataSourceType name) { this.name = name; }
    
    public DataSource getDataSource() {
        return this.dataSourceBuilder.build();
    }
    
    // ConfigurationProperties를 통해 직접 Binding하기 위한 setter
    public void setUrl(String url) {
        this.dataSourceBuilder.url(url);
    }
    public void setDriverClassName(String driverClassName) {
        this.dataSourceBuilder.driverClassName(driverClassName);
    }
    public void setUsername(String username) {
        this.dataSourceBuilder.username(username);
    }
    public void setPassword(String password) {
        this.dataSourceBuilder.password(password);
    }
    public void setType(Class<? extends DataSource> type) {
        this.dataSourceBuilder.type(type);
    }
}
```

② AbstractRoutingDataSource의 구현체를 만들고, 이 예제에서 Lookup Key는 ThreadLocal을 이용해 ContextHolder 형태로 가져온다.
```java
public class RoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() { return DataSourceLookupKeyContextHolder.get(); }

    public static class Builder {

        private DataSourceType defaultDataSourceType;
        private Map<Object, Object> targetDataSources = new HashMap<>();

        public Builder addTargetDataSource(TypedDataSourceWrapper dataSourceWrapper) {
            targetDataSources.put(dataSourceWrapper.getName(), dataSourceWrapper.getDataSource());
            return this;
        }

        public Builder setDefaultDataSource(DataSourceType type) {
            this.defaultDataSourceType = type;
            return this;
        }

        public RoutingDataSource build() {
            RoutingDataSource routingDataSource = new RoutingDataSource();
            routingDataSource.setTargetDataSources(targetDataSources);
            routingDataSource.setDefaultTargetDataSource(targetDataSources.get(defaultDataSourceType));
            return routingDataSource;
        }
    }
}

public class DataSourceLookupKeyContextHolder {

    private static ThreadLocal<DataSourceType> dataSourceType = new ThreadLocal<>();

    public static void set(DataSourceType dataSourceType) {
        DataSourceLookupKeyContextHolder.dataSourceType.set(dataSourceType);
    }

    public static DataSourceType get() {
        return dataSourceType.get();
    }
}
```
③ DataSource Bean을 만들기 위한 Configuration을 아래와 같이 추가했다.
```java
@Configuration
public class DatasourceConfig {

    @Bean
    @ConfigurationProperties(prefix = "datasource.a")
    public TypedDataSourceWrapper aDataSource() {
        return new TypedDataSourceWrapper();
    }

    @Bean
    @ConfigurationProperties(prefix = "datasource.o")
    public TypedDataSourceWrapper oDataSource() {
        return new TypedDataSourceWrapper();
    }

    @Bean
    @ConfigurationProperties(prefix = "datasource.t")
    public TypedDataSourceWrapper tDataSource() {
        return new TypedDataSourceWrapper();
    }

    @Bean(name = "dataSource")
    @Autowired
    public DataSource routingDataSource(TypedDataSourceWrapper... dataSources) {

        RoutingDataSource.Builder builder = new RoutingDataSource.Builder();

        Arrays.stream(dataSources)
                .forEach(builder::addTargetDataSource);
        builder.setDefaultDataSource(DataSourceType.A);

        return builder.build();
    }
}
```
※ Controller 진입 이전에 Reqeust Header를 통해 DataSource Type을 판단하기 위해 HandlerInterceptorAdapter를 하나 추가하였다.(WebMvcConfigurer.addInterceptors를 이용)
```java
@Component
public class DataSourceControllerInterceptor extends HandlerInterceptorAdapter {

    private static final String DATA_SOURCE_TYPE_HEADER_NAME = "service-name";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {

        String dataSourceTypeName = request.getHeader(DATA_SOURCE_TYPE_HEADER_NAME);

        if (dataSourceTypeName.isEmpty()) {
            throw new IllegalArgumentException("Request header [" + DATA_SOURCE_TYPE_HEADER_NAME + "] is not exist");
        }

        DataSourceLookupKeyContextHolder.set(DataSourceType.valueOf(dataSourceTypeName));

        return super.preHandle(request, response, handler);
    }
}
```
이외의 Controller, Service, Repository와 Entity는 일반적인 Spring MVC와 동일하다. RestController에는 기본 path("/")에 대한 get, post를 추가하였다.

#### 테스트

```
GET  HTTP/1.1
Host: localhost:12001
service-name: A
Cache-Control: no-cache
Postman-Token: b88d0fd2-8c9f-4d94-b12e-8dfb7d57e83a

[{"id":1,"name":"Cyan Raphael Yi","age":30,"description":"A Database"}]
```
---
```
GET  HTTP/1.1
Host: localhost:12001
service-name: O
Cache-Control: no-cache
Postman-Token: f5bc26f2-b017-4e04-8328-0b9db4193fbf

[{"id":1,"name":"ANYC","age":30,"description":"O DB"},{"id":2,"name":"A","age":30,"description":"O DB"},{"id":3,"name":"ACYAN","age":11,"description":"O DB"}]
```
---
```
GET  HTTP/1.1
Host: localhost:12001
service-name: T
Cache-Control: no-cache
Postman-Token: 7f767527-fca6-4aec-b37b-7ac9aab74883

[{"id":1,"name":"Whitehead","age":12,"description":"T Database"},{"id":2,"name":"Wittgenstein","age":11,"description":"T_DB"}]
```

정상적으로 라우팅되면서 각 Database의 값을 불러오는 것을 볼 수 있다.
덤으로 O Database에 신규 추가를 한건하고 결과를 조회하면
```
POST  HTTP/1.1
Host: localhost:12001
service-name: O
Content-Type: application/json
Cache-Control: no-cache
Postman-Token: 4de84d91-5686-40c2-8b65-389cdbd597e5

{
	"id" : 4,
	"name" : "Cyan Raphael Yi",
	"description" : "O Database",
	"age" : 120
}
// response 없음

GET  HTTP/1.1
Host: localhost:12001
service-name: O
Cache-Control: no-cache
Postman-Token: d3908131-aaf0-441b-853c-fc32b2d3f136

[{"id":1,"name":"ANYC","age":30,"description":"O DB"},{"id":2,"name":"A","age":30,"description":"O DB"},{"id":3,"name":"ACYAN","age":11,"description":"O DB"},{"id":4,"name":"Cyan Raphael Yi","age":120,"description":"O Database"}]
``` 
#### 마치며

여기서는 간단한 예제로 소개하지만, ②번 과정을 어떻게 응용하느냐에 따라서 Master-Slave 구조의 Database를 Routing해서 R/W를 나눈다거나, Entity별로 Database를 나눈다거나 하는 다양한 방식의 응용예제가 존재한다.
이 글에 작성된 예제 소스코드는 [Github](https://github.com/CyanRYi/sollabs-routing-data-source)에 등록되어 있다.

---
[^1]: 완전히 동일하진 않았지만, 적어도 저 상황에서 사용하는 부분의 스키마는 동일했다.

[^2]: AbstractRouting...을 통해 자동 완성으로 찾아냈지만, 만약 찾지 못했다면 직접 spring-jdbc 모듈을 뒤져보는 다음 단계를 진행했을 거다. datasource나 sql등을 다루는 기능은 거의 이 모듈에 있다.