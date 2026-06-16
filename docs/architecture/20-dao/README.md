# DAO Layer

Data Access Object layer -- the bridge between business logic and persistent storage in ThingsBoard.

## Architecture

The DAO layer uses a classic **interface/implementation** pattern:

- **Interfaces** live in `dao/src/main/java/org/thingsboard/server/dao/<entity>/` and define the contract for each entity type.
- **JPA implementations** live in `dao/src/main/java/org/thingsboard/server/dao/sql/` (subpackages mirroring the interface packages) and implement those contracts via Hibernate + Spring Data JPA.
- **SQL repositories** (Spring Data `JpaRepository` sub-interfaces) provide the actual query methods underneath each JPA DAO.

The module contains **636 Java files** across **48 DAO packages**.

```
dao/src/main/java/org/thingsboard/server/dao/
  Dao.java              -- root interface
  TenantEntityDao.java  -- tenant-scoped helper
  ExportableEntityDao.java -- external-ID-based lookup
  <entity>/             -- interfaces (DeviceDao, AssetDao, etc.)
  sql/
    JpaAbstractDao.java -- base class for all JPA DAOs
    <entity>/           -- JPA implementations (JpaDeviceDao, etc.)
      <Entity>Repository.java  -- Spring Data JPA repository
      <Entity>Entity.java      -- JPA entity (maps to DB table)
  nosql/                -- Cassandra-based DAOs (for timeseries)
```

## Root Interfaces

### `Dao<T>` (the root)

```java
public interface Dao<T> {
    List<T> find(TenantId tenantId);
    T findById(TenantId tenantId, UUID id);
    ListenableFuture<T> findByIdAsync(TenantId tenantId, UUID id);
    boolean existsById(TenantId tenantId, UUID id);
    T save(TenantId tenantId, T t);
    T saveAndFlush(TenantId tenantId, T t);
    void removeById(TenantId tenantId, UUID id);
    void removeAllByIds(Collection<UUID> ids);
    List<UUID> findIdsByTenantIdAndIdOffset(TenantId tenantId, UUID idOffset, int limit);
}
```

Every method takes `TenantId` as the first parameter for isolation (see Tenant Isolation below).

### `TenantEntityDao<T>`

Adds tenant-scoped pagination methods (`countByTenantId`, `findAllByTenantId`). Implemented by entities that are directly owned by a tenant.

### `ExportableEntityDao<I, T>`

For entities that can be exported/imported using external IDs. Adds `findByTenantIdAndExternalId`, `findByTenantIdAndName`, and `findByTenantId` (paginated).

## JpaAbstractDao -- The Base JPA Implementation

`JpaAbstractDao<E extends BaseEntity<D>, D>` extends `JpaAbstractDaoListeningExecutorService` and implements `Dao<D>`.

Key members:
- `@PersistenceContext EntityManager entityManager` -- Hibernate entity manager for persistence operations.
- `@Autowired JdbcTemplate jdbcTemplate` -- raw JDBC for custom SQL.
- `save(TenantId, D)` -- converts the domain object to a JPA entity (via reflection), sets creation time, delegates to `doSave()`.
- `doSave(entity, isNew, flush)` -- persists new entities via `persist()`, updates existing via `merge()`, and handles optimistic locking through versioned entities (`HasVersion`).

Entity-to-domain mapping convention:
- Domain classes (e.g., `Device`) live in `common/data`.
- JPA entity classes (e.g., `DeviceEntity`) live in `dao/sql/device/`.
- `DaoUtil.getData(entity)` converts entities back to domain objects.

## Tenant Isolation

Multi-tenancy is enforced at the DAO layer:

1. **`TenantId` as first parameter** on every DAO method. Every query filters by `tenant_id`.
2. **`tenant_id` column** exists on every entity table (except a few system-global tables like `tenant_profile`).
3. **Uniqueness constraints** are qualified by tenant: e.g., `CONSTRAINT device_name_unq_key UNIQUE (tenant_id, name)` -- the same device name can exist in different tenants.
4. **Cache keys** include tenant ID to prevent cross-tenant cache pollution.

## Dual Database Architecture

ThingsBoard splits its storage into two concerns:

| Concern | Backend | Technology |
|---------|---------|------------|
| **Entity data** (devices, assets, alarms, dashboards, users, etc.) | SQL | PostgreSQL via JPA/Hibernate |
| **Timeseries data** (telemetry, attributes, events) | Configurable | SQL (PostgreSQL native partitioning), Cassandra, or TimescaleDB |

The `common/data` model classes, `Dao` interfaces, and service layer abstract this away. The actual timeseries DAO implementations are in `dao/src/main/java/org/thingsboard/server/dao/timeseries/` and `dao/src/main/java/org/thingsboard/server/dao/sqlts/`.

## The 48 DAO Packages

| # | Package | Purpose |
|---|---------|---------|
| 1 | `ai/` | AI model configuration (includes AI service) |
| 2 | `alarm/` | Alarm lifecycle, comments, alarm type caching |
| 3 | `aspect/` | AOP aspects (cross-cutting concerns) |
| 4 | `asset/` | Asset and AssetProfile CRUD, caching |
| 5 | `attributes/` | Entity attribute KV storage and caching |
| 6 | `audit/` | Audit log persistence |
| 7 | `cache/` | Cache abstractions (Caffeine + Redis) |
| 8 | `cf/` | Calculated fields |
| 9 | `component/` | Rule node component descriptors |
| 10 | `config/` | System configuration |
| 11 | `customer/` | Customer CRUD |
| 12 | `dashboard/` | Dashboard and dashboard info |
| 13 | `device/` | Device, DeviceProfile, DeviceCredentials |
| 14 | `dictionary/` | Key dictionary (timeseries key mapping) |
| 15 | `domain/` | Domain (mobile app domain) |
| 16 | `edge/` | Edge instance and edge event sync |
| 17 | `entity/` | Generic entity queries |
| 18 | `entityview/` | Entity view CRUD |
| 19 | `event/` | Lifecycle events, error events, stats events |
| 20 | `eventsourcing/` | Event sourcing support |
| 21 | `exception/` | DAO-level exception classes |
| 22 | `housekeeper/` | Housekeeping (TTL-based data cleanup) |
| 23 | `job/` | Scheduled jobs |
| 24 | `mobile/` | Mobile app and mobile app bundles |
| 25 | `model/` | JPA entity base classes (BaseEntity, ModelConstants) |
| 26 | `nosql/` | Cassandra abstract DAOs (for timeseries) |
| 27 | `notification/` | Notification rules, targets, templates, requests |
| 28 | `oauth2/` | OAuth2 client configuration |
| 29 | `ota/` | OTA package (firmware/software updates) |
| 30 | `pat/` | Personal access tokens / API keys |
| 31 | `queue/` | Queue configuration |
| 32 | `relation/` | Entity relations and relation caching |
| 33 | `resource/` | Resource (images, files) and image caching |
| 34 | `rpc/` | RPC (Remote Procedure Call to devices) |
| 35 | `rule/` | Rule chain and rule node persistence |
| 36 | `service/` | Service-level DAO helpers (e.g., validator) |
| 37 | `settings/` | Admin settings |
| 38 | `sql/` | JPA abstract DAOs, query helpers, Hibernate types |
| 39 | `sqlts/` | SQL-based timeseries DAO implementations |
| 40 | `tenant/` | Tenant and TenantProfile CRUD, caching |
| 41 | `timeseries/` | Timeseries DAO interfaces and Cassandra implementations |
| 42 | `trendz/` | Trendz analytics |
| 43 | `usage/` | API usage tracking |
| 44 | `usagerecord/` | API usage state / rate limiting |
| 45 | `user/` | User, UserCredentials, UserAuthSettings, UserSettings |
| 46 | `util/` | DAO utilities |
| 47 | `widget/` | Widget type and widgets bundle |

Note: Packages like `sql/`, `nosql/`, `sqlts/`, `model/`, `util/`, `exception/`, and `service/` are infrastructure packages rather than entity-specific DAOs.

## Connection to the Service Layer

```
REST Controller --> EntityService (application/service/)
                       |
                       v
                   EntityDao (dao/<entity>/)
                       |
                       v
               JpaEntityDao (dao/sql/<entity>/)
                       |
                       v
              EntityRepository (Spring Data JPA)
                       |
                       v
                   PostgreSQL
```

- **Controllers** in `application/.../controller/` handle HTTP requests.
- **Services** in `application/.../service/` contain business logic. There is roughly one service per entity.
- **DAOs** are injected into services as constructor dependencies. The service calls `dao.save(tenantId, entity)` etc.
- Services never interact with JPA entities directly -- only the DAO layer is aware of the entity/DTO mapping.

## Related Documents

- [Entity DAO Catalog](entity-dao.md) -- detailed catalog of all entity DAOs
- [SQL Schema & Migration](sql-schema.md) -- database schema and upgrade system
- [Rule Engine Architecture](../30-rule-engine/README.md) -- how rule chains use DAOs behind the scenes
