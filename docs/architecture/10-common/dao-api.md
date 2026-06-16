# Common DAO API (`common/dao-api`)

**Maven artifact:** `org.thingsboard.common:dao-api`

The `common/dao-api` module defines DAO (Data Access Object) interfaces and service-level contracts for all entity types. It provides the repository pattern abstraction layer, database-type annotations for conditional bean wiring, and base DAO utilities. Concrete implementations reside in the `dao/` module (not in `common/`).

## Architecture

### DAO Interface Pattern

Each entity type has a dedicated DAO interface that follows a consistent pattern:

```java
public interface DeviceDao extends Dao<Device> {
    Device findByTenantIdAndName(TenantId tenantId, String name);
    PageData<Device> findByTenantId(TenantId tenantId, PageLink pageLink);
    // entity-specific queries...
}
```

Base interface `Dao<T>` provides CRUD operations:
- `T findById(TenantId tenantId, UUID id)`
- `T save(TenantId tenantId, T entity)`
- `boolean removeById(TenantId tenantId, UUID id)`

### Database-Type Annotations

The module uses custom annotations to conditionally wire DAO implementations based on the active database type. Spring conditional beans route to the correct implementation at startup.

| Annotation | Condition | Used For |
|-----------|-----------|----------|
| `@SqlDao` | Always active when using SQL DB | Main entity DAOs (device, asset, customer, etc.) |
| `@NoSqlAnyDao` | `database.ts.type==cassandra` OR `database.ts_latest.type==cassandra` | Cassandra-based DAOs |
| `@NoSqlTsDao` | `database.ts.type==cassandra` | Cassandra timeseries |
| `@NoSqlTsLatestDao` | `database.ts_latest.type==cassandra` | Cassandra latest timeseries |
| `@SqlTsDao` | SQL timeseries active | SQL timeseries |
| `@SqlTsLatestDao` | SQL latest timeseries active | SQL latest values |
| `@SqlTsLatestAnyDao` | Any SQL latest timeseries | Latest values (any SQL backend) |
| `@SqlTsOrTsLatestAnyDao` | SQL TS or TS Latest | Combined TS + latest |
| `@TimescaleDBTsDao` | `database.ts.type==timescale` | TimescaleDB-specific timeseries queries |
| `@TimescaleDBTsLatestDao` | `database.ts_latest.type==timescale` | TimescaleDB latest values |

Annotations like `@NoSqlAnyDao` use `@ConditionalOnExpression`:

```java
@Retention(RetentionPolicy.RUNTIME)
@ConditionalOnExpression("'${database.ts.type}'=='cassandra' || '${database.ts_latest.type}'=='cassandra'")
public @interface NoSqlAnyDao {}
```

The module also provides `TbAutoConfiguration` which orchestrates auto-configuration based on profile settings.

### DB Type Information

`DbTypeInfoComponent` (and its default implementation `DefaultDbTypeInfoComponent`) provides runtime information about the current database configuration, allowing code to branch on whether the system is using SQL, NoSQL, TimescaleDB, etc.

## DAO Subpackages

Each subpackage under `org.thingsboard.server.dao` defines interfaces for a specific domain entity:

| Subpackage | Entity | Key Interfaces |
|-----------|--------|----------------|
| `device/` | Device | `DeviceDao`, `DeviceCredentialsDao` |
| `asset/` | Asset | `AssetDao` |
| `customer/` | Customer | `CustomerDao` |
| `tenant/` | Tenant | `TenantDao`, `TenantProfileDao` |
| `user/` | User | `UserDao`, `UserCredentialsDao` |
| `dashboard/` | Dashboard | `DashboardDao` |
| `alarm/` | Alarm | `AlarmDao`, `AlarmCommentDao` |
| `rule/` | Rule Chain, Rule Node | `RuleChainDao`, `RuleNodeDao` |
| `widget/` | Widget | `WidgetTypeDao`, `WidgetsBundleDao` |
| `edge/` | Edge | `EdgeDao`, `EdgeEventDao` |
| `entityview/` | Entity View | `EntityViewDao` |
| `relation/` | Relations | `RelationDao` |
| `attributes/` | Attributes | `AttributeDao` |
| `event/` | Events | `EventDao` |
| `audit/` | Audit Logs | `AuditLogDao` |
| `rpc/` | RPC | `RpcDao` |
| `resource/` | Resources | `ResourceDao` |
| `ota/` | OTA Packages | `OtaPackageDao` |
| `notification/` | Notifications | Notification DAOs |
| `ai/` | AI Models | `AiModelDao` |
| `domain/` | Domains | `DomainDao` |
| `mobile/` | Mobile Apps | `MobileAppDao`, `MobileAppBundleDao` |
| `oauth2/` | OAuth2 | OAuth2 client DAOs |
| `pat/` | PAT | Personal access token DAOs |
| `component/` | Component Descriptors | `ComponentDescriptorDao` |
| `queue/` | Queue Config | Queue DAOs |
| `settings/` | Admin Settings | `AdminSettingsDao` |
| `timeseries/` | Timeseries | Timeseries DAOs |
| `usage/` | Usage Stats | Usage DAOs |
| `usagerecord/` | Usage Records | Usage record DAOs |
| `job/` | Jobs | `JobDao` |
| `trendz/` | Trendz Analytics | Trendz analytics DAOs |
| `cf/` | Calculated Fields | `CalculatedFieldDao` |
| `entity/` | Entity Counts/Queries | Entity-level count/query services |

### AsyncTask Utility

`AsyncTask.java` provides a generic base class for asynchronous tasks with retry support, used by DAO implementations for long-running or failure-prone operations.

## Relationships

- **Depends on:** `common/data` (for entity models, IDs)
- **Depended on by:** `dao/` (concrete SQL and NoSQL implementations), `application` (services that use DAOs)
- **Maven groupId:** `org.thingsboard.common`
- **Maven artifactId:** `dao-api`
