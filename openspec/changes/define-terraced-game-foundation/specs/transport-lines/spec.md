# Spec Delta

## Purpose

定义从一个生产或仓储节点到另一个节点的运输线，使玩家能分配搬运工人、查看实际路线，并在道路变化后获得可理解的线路状态。

## ADDED Requirements

### Requirement: Transport line has one source and one destination

首版运输线 SHALL 由一个起点节点和一个终点节点组成；起点与终点 SHALL 是可参与搬运的工作地点或仓储节点。

#### Scenario: Create point-to-point line
- **WHEN** 玩家选择有效起点和终点并创建运输线
- **THEN** 系统建立一条唯一的单起点到单终点运输线

#### Scenario: Invalid endpoint is rejected
- **WHEN** 起点或终点不是可参与搬运的节点
- **THEN** 运输线创建失败且不产生路线或工人分配

### Requirement: Route is calculated automatically

系统 SHALL 根据起点、终点、移动主体能力、地形、道路和高度连接自动计算运输线；玩家不需要逐格绘制路线。

#### Scenario: Route uses available connections
- **WHEN** 起点和终点之间存在符合分配工人能力的道路、攀爬、楼梯或斜坡连接
- **THEN** 系统生成一条可执行的逻辑路线

#### Scenario: No route is reported
- **WHEN** 没有满足条件的完整路线
- **THEN** 运输线进入不可达或阻塞状态，并提供原因

### Requirement: Assigned workers follow the line

运输线 SHALL 允许分配一个或多个符合能力的工人；被分配的工人 SHALL 按路线执行取货、搬运和交付任务。

#### Scenario: Assign worker to line
- **WHEN** 玩家把空闲且符合能力的工人分配到有效运输线
- **THEN** 工人加入运输线岗位并开始按照路线执行任务

#### Scenario: Incompatible worker is rejected
- **WHEN** 玩家尝试分配无法到达线路端点或不满足搬运要求的工人
- **THEN** 分配失败，工人和运输线的原状态保持不变

### Requirement: Displayed line matches logical route

系统 SHALL 在运输线激活后显示其逻辑路线；显示结果 SHALL 包含路线实际经过的水平道路段、野路攀爬、楼梯和斜坡，并与工人使用的路线一致。

#### Scenario: Active route is visible
- **WHEN** 运输线拥有有效路线
- **THEN** 画面显示从起点到终点的可辨认线路覆盖

#### Scenario: Route visualization includes vertical structures
- **WHEN** 路线经过楼梯或斜坡
- **THEN** 线路显示包含对应的跨层结构，而不是绘制一条独立的直线替代实际连接

### Requirement: Line reacts to route invalidation

当地形、道路或高度连接变化导致运输线原路线失效时，系统 SHALL 将线路标记为需要重算或阻塞，并不得让工人继续穿过失效连接。

#### Scenario: Road removal blocks line
- **WHEN** 玩家移除运输线必经的道路段
- **THEN** 运输线进入重算或阻塞状态，工人停止使用被移除的道路

#### Scenario: Recalculation restores line
- **WHEN** 地图变化后重新存在满足能力和端点条件的新路线
- **THEN** 系统更新运输线的逻辑路线和画面显示，并恢复可执行状态

### Requirement: Multi-stop routes are outside the initial line

首版运输线 SHALL 不要求支持多个中转节点、循环路线或同一条线路的多段货物优先级；这些行为应作为后续能力独立定义。

#### Scenario: Additional stop is not implicit
- **WHEN** 起点到终点之间存在其他仓储或工作节点
- **THEN** 系统不会自动把它们加入当前运输线的停靠顺序
