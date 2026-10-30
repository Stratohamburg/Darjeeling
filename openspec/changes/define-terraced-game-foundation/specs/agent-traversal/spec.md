# Spec Delta

## Purpose

统一人、牲畜和车辆的移动能力与道路代价，使寻路能够根据移动主体选择合法且代价可比较的水平和跨层路线。

## ADDED Requirements

### Requirement: Horizontal roads are available to all agents

人、牲畜和车辆 SHALL 都可以使用有效的水平野路、石板路和水泥路；道路类型 SHALL 影响移动代价而不改变水平连接的基本方向。

#### Scenario: Vehicle uses horizontal wild path
- **WHEN** 车辆在同一台阶上经过连续的野路
- **THEN** 系统允许车辆通行，并使用野路的水平移动代价

#### Scenario: Paved road changes cost
- **WHEN** 同一主体在石板路或水泥路上移动
- **THEN** 系统使用对应的较低移动代价计算路线

### Requirement: Agents have explicit traversal capabilities

系统 SHALL 为每类移动主体声明其是否可以使用野路攀爬、楼梯和斜坡；不具备能力的主体 SHALL 不得将该连接加入候选路线。

#### Scenario: Person uses stairs and ramp
- **WHEN** 人在相邻台阶之间选择楼梯或斜坡
- **THEN** 两种连接都可以成为其路线的一部分

#### Scenario: Livestock uses stairs and ramp
- **WHEN** 牲畜在相邻台阶之间选择楼梯或斜坡
- **THEN** 两种连接都可以成为其路线的一部分

#### Scenario: Vehicle uses ramp only
- **WHEN** 车辆在相邻台阶之间寻找路线
- **THEN** 车辆可以使用斜坡，但不能使用野路攀爬或楼梯

### Requirement: Climb and ramp costs differ

系统 SHALL 将野路攀爬的代价设置为高于同类水平移动，并允许斜坡使用较低的跨层移动代价；具体数值 SHALL 可配置。

#### Scenario: Climb is penalized
- **WHEN** 人或牲畜在可用野路攀爬与绕行水平路线之间选路
- **THEN** 路线计算将野路攀爬的高代价纳入总成本

#### Scenario: Ramp is preferred when cheaper
- **WHEN** 车辆存在可用斜坡且斜坡路线总成本低于其他可行绕行
- **THEN** 路线计算可以选择斜坡

### Requirement: Unreachable destinations are reported

当移动主体没有满足能力、地面和连接条件的路线到达目标时，系统 SHALL 报告目标不可达，并不得生成部分路径或让主体穿过非法连接。

#### Scenario: Vehicle has stairs but no ramp
- **WHEN** 车辆所在区域只能通过楼梯连接目标区域
- **THEN** 目标对车辆不可达

#### Scenario: Air gap blocks every route
- **WHEN** 所有候选路线都需要穿过 `air` 格或无效连接
- **THEN** 系统报告不可达并保留主体当前位置

### Requirement: Route cost is deterministic for a given state

在地图、道路、连接、主体能力和代价配置相同的情况下，系统 SHALL 为相同起点和终点计算一致的可行性和路线成本。

#### Scenario: Repeated route calculation
- **WHEN** 对同一移动主体重复计算相同起点和终点的路线
- **THEN** 结果的可达性和总成本一致
