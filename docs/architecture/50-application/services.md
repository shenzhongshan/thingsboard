# Service Layer

The service layer in `application/src/main/java/org/thingsboard/server/service/` contains 44 service packages that implement the business logic of the application. Services sit between the REST controllers and the DAO layer, coordinating entity operations, security, and the actor system.

## Service Layer Architecture

Services are organized into three broad categories:

1. **Entity Services** -- One per entity type (`device/`, `asset/`, `alarm/`, etc.), handling CRUD orchestration, validation, and integration with the actor system
2. **System Services** -- Infrastructure services (`queue/`, `subscription/`, `telemetry/`, `security/`, etc.) that manage the platform's runtime behavior
3. **Support Services** -- Technical services (`executors/`, `install/`, `lwm2m/`, etc.) for specific features

### Entity Services (in `service/entitiy/`)

Unlike the top-level service packages, the `service/entitiy/` package provides a structured entity service framework:

| Sub-package | Key Class | Purpose |
|-------------|-----------|---------|
| `device/` | `DefaultTbDeviceService`, `TbDeviceService` | Device CRUD, assignment, claiming |
| `asset/` | `DefaultTbAssetService` | Asset CRUD and assignment |
| `alarm/` | `DefaultTbAlarmService` | Alarm CRUD and lifecycle |
| `customer/` | `DefaultTbCustomerService` | Customer management |
| `tenant/` | `DefaultTbTenantService`, `TbTenantService` | Tenant lifecycle management |
| `user/` | `DefaultTbUserService` | User management |
| `dashboard/` | `DefaultTbDashboardService` | Dashboard CRUD |
| `edge/` | `DefaultTbEdgeService` | Edge instance management |
| `entityview/` | `DefaultTbEntityViewService`, `TbEntityViewService` | Entity View CRUD |
| `widgets/` | `DefaultTbWidgetsService` | Widget management |
| `ota/` | `DefaultTbOtaPackageService` | OTA package management |
| `queue/` | `DefaultTbQueueService` | Queue configuration |
| `ai/` | `DefaultTbAiModelService`, `TbAiModelService` | AI model management |
| `cf/` | `DefaultTbCalculatedFieldService` | Calculated field management |
| `domain/` | `DefaultTbDomainService` | Domain management |
| `mobile/` | `DefaultTbMobileAppService` | Mobile app management |
| `entity/` | `SimpleTbEntityService` | Generic entity operations |
| `oauth2client/` | `DefaultTbOAuth2ClientService` | OAuth2 client management |

Key patterns in entity services:
- `AbstractTbEntityService` -- Common base for entity services with audit logging
- `TbLogEntityActionService` + `EntityActionService` -- Audit logging for all entity mutations
- `EntityStateSourcingListener` -- Listens to entity state events

### Top-Level Service Packages

#### Entity-Oriented Services

| Package | Key Classes | Purpose |
|---------|-------------|---------|
| `action/` | Action processing | Entity action execution |
| `ai/` | AI model runtime | AI model inference orchestration |
| `asset/` | `AssetBulkImportService` | Asset bulk import from CSV |
| `cf/` | `CalculatedFieldProcessingService`, `CalculatedFieldStateService`, `CalculatedFieldQueueService`, `OwnerService` | Calculated field evaluation pipeline |
| `component/` | `ComponentDiscoveryService` | Rule node component registration and discovery |
| `device/` | `ClaimDevicesServiceImpl`, `DeviceBulkImportService`, `DeviceProvisionServiceImpl` | Device claiming, bulk import, provisioning |
| `gateway_device/` | Gateway device management | Gateway-specific device operations |
| `mail/` | `MailExecutorService` | Email sending execution |
| `mobile/` | Mobile app services | Mobile app runtime support |
| `notification/` | Notification services | Push/email notification delivery |
| `ota/` | `OtaPackageStateService` | OTA package state tracking |
| `resource/` | `TbResourceDataCache` | Resource data caching |
| `rpc/` | `TbCoreDeviceRpcService`, `TbRuleEngineDeviceRpcService`, `TbRpcService` | RPC request handling (core, rule-engine, general) |
| `rule/` | Rule chain management | Rule chain lifecycle |
| `ruleengine/` | Rule engine runtime | Rule engine execution coordination |
| `script/` | Script execution | JS/TBEL script invocation |
| `sms/` | `SmsExecutorService` | SMS sending execution |
| `user/` | User services | User-level operations |

#### System Services

| Package | Key Classes | Purpose |
|---------|-------------|---------|
| `apiusage/` | `TbApiUsageStateService` | API usage tracking and rate limit enforcement |
| `executors/` | `DbCallbackExecutorService`, `ExternalCallExecutorService`, `NotificationExecutorService`, `PubSubRuleNodeExecutorProvider`, `SharedEventLoopGroupService`, `VersionControlExecutor`, `GrpcCallbackExecutorService` | Dedicated thread pools for specific workloads |
| `housekeeper/` | Housekeeping tasks | Data cleanup, TTL enforcement |
| `install/` | `DefaultSystemDataLoaderService`, `SqlEntityDatabaseSchemaService`, `CassandraKeyspaceService`, `DatabaseUpgradeService`, `DataUpdateService`, `CacheCleanupService` | Database schema creation, upgrades, migrations, initial data |
| `job/` | Job scheduling | Background job management |
| `partition/` | Partition management | Queue partition assignment |
| `profile/` | `TbDeviceProfileCache`, `TbAssetProfileCache` | Profile caching |
| `queue/` | `DefaultTbCoreConsumerService`, `DefaultTbRuleEngineConsumerService`, `DefaultTbEdgeConsumerService`, `DefaultTbCalculatedFieldConsumerService`, `DefaultQueueRoutingInfoService`, `DefaultTenantRoutingInfoService` | Queue message consumption, routing, and processing |
| `security/` | Auth providers, JWT, permissions, 2FA, system security | See [config-and-security.md](config-and-security.md) |
| `session/` | `DeviceSessionCacheService` | Device transport session management |
| `state/` | `DefaultDeviceStateService`, `DefaultDeviceStateManager` | Device connectivity state tracking |
| `stats/` | Statistics collection | System and tenant statistics |
| `subscription/` | `DefaultSubscriptionManagerService`, `DefaultTbEntityDataSubscriptionService`, `DefaultTbLocalSubscriptionService` | WebSocket data subscriptions for telemetry, alarms, attributes |
| `sync/` | `ExportableEntitiesService`, `EntitiesVersionControlService` | Edge sync, entity export/import, version control |
| `system/` | System-level operations | System configuration, health |
| `telemetry/` | `DefaultTbTelemetryService`, `DefaultAlarmSubscriptionService`, `DefaultTelemetrySubscriptionService`, `InternalTelemetryService`, `TbTelemetryService` | Timeseries and attribute data reading/writing, alarm subscription management |
| `transport/` | `TbCoreToTransportService` | Communication from core to transport services |
| `ttl/` | TTL management | Time-to-live policy enforcement |
| `update/` | System updates | Software/data update orchestration |
| `ws/` | WebSocket services | WebSocket session and subscription management |

#### Support and Integration Services

| Package | Key Classes | Purpose |
|---------|-------------|---------|
| `lwm2m/` | LwM2M support | LwM2M protocol integration |
| `edqs/` | EDQS integration | Entity Data Query Service integration |
| `query/` | Query services | Complex entity data queries |

## How Services Interact with DAOs and Actors

### DAO Interaction

Services directly inject and call DAO-layer interfaces (from `common/dao-api`). The DAO layer handles SQL/NoSQL persistence. Services add business logic, validation, entity lifecycle management, and audit logging on top of DAO operations.

Example flow for saving a device:
```
DeviceController -> TbDeviceService.save()
  -> validates device (checkEntity)
  -> calls DeviceService (DAO) to persist
  -> sends ComponentLifecycleMsg to actor system
  -> logs entity action via EntityActionService
```

### Actor System Interaction

Services communicate with actors by:
1. Injecting `TbClusterService` or `TbQueueProducerProvider` to send messages to the queue
2. The queue routes messages to the appropriate partition/node
3. Consumer services deserialize and route to actors via `ActorSystemContext.tell()`

For example, `TbCoreToTransportService` sends messages to transport nodes for device communication.

## Transaction Management

Spring's declarative transaction management (`@Transactional`) is used in service methods that require atomic database operations. The transaction boundaries are typically at the service method level.

Key patterns:
- Entity services perform validation, then delegate to DAO services for persistence
- The DAO layer (in the `dao` module) handles actual `@Transactional` boundaries
- Services coordinate multiple DAO calls and actor messages within a single business operation
- ListenableFuture/Guava futures are used for asynchronous DAO operations

## Related Documents

- [README](README.md) -- Application module overview
- [Controllers](controllers.md) -- REST API controllers that call services
- [Actors](actors.md) -- Actor system that services interact with
- [Configuration and Security](config-and-security.md) -- Security service details
