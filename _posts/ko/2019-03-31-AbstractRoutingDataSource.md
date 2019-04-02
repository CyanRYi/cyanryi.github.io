---
title: AbstractRoutingDataSource
category: spring
tags: [spring, usage]
hidden: true
---
> 3개의 Database를 가지고 있으며, 해당 Database들은 동일한 스키마를 가지고 있었다[^1]. 그리고 상황에 따라 3개의 Database 중 한곳을 사용해야 한다.

흔치 않은 상황이지만, 이런 경험을 한 적이 있었다.
서비스에서는 3개의 Database를 각각 인스턴스화 시켜서 static한 map에 담아 쓰고 있는 상태였는데, 이 과정에서 Hibernate에 필요한 metadata까지 각각 따로 만들어 map에 같이 담다 보니 종종 메모리가 터지는 문제까지 발생했다.

이 상황에서 나는 내부 모니터링을 위한 관리 툴에 대한 접근 권한을 얻게 되었다.

필요했던 것은 간단했다. 복수의 Datasource에 대한 factory였다. 직접 구현하기 위해 고민을 하다가 문득 떠올랐다.

> Spring Source 애들이 이런거 좋아하지 않았나?

다행히도 예상 가능한 이름으로 원하는 것을 금방 발견할 수 있었다. [AbstractRoutingDataSource](https://docs.spring.io/spring/docs/current/javadoc-api/org/springframework/jdbc/datasource/lookup/AbstractRoutingDataSource.html)는 Spring에서 이미 만들어 놓았다.[^2]

### AbstractRoutingDataSource의 내부

AbstractRoutingDataSource는 IsolationLevelDataSourceRouter라는 기본적인 1개의 구현체만을 가지고 있지만 다행히 구조가 간단해서 필요에 따라 구현하기는 어렵지 않다.
우리가 중요하게 봐야 하는 부분은 Map형태의 targetDataSources와 defaultTargetDataSource이다.

- targetDataSources의 Entry에는 식별을 위한 Key와 Value가 들어간다. Value에는 DataSource가 직접 들어갈 수도 있고, String이 들어갈 수도 있다. 후자의 경우, DataSourceLookup을 통해 DataSource를 가져오는 과정을 거친다. 이 글에서는 전자의 방식을 사용하여 예제를 작성한다.
- 복수의 DataSource중 기본 DataSource로 사용할 하나를 설정한다. targetDataSources와 동일한 규칙으로 DataSource/String중 하나가 사용되어야 한다.

위 2개의 field(Lookup을 사용한다면 dataSourceLookup과 lenientFallback까지)를 사용하여 Bean 초기화 이후에는 resolvedDataSources, resolvedDefaultDataSource를 갖게 되며, 런타임에서는 이 필드를 기준으로 DataSource를 라우팅하게 된다.
resolvedDataSources에서 사용할 DataSource를 가져오는 기준은 추상메소드 determineCurrentLookupKey의 구현에 달려 있다.  

### 예제 생성

3개의 Datasource를 만들어 보자. 각 이름은 줄여서 T, O, A로 명명한다. Table은 각 DB에 Human 테이블 하나씩을 생성한다.
``` sql
create table human (id bigint not null, age integer, description varchar(255), name varchar(255), primary key (id))
```
```java application.properties
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
```java
public enum DataSourceType {
    A, O, T;
}
```
![Data](/images/190331/Data.png)  
임의의 데이터를 넣어놓았다.(위에서부터 A, O, T 순)  
  
추가적으로 Property를 Binding해서 RoutingDataSource에 탑재할 DataSource를 생성했다.
```java
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

AbstractRoutingDataSource의 구현체를 만들고, Lookup Key를 가져오는 부분은 TreadLocal을 이용한 ContextHolder 형태로 간단하게 구현하였다.
```java
public class RoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        return DataSourceLookupKeyContextHolder.get();
    }

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
Controller 진입 이전에 Reqeust Header를 통해 DataSource Type을 판단하기 위해 HandlerInterceptorAdapter를 하나 추가하였다.(WebMvcConfigurer.addInterceptors를 이용)
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

### 테스트

```http request
GET  HTTP/1.1
Host: localhost:12001
service-name: A
Cache-Control: no-cache
Postman-Token: b88d0fd2-8c9f-4d94-b12e-8dfb7d57e83a

[{"id":1,"name":"Cyan Raphael Yi","age":30,"description":"A Database"}]
```
---
```http request
GET  HTTP/1.1
Host: localhost:12001
service-name: O
Cache-Control: no-cache
Postman-Token: f5bc26f2-b017-4e04-8328-0b9db4193fbf

[{"id":1,"name":"ANYC","age":30,"description":"O DB"},{"id":2,"name":"A","age":30,"description":"O DB"},{"id":3,"name":"ACYAN","age":11,"description":"O DB"}]
```
---
```http request
GET  HTTP/1.1
Host: localhost:12001
service-name: T
Cache-Control: no-cache
Postman-Token: 7f767527-fca6-4aec-b37b-7ac9aab74883

[{"id":1,"name":"Whitehead","age":12,"description":"T Database"},{"id":2,"name":"Wittgenstein","age":11,"description":"T_DB"}]
```

정상적으로 라우팅되면서 각 Database의 값을 불러오는 것을 볼 수 있다.
덤으로 O Database에 신규 추가를 한건하고 결과를 조회하면
```http request
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

GET  HTTP/1.1
Host: localhost:12001
service-name: O
Cache-Control: no-cache
Postman-Token: d3908131-aaf0-441b-853c-fc32b2d3f136

[{"id":1,"name":"ANYC","age":30,"description":"O DB"},{"id":2,"name":"A","age":30,"description":"O DB"},{"id":3,"name":"ACYAN","age":11,"description":"O DB"},{"id":4,"name":"Cyan Raphael Yi","age":120,"description":"O Database"}]
``` 
### 마치며

여기서는 간단한 예제로 소개하지만, 이 과정에서 살펴본 몇몇 예제에서는 Master-Slave 구조의 Database를 Routing해서 R/W를 나눈다거나, Entity별로 Database를 나눈다거나 하는 다양한 방식의 응용예제가 존재했다.
이 글에 작성된 예제 소스코드는 [Github](https://github.com/CyanRYi/sollabs-routing-data-source)에 등록되어 있다.

---
[^1]: 완전히 동일하진 않았지만, 적어도 저 상황에서 사용하는 부분의 스키마는 동일했다.

[^2]: AbstractRouting...을 통해 자동 완성으로 찾아냈지만, 만약 찾지 못했다면 직접 spring-jdbc 모듈을 뒤져보는 다음 단계를 진행했을 거다. datasource나 sql등을 다루는 기능은 거의 이 모듈에 있다.