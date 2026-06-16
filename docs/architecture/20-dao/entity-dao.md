# Entity DAO Catalog

A comprehensive catalog of every entity DAO package in `dao/src/main/java/org/thingsboard/server/dao/`, organized by domain area.

---

## Core Entities

### Device

**Package:** `dao/src/main/java/org/thingsboard/server/dao/device/`

Persistence for devices, device profiles, credentials, and connectivity state.

| File | Role |
|------|------|
| `DeviceDao.java` | Interface -- CRUD, lookup by tenant/customer/name/type/profile/edge, OTA filtering |
| `DeviceProfileDao.java` | Interface -- device profile CRUD |
| `DeviceCredentialsDao.java` | Interface -- device credentials (access token, X.509, MQTT basic) |
| `DeviceServiceImpl.java` | Service implementation |
| `DeviceProfileServiceImpl.java` | Profile service implementation |
| `DeviceCredentialsServiceImpl.java` | Credentials service implementation |
| `DeviceConnectivityServiceImpl.java` | Device online/offline state |
| `DeviceProfileCaffeineCache.java` | Caffeine cache for device profiles |
| `DeviceProfileRedisCache.java` | Redis cache for device profiles |

**Key entities:** `Device`, `DeviceProfile`, `DeviceCredentials`, `ClaimDataInfo`

**Key JPA implementation:** `dao/src/main/java/org/thingsboard/server/dao/sql/device/JpaDeviceDao.java`

### Asset

**Package:** `dao/src/main/java/org/thingsboard/server/dao/asset/`

Persistence for assets and asset profiles.

| File | Role |
|------|------|
| `AssetDao.java` | Interface -- CRUD, lookup by tenant/customer/name/type |
| `AssetProfileDao.java` | Interface -- asset profile CRUD |
| `BaseAssetService.java` | Service implementation |
| `AssetProfileServiceImpl.java` | Profile service implementation |
| `AssetTypeFilter.java` | Asset type filtering utility |

**Key entities:** `Asset`, `AssetProfile`

### Alarm

**Package:** `dao/src/main/java/org/thingsboard/server/dao/alarm/`

Alarm lifecycle management: creation, acknowledgement, clearing, propagation, and comments.

| File | Role |
|------|------|
| `AlarmDao.java` | Interface -- alarm CRUD, query by originator/type/severity/status, propagation |
| `AlarmCommentDao.java` | Interface -- alarm comment CRUD |
| `BaseAlarmService.java` | Service implementation |
| `BaseAlarmCommentService.java` | Comment service implementation |
| `AlarmTypesCaffeineCache.java` | Cache of alarm types per tenant |

**Key entities:** `Alarm`, `AlarmComment`, `AlarmInfo`, `EntityAlarm`

### Dashboard

**Package:** `dao/src/main/java/org/thingsboard/server/dao/dashboard/`

Persistence for dashboards and dashboard info (listing).

| File | Role |
|------|------|
| `DashboardDao.java` | Interface -- CRUD, lookup by tenant/customer/title |
| `DashboardInfoDao.java` | Interface -- lightweight dashboard info for listing views |
| `DashboardServiceImpl.java` | Service implementation |

**Key entities:** `Dashboard`, `DashboardInfo`

### Entity View

**Package:** `dao/src/main/java/org/thingsboard/server/dao/entityview/`

Persistence for entity views (virtual subsets of device/asset telemetry).

**Key entity:** `EntityView`

### Relation

**Package:** `dao/src/main/java/org/thingsboard/server/dao/relation/`

Entity relationship storage: connects devices to assets, customers, dashboards, etc.

| File | Role |
|------|------|
| `RelationDao.java` | Interface -- relation CRUD, find by from/to entity, relation type filtering |
| `BaseRelationService.java` | Service implementation |
| `RelationCaffeineCache.java` / `RelationRedisCache.java` | Multi-layer caching |

**Key entities:** `EntityRelation`, `RelationCacheKey`, `RelationCacheValue`

---

## Profiles

### Device Profile

(Part of `device/` package -- see Device above)

**Key entity:** `DeviceProfile` -- defines transport type (MQTT/HTTP/CoAP/LwM2M/SNMP), provision strategy, default rule chain, alarm rules, and queue settings.

### Asset Profile

(Part of `asset/` package -- see Asset above)

**Key entity:** `AssetProfile` -- defines default rule chain, dashboard, and queue for asset types.

### Tenant Profile

**Package:** `dao/src/main/java/org/thingsboard/server/dao/tenant/`

| File | Role |
|------|------|
| `TenantProfileDao.java` | Interface -- tenant profile CRUD |
| `TenantProfileServiceImpl.java` | Service implementation |
| `DefaultTbTenantProfileCache.java` | Profile cache |

**Key entity:** `TenantProfile` -- JSON-based profile data controlling tenant limits, features, rate limits.

---

## User Management

### Tenant

**Package:** `dao/src/main/java/org/thingsboard/server/dao/tenant/`

| File | Role |
|------|------|
| `TenantDao.java` | Interface -- tenant CRUD, lookup by title/region |
| `TenantServiceImpl.java` | Service implementation |
| `TenantCaffeineCache.java` / `TenantRedisCache.java` | Tenant caching |
| `TenantExistsCaffeineCache.java` / `TenantExistsRedisCache.java` | Existence check cache |

**Key entity:** `Tenant`

### Customer

**Package:** `dao/src/main/java/org/thingsboard/server/dao/customer/`

| File | Role |
|------|------|
| `CustomerDao.java` | Interface -- CRUD, lookup by tenant/title |
| `CustomerServiceImpl.java` | Service implementation |

**Key entity:** `Customer` -- sub-tenant entity for grouping devices and assets.

### User

**Package:** `dao/src/main/java/org/thingsboard/server/dao/user/`

| File | Role |
|------|------|
| `UserDao.java` | Interface -- CRUD, lookup by tenant/email |
| `UserCredentialsDao.java` | Interface -- login credentials, activation/reset tokens |
| `UserAuthSettingsDao.java` | Interface -- 2FA and OAuth settings |
| `UserSettingsDao.java` | Interface -- user preferences |
| `UserServiceImpl.java` | Service implementation |
| `UserSettingsServiceImpl.java` | Settings service |

**Key entities:** `User`, `UserCredentials`, `UserAuthSettings`, `UserSettings`

---

## Configuration

### Rule Chain

**Package:** `dao/src/main/java/org/thingsboard/server/dao/rule/`

| File | Role |
|------|------|
| `RuleChainDao.java` | Interface -- rule chain CRUD, root chain lookup |
| `RuleChainDetailsDao.java` | Interface -- rule chain info with node count |
| `RuleNodeDao.java` | Interface -- rule node CRUD within a chain |
| `RuleNodeStateDao.java` | Interface -- per-node per-entity state persistence |
| `BaseRuleChainService.java` | Service implementation |
| `BaseRuleNodeStateService.java` | Node state service |

**Key entities:** `RuleChain`, `RuleNode`, `RuleNodeState`

### Widget

**Package:** `dao/src/main/java/org/thingsboard/server/dao/widget/`

| File | Role |
|------|------|
| `WidgetTypeDao.java` | Interface -- widget type CRUD, lookup by FQN |
| `WidgetsBundleDao.java` | Interface -- widget bundle CRUD |
| `WidgetTypeServiceImpl.java` | Service |
| `WidgetsBundleServiceImpl.java` | Service |

**Key entities:** `WidgetType`, `WidgetsBundle`, `WidgetsBundleWidget`

### Resource

**Package:** `dao/src/main/java/org/thingsboard/server/dao/resource/`

| File | Role |
|------|------|
| `TbResourceDao.java` | Interface -- resource CRUD (JS functions, images, etc.) |
| `TbResourceInfoDao.java` | Interface -- lightweight resource info |
| `BaseResourceService.java` | Service implementation |
| `BaseImageService.java` | Image-specific service |
| `DefaultTbResourceDataCache.java` | Resource data cache |

**Key entity:** `TbResource` -- stored code modules, CSS, images used by widgets/dashboards.

### Admin Settings

**Package:** `dao/src/main/java/org/thingsboard/server/dao/settings/`

Key/value system settings per tenant. Stored in the `admin_settings` table.

### Queue

**Package:** `dao/src/main/java/org/thingsboard/server/dao/queue/`

Queue configuration persistence. Defines Kafka topics, partitions, consumer settings, and processing strategies for each tenant's message queues.

### Component Descriptor

**Package:** `dao/src/main/java/org/thingsboard/server/dao/component/`

Rule node component descriptor persistence. Maps Java class names to their metadata (type, scope, clustering mode, configuration descriptor) for the rule engine component registry.

### OAuth2

**Package:** `dao/src/main/java/org/thingsboard/server/dao/oauth2/`

OAuth2 client configurations for SSO login.

**Key entity:** `OAuth2Client`

### Domain

**Package:** `dao/src/main/java/org/thingsboard/server/dao/domain/`

Mobile app domain configuration.

---

## Edge

**Package:** `dao/src/main/java/org/thingsboard/server/dao/edge/`

Edge computing support for synchronizing entities from cloud to edge instances.

| File | Role |
|------|------|
| `EdgeDao.java` | Interface -- edge instance CRUD |
| `EdgeEventDao.java` | Interface -- edge event queue (changes to sync) |
| `EdgeServiceImpl.java` | Service implementation |
| `BaseEdgeEventService.java` | Event processing service |
| `PostgresEdgeEventService.java` | PG-specific event service |
| `DefaultEdgeSynchronizationManager.java` | Sync state management |

**Key entities:** `Edge`, `EdgeEvent`

---

## Notifications

**Package:** `dao/src/main/java/org/thingsboard/server/dao/notification/`

In-app and external notification system.

| File | Role |
|------|------|
| `NotificationDao.java` | Interface -- sent notification CRUD |
| `NotificationRuleDao.java` | Interface -- notification rule CRUD |
| `NotificationTargetDao.java` | Interface -- notification target (recipients) CRUD |
| `NotificationTemplateDao.java` | Interface -- notification template CRUD |
| `NotificationRequestDao.java` | Interface -- notification request CRUD |
| `DefaultNotificationService.java` | Core notification service |
| `DefaultNotificationRuleService.java` | Rule service |
| `DefaultNotificationTargetService.java` | Target service |
| `DefaultNotificationTemplateService.java` | Template service |
| `DefaultNotificationRequestService.java` | Request service |
| `DefaultNotificationSettingsService.java` | User notification preferences |

**Key entities:** `Notification`, `NotificationRule`, `NotificationTarget`, `NotificationTemplate`, `NotificationRequest`

---

## OTA (Over-the-Air Updates)

**Package:** `dao/src/main/java/org/thingsboard/server/dao/ota/`

Firmware and software OTA package management.

| File | Role |
|------|------|
| `OtaPackageDao.java` | Interface -- OTA package CRUD |
| `OtaPackageInfoDao.java` | Interface -- lightweight package info |
| `BaseOtaPackageService.java` | Service implementation |
| `OtaPackageCaffeineCache.java` / `OtaPackageRedisCache.java` | Multi-layer caching |

**Key entity:** `OtaPackage`

---

## Timeseries & Telemetry

### Timeseries

**Package:** `dao/src/main/java/org/thingsboard/server/dao/timeseries/`

Timeseries data storage abstraction.

| File | Role |
|------|------|
| `TimeseriesDao.java` | Interface -- save/find timeseries key-value data |
| `TimeseriesLatestDao.java` | Interface -- latest value per key per entity |
| `BaseTimeseriesService.java` | Service implementation |
| `CassandraBaseTimeseriesDao.java` | Cassandra implementation |
| `AbstractCassandraBaseTimeseriesDao.java` | Base for Cassandra timeseries DAOs |
| `SqlPartition.java` / `SqlTsPartitionDate.java` | SQL partitioning support |
| `QueryCursor.java` / `TsKvQueryCursor.java` | Cursor-based query iteration |
| `TsLatestRedisCache.java` | Redis cache for latest values |

**Key entities:** `TsKvEntry`, `TsKvLatest`

### SQL Timeseries

**Package:** `dao/src/main/java/org/thingsboard/server/dao/sqlts/`

SQL-specific timeseries implementations using PostgreSQL's native partitioning or TimescaleDB hyperchunks.

### Attributes

**Package:** `dao/src/main/java/org/thingsboard/server/dao/attributes/`

| File | Role |
|------|------|
| `AttributesDao.java` | Interface -- attribute CRUD (server, shared, client scopes) |
| `BaseAttributesService.java` | Service implementation |
| `CachedAttributesService.java` | Cached attribute service |
| `AttributeCaffeineCache.java` / `AttributeRedisCache.java` | Multi-layer caching |

**Key entity:** `AttributeKvEntry`

---

## Events & Audit

### Events

**Package:** `dao/src/main/java/org/thingsboard/server/dao/event/`

Lifecycle events, error events, and statistics events.

| File | Role |
|------|------|
| `EventDao.java` | Interface -- event CRUD |
| `BaseEventService.java` | Service implementation |

**Key entities:** Various event types (`Event`, `LifecycleEvent`, `ErrorEvent`, `StatsEvent`, `RuleNodeDebugEvent`, `RuleChainDebugEvent`)

### Audit Log

**Package:** `dao/src/main/java/org/thingsboard/server/dao/audit/`

Audit trail persistence.

| File | Role |
|------|------|
| `AuditLogDao.java` | Interface -- audit log CRUD, partitioned by time range |
| `AuditLogServiceImpl.java` | Service |
| `AuditLogLevelFilter.java` | Log level filtering (mask-based) |
| `AuditLogLevelMask.java` | Mask definitions |

**Key entity:** `AuditLog`

---

## Misc

### RPC

**Package:** `dao/src/main/java/org/thingsboard/server/dao/rpc/`

| File | Role |
|------|------|
| `RpcDao.java` | Interface -- RPC request CRUD |
| `BaseRpcService.java` | Service implementation |

**Key entity:** `Rpc`

### API Usage

**Package:** `dao/src/main/java/org/thingsboard/server/dao/usagerecord/`

| File | Role |
|------|------|
| `ApiUsageStateDao.java` | Interface -- per-tenant API usage state |
| `ApiUsageStateServiceImpl.java` | Service |
| `DefaultApiLimitService.java` | Rate limiting implementation |

**Key entity:** `ApiUsageState`

### Personal Access Tokens (PAT)

**Package:** `dao/src/main/java/org/thingsboard/server/dao/pat/`

API key / personal access token management for programmatic API access.

### AI

**Package:** `dao/src/main/java/org/thingsboard/server/dao/ai/`

AI model configuration persistence.

**Key entity:** `AiModel`

### Mobile

**Package:** `dao/src/main/java/org/thingsboard/server/dao/mobile/`

Mobile app and mobile app bundle persistence.

| File | Role |
|------|------|
| `MobileAppService.java` | Service interface |
| `MobileAppBundleService.java` | Bundle service interface |

### Job

**Package:** `dao/src/main/java/org/thingsboard/server/dao/job/`

Scheduled job persistence. Supports recurring maintenance tasks.

### Housekeeper

**Package:** `dao/src/main/java/org/thingsboard/server/dao/housekeeper/`

TTL-based data cleanup. Removes expired partitions and records from timeseries and event tables.

### Calculated Fields

**Package:** `dao/src/main/java/org/thingsboard/server/dao/cf/`

Support for calculated fields -- computed telemetry values derived from existing data.

### Trendz

**Package:** `dao/src/main/java/org/thingsboard/server/dao/trendz/`

Analytics/trending data persistence.

### Cache Infrastructure

**Package:** `dao/src/main/java/org/thingsboard/server/dao/cache/`

Cache abstractions supporting Caffeine (in-process) and Redis (distributed) dual-layer caching across all entity types.

### Entity Query

**Package:** `dao/src/main/java/org/thingsboard/server/dao/entity/`

Generic entity query support -- cross-entity lookups used by search and the entity query API.

---

## Related Documents

- [DAO Layer Overview](README.md) -- architecture and design of the DAO layer
- [SQL Schema & Migration](sql-schema.md) -- database tables and migration system
