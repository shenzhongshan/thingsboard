# Common Cache (`common/cache`)

**Maven artifact:** `org.thingsboard.common:cache`

The `common/cache` module provides a caching abstraction layer with dual-backend support: Caffeine (in-process) and Redis/Valkey (distributed). It includes per-entity cache implementations, transactional cache semantics, versioned cache entries for consistency, and rate-limiting services.

## Architecture

### Two-Backend Design

The module supports two cache backends, selectable by configuration:

| Backend | Use Case | Implementation |
|---------|----------|---------------|
| Caffeine | Single-node, low-latency | `CaffeineTbTransactionalCache`, `VersionedCaffeineTbCache` |
| Redis | Multi-node cluster, shared cache | `RedisTbTransactionalCache`, `VersionedRedisTbCache` |

Caffeine is the default. Redis is activated when `cache.type=redis` in application properties. Redis operations are wrapped in transactions (`RedisTbCacheTransaction` / `CaffeineTbCacheTransaction`).

### Core Cache Interfaces

| Interface/Class | Purpose |
|----------------|---------|
| `TbTransactionalCache<K,V>` | Key-value store with transactional semantics (get, put, evict) |
| `VersionedTbCache<K,V>` | Cache with version tracking for stale-entry detection |
| `TbCacheTransaction<K,V>` | Committable/rollbackable cache transaction |
| `TbCacheValueWrapper<V>` | Optional-like wrapper for cache values (allows null vs absent distinction) |
| `CacheSpecs` | Per-entity cache specification (TTL, max size, etc.) |
| `CacheSpecsMap` | Registry of cache specifications keyed by cache name |

### Redis Configuration

Redis connection modes are supported through dedicated configuration classes:

| Class | Mode |
|-------|------|
| `TBRedisStandaloneConfiguration` | Single Redis instance |
| `TBRedisClusterConfiguration` | Redis Cluster |
| `TBRedisSentinelConfiguration` | Redis Sentinel (high availability) |
| `TBRedisCacheConfiguration` | Base Redis config (SSL, pool settings) |

Redis SSL/TLS is supported via `RedisSslCredentials`.

### Redis Serialization

Two serializer strategies convert Java objects to/from Redis byte arrays:

| Serializer | Format | Use Case |
|-----------|--------|----------|
| `TbJavaRedisSerializer` | Java serialization | Internal Java objects |
| `TbJsonRedisSerializer` | JSON (Jackson) | POJOs, DTOs |
| `TbTypedJsonRedisSerializer<T>` | Typed JSON | Type-safe JSON deserialization with Class<T> |

### Versioned Cache

`VersionedTbCache` extends basic caching with version-based consistency. Each cached entry has an associated version. When the version retrieved from cache is older than the expected version, the entry is considered stale and the caller re-fetches from the database. This avoids cache invalidation race conditions in distributed scenarios.

```java
public interface VersionedTbCache<K, V> {
    CacheValueWrapper<V> get(K key);
    void put(K key, V value);
    void evict(K key);
    // Version tracking handled internally
}
```

## Per-Entity Cache Implementations

Each major entity type has dedicated cache implementations, providing type-safe cache keys and eviction events for cluster broadcast:

| Entity | Caffeine Impl | Redis Impl | Key Class |
|--------|-------------|------------|-----------|
| Device | `DeviceCaffeineCache` | `DeviceRedisCache` | `DeviceCacheKey` |
| Customer | `CustomerCaffeineCache` | `CustomerRedisCache` | `CustomerCacheKey` |
| User | `UserCaffeineCache` | `UserRedisCache` | `UserCacheKey` |
| Edge | `EdgeCaffeineCache` | `EdgeRedisCache` | `EdgeCacheKey` |
| Related Edges | `RelatedEdgesCaffeineCache` | `RelatedEdgesRedisCache` | `RelatedEdgesCacheKey` |
| OTA Package | `CaffeineOtaPackageCache` | `RedisOtaPackageDataCache` | (built-in) |
| Resource Info | `ResourceInfoCaffeineCache` | `ResourceInfoRedisCache` | `ResourceInfoCacheKey` |
| Users Update Time | `UsersSessionInvalidationCaffeineCache` | `UsersSessionInvalidationRedisCache` | (internal) |

Each entity cache has a corresponding `EvictEvent` that is broadcast cluster-wide via the queue system when an entity is updated or deleted.

### Cache Eviction Events

| Event | Trigger |
|-------|---------|
| `DeviceCacheEvictEvent` | Device update/delete |
| `CustomerCacheEvictEvent` | Customer update/delete |
| `UserCacheEvictEvent` | User update/delete |
| `EdgeCacheEvictEvent` | Edge update/delete |
| `RelatedEdgesEvictEvent` | Edge assignment change |
| `ResourceInfoEvictEvent` | Resource update/delete |

## Rate Limiting

The `limits/` subpackage provides rate-limiting support:

| Class | Purpose |
|-------|---------|
| `RateLimitService` | Interface for rate-limit checks |
| `DefaultRateLimitService` | Implementation using tenant profile limits |
| `TenantProfileProvider` | Provides tenant profile for limit lookup |

## Cache Key Patterns

Cache keys are composite objects (e.g., `DeviceCacheKey` wraps `DeviceId`). Keys implement `equals()`/`hashCode()` for proper cache lookup. Versioned cache keys extend this with a version component (`VersionedCacheKey`).

## Relationships

- **Depends on:** `common/data` (for entity IDs, models), Caffeine, Spring Data Redis
- **Depended on by:** `dao`, `application` (services that need caching)
- **Maven groupId:** `org.thingsboard.common`
- **Maven artifactId:** `cache`
