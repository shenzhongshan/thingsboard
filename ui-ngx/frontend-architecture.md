# ThingsBoard CE 前端技术架构与功能架构分析

## 一、技术架构总览

### 1.1 核心技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Angular | 20.3 |
| UI 组件库 | Angular Material + CDK | 20.2 |
| 语言 | TypeScript | 5.9 |
| 响应式编程 | RxJS | 7.8 |
| 状态管理 | @ngrx/store + @ngrx/effects | 20.1 |
| 国际化 | @ngx-translate/core + @messageformat/core (ICU) | 17.0 / 3.4 |
| 图表 | ECharts (定制版) + Flot | 5.5.2-TB / 0.9-work |
| 地图 | Leaflet + MapLibre GL | 1.9.4 / 5.2.0 |
| 富文本 | TinyMCE + Ace Editor + ngx-markdown | 6.8 / 1.43 / 16.4 |
| 拖拽布局 | angular-gridster2 | 20.2 |
| 流程图 | ngx-flowchart (定制) | 4.1.0 |
| 构建工具 | Angular CLI + esbuild (custom-esbuild) | 20.3 / 0.28 |
| 样式 | SCSS + TailwindCSS 3.4 | — |
| 包管理 | Yarn | — |

### 1.2 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│                      AppModule                              │
│  (BrowserModule, BrowserAnimationsModule, 根路由, 启动组件)  │
├─────────────────────────────────────────────────────────────┤
│  CoreModule (单例, forRoot 模式)                             │
│  ┌──────────┬──────────┬───────────┬──────────┬──────────┐  │
│  │  Auth    │  HTTP    │  Guards   │ Intercep │  State   │  │
│  │  认证服务 │  拦截器   │  路由守卫  │  全局拦截 │  (ngrx)  │  │
│  ├──────────┼──────────┼───────────┼──────────┼──────────┤  │
│  │ i18n    │  WebSocket│ Settings │ Notific  │  Menu    │  │
│  │ 翻译加载 │  实时通信  │  系统设置  │  通知中心 │  菜单服务  │  │
│  └──────────┴──────────┴───────────┴──────────┴──────────┘  │
├─────────────────────────────────────────────────────────────┤
│  SharedModule (导入并导出所有共享组件/Pipe/Directive/模块)     │
│  ┌──────────┬──────────┬───────────┬──────────┬──────────┐  │
│  │ Entity   │  Time    │  Dialog   │  Value   │  Image   │  │
│  │ 实体选择器│ 时间窗口  │  对话框    │  值输入   │  图片处理  │  │
│  ├──────────┼──────────┼───────────┼──────────┼──────────┤  │
│  │  Pipe    │Directive │  Button   │  Color   │  Import  │  │
│  │  管道     │  指令    │  按钮组件  │  颜色选择  │  导入导出  │  │
│  └──────────┴──────────┴───────────┴──────────┴──────────┘  │
├─────────────────────────────────────────────────────────────┤
│  LoginModule / HomeModule / DashboardModule (惰性加载)       │
│                                                             │
│  HomeModule                                                 │
│  ├── SideMenu (侧边菜单 + 菜单服务动态生成)                    │
│  └── HomePagesModule (惰性加载, 32 个页面子模块)              │
│      ├── Entity Table Pages (28+ 类型, 统一表格模式)          │
│      ├── Rule Chain Designer (规则链可视化编辑器)              │
│      ├── Dashboard Pages (仪表板管理)                         │
│      ├── Widget Library (部件库编辑器)                        │
│      ├── Settings Forms (各类设置表单)                        │
│      └── ...                                                │
│                                                             │
│  DashboardModule (独立惰性加载, 用于仪表板查看)                │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 构建与配置

- **构建器**: `@angular-builders/custom-esbuild:application`（替换默认 Webpack 构建器）
- **自定义 esbuild 插件**: `esbuild/tb-esbuild-plugins.ts`
- **代理配置**: `proxy.conf.js` (将 `/api` 代理到后端)
- **HTML Fallback 中间件**: `esbuild/tb-html-fallback-middleware.ts`
- **环境配置**: `src/environments/environment.ts` (dev) / `environment.prod.ts` (prod)
- **路径别名**: `@app`, `@core`, `@modules`, `@home`, `@shared`, `@env`

---

## 二、核心层架构 (CoreModule)

CoreModule 在 `AppModule` 中通过 `imports` 引入，全局单例。管理所有跨模块共享的核心服务。

### 2.1 状态管理 (ngrx Store)

**全局 State 结构** (`AppState`):

| State Key | 类型 | 说明 |
|-----------|------|------|
| `load` | `LoadState` | 全局加载状态 (HTTP 请求计数器) |
| `auth` | `AuthState` | 认证状态 (用户信息、JWT、权限、系统参数) |
| `settings` | `SettingsState` | 用户界面设置 (语言、主题等) |
| `notification` | `NotificationState` | 全局通知状态 |

**Effects**: `AuthEffects`, `SettingsEffects`, `NotificationEffects`

**MetaReducers**: `initStateFromLocalStorage` (从 localStorage 恢复状态), `storeFreeze` (dev), `debug` (dev)

**AuthState 核心字段**:
- `isAuthenticated: boolean` — 是否已登录
- `isUserLoaded: boolean` — 用户信息是否加载完成
- `authUser: AuthUser` — JWT 令牌及权限信息
- `userDetails: User` — 用户详细信息 (角色、租户、客户)
- `userTokenAccessEnabled`, `edgesSupportEnabled`, `tbelEnabled` 等 — 系统级功能开关
- `userSettings: UserSettings` — 用户 UI 偏好

### 2.2 HTTP 通信层

#### HTTP 服务 (`core/http/`)

按实体类型组织，每个实体一个服务类，共 44 个服务文件：

| 类别 | 服务 |
|------|------|
| 设备 & 资产 | `DeviceService`, `AssetService`, `DeviceProfileService`, `AssetProfileService` |
| 租户 & 客户 | `TenantService`, `TenantProfileService`, `CustomerService` |
| 用户 & 权限 | `UserService`, `ApiKeyService`, `TwoFactorAuthenticationService` |
| 仪表板 | `DashboardService`, `WidgetService` |
| 规则引擎 | `RuleChainService`, `ComponentDescriptorService` |
| 告警 | `AlarmService`, `AlarmCommentService`, `AlarmRulesService` |
| 通知 | `NotificationService` |
| 边缘计算 | `EdgeService` |
| 数据 | `AttributeService`, `EntityRelationService`, `EventService` |
| OTA | `OtaPackageService` |
| 管理 | `AdminService`, `QueueService`, `AuditLogService` |
| 版本控制 | `EntitiesVersionControlService` |
| 其他 | `ResourceService`, `AiModelService`, `OAuth2Service`, `DomainService`, `ImageService` 等 |

#### HTTP 工具函数 (`http-utils.ts`)

提供统一的 HTTP 请求配置机制：

```typescript
interface RequestConfig {
  ignoreLoading?: boolean;   // 忽略全局 loading 指示器
  ignoreErrors?: boolean;    // 忽略全局错误弹出
  resendRequest?: boolean;   // 失败后重发
  queryParams?: QueryParams; // URL 查询参数
}
```

关键函数: `defaultHttpOptions()`, `defaultHttpUploadOptions()`

#### 拦截器链 (`core/interceptors/`)

| 拦截器 | 职责 |
|--------|------|
| `GlobalHttpInterceptor` | 全局请求/响应拦截: 添加 JWT token、管理 loading 状态 (`LoadActions`)、全局错误处理 (`NotificationActions`)、重发机制 |
| `EntityConflictInterceptor` | 处理实体并发冲突 (版本控制场景) |

#### 拦截器工具

- `InterceptorHttpParams` — 扩展 `HttpParams`，携带 `InterceptorConfig`（ignoreLoading/ignoreErrors/resendRequest）
- `InterceptorConfig` — 拦截器配置数据类
- `load.actions/models/reducer/selectors` — loading 状态的 ngrx 管理

### 2.3 认证与授权

#### 认证流程 (`core/auth/`)

1. **启动阶段** (`AppComponent.setupAuth()`): 从 ngrx store 检测 `isUserLoaded`，调用 `AuthService.reloadUser()` 尝试恢复登录状态
2. **JWT 验证**: 使用 `@auth0/angular-jwt` 库解析和验证 JWT token
3. **路由守卫**: `AuthGuard` 检查认证状态，未登录重定向到 `/login`
4. **权限控制**: 基于 `Authority` 枚举 (`SYS_ADMIN`, `TENANT_ADMIN`, `CUSTOMER_USER`) 进行菜单和页面权限过滤

#### 路由守卫 (`core/guards/`)

| 守卫 | 职责 |
|------|------|
| `AuthGuard` | 检查 `isAuthenticated`，未认证跳转 `/login` |
| `ConfirmOnExitGuard` | 表单未保存时弹出确认提示（用于 Settings 页面） |

### 2.4 WebSocket 实时通信 (`core/ws/`)

`WebsocketService<T>` 是一个抽象基类，提供：

- **自动重连**机制 (2s 起步，最大 60s，指数退避)
- **心跳保活** (90s 空闲超时)
- **命令队列**: 批量发布命令（最多 10 个一批）
- **双订阅模式**: `TelemetrySubscriber` (遥测数据) 和 `NotificationSubscriber` (通知推送)
- **NgZone 优化**: 在 Angular Zone 外运行 WebSocket 以避免触发不必要的变更检测

### 2.5 国际化

- **翻译加载器**: `TranslateDefaultLoader` — 从 `/assets/locale/locale.constant-{lang}_{REGION}.json` 加载
- **编译器**: `TranslateDefaultCompiler` — 支持 ICU MessageFormat
- **解析器**: `TranslateDefaultParser`
- **缺失翻译处理**: `TbMissingTranslationHandler`
- **28 个语言区域**: en_US, zh_CN, ja_JP, ko_KR, de_DE, fr_FR, es_ES, it_IT 等

### 2.6 菜单系统 (`core/services/menu.service.ts`)

- 根据当前用户权限 (`Authority`) 动态构建菜单树
- 菜单项类型: `link` (页面链接), `toggle` (展开/折叠组)
- 支持 `isMdi` 图标标记（Material Design Icons）
- 与 `SideMenuComponent` 配合渲染左侧导航

---

## 三、共享组件层 (SharedModule)

### 3.1 组件分类

#### 实体选择器组 (`shared/components/entity/`)

| 组件 | 用途 |
|------|------|
| `tb-entity-autocomplete` | 单个实体搜索自动完成 |
| `tb-entity-select` | 实体下拉选择 |
| `tb-entity-list` | 多实体标签列表 |
| `tb-entity-list-select` | 多实体下拉选择 |
| `tb-entity-type-select` | 实体类型选择 |
| `tb-entity-subtype-select` | 实体子类型选择 |
| `tb-entity-gateway-select` | 网关设备选择 |
| `tb-entity-key-autocomplete` | 实体属性/遥测 Key 自动完成 |

#### 时间组件组 (`shared/components/time/`)

| 组件 | 用途 |
|------|------|
| `tb-timewindow` | 时间窗口选择器 (实时/历史/自定义) |
| `tb-datetime` | 日期时间选择 |
| `tb-datetime-period` | 日期范围选择器 |
| `tb-timeinterval` | 时间间隔输入 |
| `tb-quick-time-interval` | 快速时间间隔预设 |
| `tb-history-selector` | 历史时间导航 |
| `tb-timezone-select` | 时区选择 |
| `tb-datapoints-limit` | 数据点数限制 |
| `tb-aggregation-type-select` | 聚合类型选择 (AVG/SUM/MIN/MAX等) |

#### 对话框组 (`shared/components/dialog/`)

| 组件 | 用途 |
|------|------|
| `tb-confirm-dialog` | 确认/取消对话框 |
| `tb-alert-dialog` | 信息提示对话框 |
| `tb-error-alert-dialog` | 错误提示对话框 |
| `tb-color-picker-dialog` | 颜色选择对话框 |
| `tb-material-icons-dialog` | Material 图标浏览器 |
| `tb-node-script-test-dialog` | 规则节点脚本测试 |
| `tb-json-object-edit-dialog` | JSON 对象编辑对话框 |
| `tb-todo-dialog` | 待办清单对话框 |

#### 值/数据输入组

| 组件 | 用途 |
|------|------|
| `tb-value-input` | 通用值输入 (支持类型切换) |
| `tb-unit-input` | 带测量单位的数值输入 |
| `tb-color-input` | 颜色输入 |
| `tb-color-picker` | 内联颜色选择器 |
| `tb-json-object-edit` | 可编辑 JSON 对象 |
| `tb-json-content` | JSON 语法高亮显示 |
| `tb-markdown` / `tb-markdown-editor` | Markdown 渲染/编辑 |
| `tb-key-val-map` | 键值对编辑器 |
| `tb-phone-input` | 国际电话号码输入 |
| `tb-file-input` | 文件上传 |

#### 图片处理组 (`shared/components/image/`)

| 组件 | 用途 |
|------|------|
| `tb-image-gallery` | 图片网格展示 |
| `tb-image-input` | 单图片上传 |
| `tb-gallery-image-input` | 从图库选择图片 |
| `tb-multiple-gallery-image-input` | 多图片选择 |
| `tb-scada-symbol-input` | SCADA 符号选择 |

#### 仪表板相关

| 组件 | 用途 |
|------|------|
| `tb-dashboard-autocomplete` | 仪表板搜索选择 |
| `tb-dashboard-select` | 仪表板下拉选择 |
| `tb-dashboard-state-autocomplete` | 仪表板状态选择 |

### 3.2 管道 (Pipes)

| 管道 | 功能 |
|------|------|
| `nospace` | 移除字符串空格 |
| `millisecondsToTimeString` | 毫秒转可读时间字符串 |
| `enumToArray` | 枚举转数组 |
| `highlight` | 文本高亮 |
| `truncate` | 文本截断 |
| `tbJson` | JSON 格式化输出 |
| `fileSize` | 文件大小格式化 |
| `dateAgo` | 相对时间显示 ("3分钟前") |
| `shortNumber` | 大数字缩写 (1.2K, 3.4M) |
| `safe` | 信任 HTML/URL/Resource URL |
| `image` | 图片 URL 处理 |
| `customTranslate` | 自定义翻译 |
| `durationLeft` | 剩余时长显示 |
| `dateExpiration` | 过期日期显示 |
| `keyboardShortcut` | 键盘快捷键格式化 |
| `selectableColumns` | 可选列过滤 |

### 3.3 指令 (Directives)

| 指令 | 功能 |
|------|------|
| `tb-hotkeys` | 全局快捷键绑定 |
| `tb-json-to-string` | JSON 对象转字符串 |
| `truncate-with-tooltip` | 截断文本 + tooltip |
| `context-menu` | 右键菜单 |
| `fullscreen` | 全屏切换 |
| `circular-progress` | 圆形进度指示 |
| `tb-popover` | 弹出框 |
| `tb-string-template-outlet` | 字符串模板渲染 |
| `tb-component-outlet` | 动态组件渲染 |

---

## 四、功能架构 — 页面层

### 4.1 路由架构

```
/ (根路径)
├── /login                      → LoginModule (非惰性, 未认证用户)
│   ├── /login                  → LoginComponent
│   ├── /login/resetPasswordRequest
│   ├── /login/resetPassword
│   ├── /login/createPassword
│   └── /login/mfa              → TwoFactorAuthLoginComponent
│
├── /home                       → HomeModule → HomePagesModule (惰性加载, AuthGuard)
│   ├── /home                   → HomeLinksComponent (仪表板快捷入口)
│   │
│   ├── [SYS_ADMIN 专属]
│   │   ├── /tenants            → Tenant 管理 (Entity Table)
│   │   ├── /tenants/:id        → Tenant 详情
│   │   ├── /tenantProfiles     → 租户配置文件管理
│   │   ├── /settings/*         → 系统设置 (通用/邮件/短信/队列)
│   │   └── /security-settings/* → 安全设置 (2FA/OAuth2/审计日志)
│   │
│   ├── [TENANT_ADMIN 专属]
│   │   ├── /entities/devices   → 设备管理
│   │   ├── /entities/assets    → 资产管理
│   │   ├── /entities/entityViews → 实体视图
│   │   ├── /profiles/deviceProfiles → 设备配置文件
│   │   ├── /profiles/assetProfiles  → 资产配置文件
│   │   ├── /customers/*        → 客户管理
│   │   ├── /ruleChains/*       → 规则链设计器
│   │   ├── /dashboards/*       → 仪表板管理
│   │   ├── /edgeManagement/*   → 边缘实例管理
│   │   ├── /features/otaUpdates → OTA 固件升级
│   │   ├── /features/vc        → 版本控制
│   │   ├── /calculatedFields   → 计算字段
│   │   ├── /settings/home      → 租户设置
│   │   ├── /settings/ai-models → AI 模型管理
│   │   └── /resources/*        → 资源库 (部件库/图片/JS库)
│   │
│   ├── [所有角色]
│   │   ├── /account/profile    → 个人资料
│   │   ├── /account/security   → 安全设置
│   │   ├── /notification/*     → 通知中心
│   │   ├── /alarms             → 告警中心
│   │   └── /mobile-center/*    → 移动端管理中心
│   │
│   └── /usage                  → API 使用统计 (TENANT_ADMIN)
│
├── /dashboard/:dashboardId     → DashboardModule (惰性, 独立路由)
├── /dashboard/:dashboardId/:state/:entityId → 带参数的仪表板
│
└── **                          → 重定向 /home
```

### 4.2 统一实体表格模式 (Entity Table Pattern)

这是前端最核心的设计模式，28+ 个实体管理页面均遵循此模式。

#### 三层文件结构

```
pages/<entity>/
├── <entity>-table-config.resolver.ts  — 表格配置解析器 (列/操作/子组件定义)
├── <entity>.component.ts + .html      — 实体详情表单 (继承 EntityComponent<T>)
└── <entity>-tabs.component.ts + .html — 额外标签页 (属性/关系/事件/告警等)
```

#### 框架核心组件

| 组件 | 职责 |
|------|------|
| `EntitiesTableComponent` | 通用表格: 列渲染、排序、分页、行选择、批量操作、搜索 |
| `EntityDetailsPageComponent` | 全页实体详情: 工具栏 + 标签页组 |
| `EntityDetailsPanelComponent` | 滑出式抽屉面板: 从表格右侧滑入查看/编辑 |
| `EntityComponent<T>` | 抽象基类: `buildForm()`, `updateForm()`, `entityFormValue()`, 表单状态管理 |

#### TableConfigResolver 返回值

```typescript
EntityTableConfig<T> {
  entityType: EntityType;           // 实体类型枚举
  columns: EntityColumn[];          // 列定义 (标题key, 属性/模板, 宽度, 排序)
  cellActionDescriptors[];          // 行级操作按钮
  groupActionDescriptors[];         // 批量操作按钮 (选中多行)
  headerActionDescriptors[];        // 工具栏按钮 (新增/导入/刷新)
  entityComponent: Type<EntityComponent<T>>;  // 详情表单组件
  entityTabsComponent: Type<any>;   // 标签页组件
  addDialogComponent?: Type<any>;   // 新增对话框
}
```

#### 详情页标签页结构

每个实体详情页包含标准标签页:
1. **Details** — 实体表单 (名称/标签/类型/描述等基本属性)
2. **Attributes** — 属性表 (服务端/共享/客户端属性的 key-value)
3. **Latest Telemetry** — 最新遥测数据
4. **Relations** — 实体关系管理
5. **Events** — 事件日志 (生命周期/统计/错误事件)
6. **Alarms** — 关联告警
7. **Audit Logs** — 审计日志 (部分实体)

### 4.3 规则链设计器 (Rule Chain Designer)

这是前端最复杂的功能模块之一，位于 `pages/rulechain/`。

**核心组件**:
- `RuleChainPageComponent` — 规则链编辑器主页面 (Canvas 画布)
- `RuleNodeComponent` — 单个规则节点渲染 (位置/尺寸/连接点)
- `RuleNodeLinkComponent` — 节点间连线
- `RuleNodeDetailsComponent` — 节点详情面板 (配置表单)
- `RuleNodeConfigComponent` — 节点配置表单 (动态表单 + 脚本编辑器)
- `AddRuleNodeDialogComponent` — 添加节点对话框 (按类型搜索/浏览)
- `RuleNoteEditorComponent` — 节点备注编辑器

**技术特点**:
- 基于 `ngx-flowchart` (定制版) 实现流程图 Canvas
- 节点之间通过连线表示消息路由关系
- 支持嵌套规则链 (Create Nested RuleChain)
- 脚本节点使用 Ace Editor 编辑
- 支持 Debug 模式实时调试

### 4.4 仪表板系统 (Dashboard System)

仪表板系统分为两个模块:
- **Dashboard 管理页** (`pages/dashboard/`): 仪表板 CRUD、公开/私有设置、客户分配
- **Dashboard 查看/编辑** (`DashboardModule` 独立惰性加载): 全功能仪表板渲染

**仪表板核心组件 (`@home/components/`)**:
| 组件 | 用途 |
|------|------|
| `DashboardComponent` | 仪表板主渲染器 (布局/部件容器管理) |
| `DashboardPageComponent` | 仪表板页面 (工具栏 + Dashboard) |
| `DashboardToolbarComponent` | 编辑/查看模式工具栏 |
| `EditWidgetComponent` | 部件编辑器 (数据源/配置/操作) |

### 4.5 部件系统 (Widget System)

部件系统是仪表板的核心，位于 `home/components/widget/`。

#### 部件容器架构

```
WidgetContainerComponent       — 单个部件的容器 (边框/标题栏/操作按钮)
  └── WidgetComponent           — 部件内容渲染器 (根据类型动态渲染)
       └── DynamicWidgetComponent — 动态加载自定义部件 (SystemJS)
       └── lib/*                 — 内置部件类型实现
```

#### 内置部件类型 (`widget/lib/`)

| 分类 | 部件类型 | 说明 |
|------|---------|------|
| **图表** | `flot-widget` | 基于 Flot 的时序折线图/柱状图 |
| | `timeseries-table-widget` | 时序数据表格 |
| | `chart/` | ECharts 图表 (支持丰富的图表类型) |
| **仪表盘** | `analogue-gauge` | 模拟指针仪表 |
| | `analogue-radial-gauge` | 径向仪表 |
| | `analogue-linear-gauge` | 线性仪表 |
| | `analogue-compass` | 罗盘仪表 |
| | `digital-gauge` | 数字仪表 |
| | `canvas-digital-gauge` | Canvas 数字仪表 |
| **卡片** | `cards/` | 各类信息卡片 (实体卡片/摘要卡片) |
| **控制** | `button/` | 按钮部件 (RPC 控制/导航) |
| | `indicator/` | 状态指示器 |
| | `switch/` | 开关控制 |
| | `rpc/` | RPC 命令部件 (开关/旋钮/滑块等) |
| **输入** | `json-input-widget` | JSON 数据输入 |
| | `multiple-input-widget` | 多值输入 |
| | `photo-camera-input` | 拍照输入 |
| **显示** | `html/` | HTML 渲染部件 |
| | `markdown-widget` | Markdown 渲染 |
| | `qrcode-widget` | 二维码显示 |
| | `table-widget` | 通用数据表格 |
| **地图** | `maps/` | MapLibre GL 地图 |
| | `maps-legacy/` | Leaflet 地图 (遗留) |
| **告警** | `alarm/` | 告警列表部件 |
| **导航** | `navigation-cards-widget` | 导航卡片 |
| | `navigation-card-widget` | 单个导航卡片 |
| **其他** | `home-page/` | 首页部件 |
| | `edges-overview-widget` | 边缘概览 |
| | `scada/` | SCADA 可视化部件 |
| | `trip-animation/` | 轨迹动画 |
| | `count/` | 计数部件 |
| | `date-range-navigator/` | 日期范围导航 |
| | `weather/` | 天气部件 |
| | `settings/` | 设置部件 |

#### 数据订阅层 (`core/api/`)

```
WidgetSubscription          — 管理部件与数据源的订阅关系
  ├── EntityDataService     — 通过 WebSocket 订阅遥测/属性数据
  ├── EntityDataSubscription— 单个实体数据订阅
  ├── AlarmDataService      — 告警数据订阅
  ├── AlarmDataSubscription — 告警数据订阅实例
  └── AliasController       — 实体别名解析控制器
```

#### 小部件 API 接口 (`IWidgetSubscription`, `widget-api.models.ts`)

提供给部件开发者使用的 API 包括:
- **数据访问**: `createSubscription()`, `subscribe()`, `subscriptionData$`
- **RPC 调用**: `sendOneWayCommand()`, `sendTwoWayCommand()`
- **时间窗口**: `timeWindowFunctions`, `onUpdateTimewindow()`
- **工具方法**: `formatValue()`, `getEntityDetailsPageURL()`
- **HTTP 工具**: `defaultHttpOptions()`, 各类 HTTP 请求方法

---

## 五、关键设计模式

### 5.1 响应式表单模式

所有实体表单继承 `EntityComponent<T>` 抽象指令：

```
buildForm(entity)     → 创建 FormGroup + 控件 + 验证器
updateForm(entity)    → patchValue() 填充数据
updateFormState()     → enable/disable 切换编辑态
entityFormValue()     → getRawValue() → deepTrim
```

模板模式: `<fieldset [disabled]="isEntityReadonly">` + `formGroup`

### 5.2 惰性加载策略

- `HomePagesModule`: 32 个独立页面模块全部惰性加载
- `DashboardModule`: 独立路由独立惰性加载模块
- 规则链编辑器按需加载
- 每个实体表格/详情/标签页编译为独立 chunk

### 5.3 拦截器管道

```
HTTP Request
  → InterceptorHttpParams 注入配置 (ignoreLoading/ignoreErrors/resendRequest)
  → GlobalHttpInterceptor:
      request(): 添加 JWT token → 增加 loading 计数
      response(): 减少 loading 计数
      responseError(): 全局错误弹出 / 自动重发
  → EntityConflictInterceptor:
      检测 409 Conflict → 弹出版本冲突提示
  → HTTP Response
```

### 5.4 菜单动态构建

```
MenuService.buildMenu()
  根据用户 Authority 过滤菜单项
  → SYS_ADMIN: 系统设置、租户管理
  → TENANT_ADMIN: 实体管理、规则引擎、仪表板、边缘
  → CUSTOMER_USER: 仪表板、告警、实体查看
  
SideMenuComponent 递归渲染 (<tb-menu-link> / <tb-menu-toggle>)
```

### 5.5 URL 序列化

自定义 `TbUrlSerializer` 处理 URL 中括号编码：( → %28, ) → %29，确保仪表板状态 URL 中括号正常工作。

---

## 六、前端功能全景图

```
ThingsBoard CE 前端功能模块
│
├── 身份认证
│   ├── 用户名/密码登录
│   ├── 密码重置/创建
│   ├── 双因素认证 (2FA/TOTP)
│   └── OAuth2 第三方登录
│
├── 实体管理 (统一表格+详情+标签页模式)
│   ├── 设备 (Device)
│   ├── 资产 (Asset)
│   ├── 实体视图 (Entity View)
│   ├── 客户 (Customer)
│   ├── 用户 (User)
│   ├── 租户 (Tenant, SYS_ADMIN)
│   ├── 设备配置文件 (Device Profile)
│   ├── 资产配置文件 (Asset Profile)
│   ├── 租户配置文件 (Tenant Profile, SYS_ADMIN)
│   ├── 边缘实例 (Edge)
│   ├── AI 模型 (AI Model)
│   └── 计算字段 (Calculated Field)
│
├── 规则引擎
│   ├── 规则链列表管理
│   ├── 规则链可视化设计器 (DAG 流程图)
│   ├── 规则节点配置 (100+ 内置节点)
│   ├── 规则链调试 (Debug Mode)
│   └── 嵌套规则链
│
├── 仪表板
│   ├── 仪表板 CRUD 管理
│   ├── 仪表板编辑器 (拖拽布局)
│   ├── 部件配置 (数据源/操作/外观)
│   ├── 仪表板状态管理
│   ├── 公开仪表板 (Public Dashboard)
│   └── 40+ 内置部件类型
│
├── 告警中心
│   ├── 告警表格 (筛选/搜索/分页)
│   ├── 告警详情 (确认/清除/分配/评论)
│   └── 告警规则配置
│
├── 资源库
│   ├── 部件库 (Widgets Bundle)
│   ├── 部件类型编辑器
│   ├── 图片库 (Image Gallery)
│   ├── SCADA 符号库
│   ├── JS 函数库
│   └── 通用资源库
│
├── 通知中心
│   ├── 收件箱 (Inbox)
│   ├── 已发送 (Sent)
│   ├── 接收者管理 (Recipients)
│   ├── 模板管理 (Templates)
│   └── 规则管理 (Rules)
│
├── 移动端管理中心
│   ├── 移动端应用管理
│   ├── 移动端 Bundle 管理
│   └── QR 码生成
│
├── 系统设置
│   ├── 通用设置 (SYS_ADMIN)
│   ├── 邮件服务器
│   ├── 短信服务商
│   ├── 消息队列管理
│   ├── 安全设置 (2FA/OAuth2)
│   ├── 审计日志
│   ├── 版本控制 (Git 仓库集成)
│   ├── 自动提交设置
│   └── 租户首页设置
│
├── API 使用统计
│   └── 仪表板形式展示 API 调用统计
│
└── 个人中心
    ├── 个人资料编辑
    └── 安全设置 (密码修改/MFA)
```

---

## 七、技术依赖全景

### 可视化 & 图表
| 库 | 用途 |
|---|------|
| ECharts 5.5.2 (定制版) | 时序图表、柱状图、饼图、热力图等 |
| Flot (定制版) | 经典折线图/柱状图 |
| Canvas Gauges | Canvas 仪表盘 |
| @svgdotjs/svg.js | SVG 绘图库 |
| Leaflet 1.9 | 遗留地图组件 |
| MapLibre GL 5.2 | 现代矢量地图 |

### 编辑器
| 库 | 用途 |
|---|------|
| Ace Editor 1.43 | 代码编辑器 (JS/JSON/CSS/HTML/TBEL) |
| TinyMCE 6.8 | 富文本编辑器 |
| ngx-markdown | Markdown 渲染 |

### 交互 & 布局
| 库 | 用途 |
|---|------|
| angular-gridster2 | 网格拖拽布局 (仪表板) |
| ngx-flowchart (定制) | 流程图 (规则链) |
| ngx-drag-drop | 拖拽功能 |
| Split.js | 可拖拽分割面板 |
| angular2-hotkeys | 键盘快捷键 |

### 工具库
| 库 | 用途 |
|---|------|
| dayjs + moment | 日期时间处理 |
| tinycolor2 | 颜色计算 |
| js-beautify | 代码格式化 |
| jszip | ZIP 压缩 |
| qrcode | 二维码生成 |
| html2canvas | 截图 |
| marked | Markdown 解析 |
| systemjs | 动态模块加载 (自定义部件) |

---

## 八、国际化覆盖

支持 28 个语言区域，翻译键组织在 `src/assets/locale/locale.constant-{lang}_{REGION}.json` 中。使用 `@ngx-translate/core` + `@messageformat/core` (ICU 消息格式) 处理复数、性别等复杂翻译场景。

---

## 九、代码规模估算

| 层级 | 估算文件数 | 说明 |
|------|-----------|------|
| Core (核心服务) | ~80 | HTTP 服务 44 + Interceptor 6 + Auth 10 + 其他 |
| Shared (共享组件) | ~200 | 组件 120+ + Pipe 15 + Directive 10 |
| Pages (页面) | ~500+ | 32 个页面模块, 每个 10-20 文件 |
| Widgets (部件) | ~200+ | 40+ 部件类型, 每个 2-5 文件 |
| Models (模型) | ~80 | TypeScript 接口/类型/枚举 |
| 总计 | ~1000+ | TypeScript + HTML + SCSS 文件 |

---

文档生成日期: 2026-06-16
