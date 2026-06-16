# Application Module

The `application` module is the main Spring Boot 3.5 application server for ThingsBoard. It provides the REST API, WebSocket endpoints, actor system, service layer, security, and all server-side business logic. With 949 Java source files across 7 top-level packages, it is the largest and most complex module in the ThingsBoard monorepo.

## Entry Point

The application entry point is `ThingsboardServerApplication` located at:

```
application/src/main/java/org/thingsboard/server/ThingsboardServerApplication.java
```

It uses `@SpringBootConfiguration` (not `@SpringBootApplication`) with explicit annotations:
- `@EnableAsync` -- enables asynchronous method execution via `@Async`
- `@EnableScheduling` -- enables `@Scheduled` tasks for periodic jobs
- `@ComponentScan({"org.thingsboard.server", "org.thingsboard.script"})` -- scans the main application packages and the script engine package

The `main()` method launches via `SpringApplication.run()` and automatically appends `--spring.config.name=thingsboard` if not already specified, ensuring the `thingsboard.yml` configuration file is loaded.

Application startup time is logged via the `@AfterStartUp` hook at `Ordered.LOWEST_PRECEDENCE`.

## Package Structure

| Package | Purpose | Key Files |
|---------|---------|-----------|
| `actors/` | Actor system -- tenant, device, rule chain, calculated field, and stats actors | `ActorSystemContext.java`, `TenantActor.java`, `DeviceActor.java`, `AppActor.java`, `StatsActor.java` |
| `config/` | Spring `@Configuration` classes -- security, web, CORS, scheduling, Swagger, WebSocket, crypto, rate limiting | `ThingsboardSecurityConfiguration.java`, `WebConfig.java`, `SchedulingConfiguration.java` |
| `controller/` | REST API controllers (63 controller classes) | `BaseController.java`, `AuthController.java`, `DeviceController.java`, `TenantController.java` |
| `exception/` | Custom exception types and error response handling | `DataValidationException.java`, `ThingsboardErrorResponseHandler.java` |
| `install/` | Database schema creation, upgrades, migrations, and initial data loading | `DefaultSystemDataLoaderService.java`, `SqlEntityDatabaseSchemaService.java` |
| `service/` | Service layer (44 service packages) -- entity services, system services, integration services | See [services.md](services.md) |
| `utils/` | Application-level utility classes | Various helper utilities |

## How the Application Consumes Queue Messages

The application integrates with the ThingsBoard queue system (Kafka or pub-sub based) to process messages asynchronously. The key consumer services are in `service/queue/`:

- **`TbCoreConsumerService`** -- Consumes messages for the TB-CORE service type (REST API, WebSocket, device state management)
- **`TbRuleEngineConsumerService`** -- Consumes messages for TB-RULE-ENGINE (rule chain processing)
- **`TbEdgeConsumerService`** -- Consumes messages for edge synchronization
- **`TbCalculatedFieldConsumerService`** -- Consumes messages for calculated field evaluation

Messages arrive from the queue, are deserialized into `TbActorMsg` subtypes, and routed to the appropriate actor via `ActorSystemContext.tell()` or `tellWithHighPriority()`. The routing hierarchy is:

```
Queue Message -> Consumer Service -> ActorSystemContext.tell() -> AppActor -> TenantActor -> DeviceActor / RuleChainActor
```

The `PartitionService` determines which partition/node handles a given message, and `PartitionChangeEvent` triggers repartitioning.

## Spring Profiles and Conditional Bean Wiring

The application uses conditional bean wiring extensively to support different deployment modes:

- **`@TbCoreComponent`** -- Denotes beans active when the service runs in TB-CORE mode (REST API + actors)
- Service type checks via `TbServiceInfoProvider.isService(ServiceType.TB_CORE)` or `TB_RULE_ENGINE`
- `@Autowired(required = false)` with `@Lazy` for optional dependencies (e.g., Edge service, TbelInvokeService, Cassandra cluster, Redis template)
- `@ConditionalOnMissingBean` for overridable beans (e.g., CorsFilter)
- Database type selection via `thingsboard.yml` properties: `DATABASE_TS_TYPE`, `DATABASE_TS_LATEST_TYPE`
- Queue type selection via `TB_QUEUE_TYPE` (kafka, pub-sub, etc.)
- Cache type selection: `caffeine` (local) vs Redis

## Key Dependencies on Other Modules

| Module | Dependency |
|--------|------------|
| `common/data` | Entity models (Device, Asset, Alarm, Tenant, User, etc.), DTOs, IDs, enums |
| `common/message` | Internal message types (`TbMsg`, `TbActorMsg`, queue messages) |
| `common/queue` | Queue infrastructure (producers, consumers, discovery, partition) |
| `common/dao-api` | DAO interfaces (service contracts for data access) |
| `common/cache` | Caffeine-based caching utilities |
| `common/cluster-api` | Cluster communication interfaces |
| `common/actor` | Actor system abstractions (`TbActor`, `TbActorRef`, `TbActorSystem`) |
| `common/transport` | Transport-layer shared classes (sessions, credentials) |
| `dao` | Data access implementations (SQL and NoSQL) |
| `rule-engine/rule-engine-api` | Rule engine interfaces (`MailService`, `SmsService`, etc.) |
| `rule-engine/rule-engine-components` | Built-in rule node implementations |
| `netty-mqtt` | MQTT codec for internal MQTT client operations |

## Threading Model and Async Processing

The application uses multiple threading strategies:

1. **Actor System Dispatchers** -- The actor system creates dedicated `ExecutorService` instances (work-stealing pools) for each dispatcher:
   - `app-dispatcher` (default 1 thread)
   - `tenant-dispatcher` (default 2 threads)
   - `device-dispatcher` (default 4 threads)
   - `rule-dispatcher` (default 8 threads)
   - `cf-manager-dispatcher` (default 2 threads)
   - `cf-entity-dispatcher` (default 8 threads)

2. **Dedicated Executor Services** -- Located in `service/executors/`:
   - `DbCallbackExecutorService` -- Database callback execution
   - `ExternalCallExecutorService` -- External HTTP/call execution
   - `NotificationExecutorService` -- Notification processing
   - `SharedEventLoopGroupService` -- Netty event loop groups
   - `PubSubRuleNodeExecutorProvider` -- Pub-sub rule node execution
   - `VersionControlExecutor` -- Version control operations

3. **Spring `@Async`** -- Enabled via `@EnableAsync` for asynchronous method execution

4. **DeferredResult** -- Controllers use `DeferredResult<T>` for long-polling and async HTTP responses, wrapped via `DonAsynchron.withCallback()`

5. **Scheduled Tasks** -- Via `@EnableScheduling` for periodic operations (stats reporting, session timeout checks, housekeeping)

## Related Documents

- [Controllers](controllers.md) -- REST API controller catalog
- [Services](services.md) -- Service layer catalog
- [Actors](actors.md) -- Actor system documentation
- [Configuration and Security](config-and-security.md) -- Config and security architecture
