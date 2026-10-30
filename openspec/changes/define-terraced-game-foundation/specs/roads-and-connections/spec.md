# Spec Delta

## Purpose

定义台阶地图上的水平道路和跨层连接，使道路升级、攀爬、楼梯、斜坡的空间占用与寻路连接保持一致。

## ADDED Requirements

### Requirement: Ground defaults to wild path

可行走的实体地面 SHALL 默认提供野路水平通行；石板路和水泥路 SHALL 作为该水平通行的升级类型。

#### Scenario: Walkable ground has a wild path
- **WHEN** 一个实体地面格可行走且没有铺装道路
- **THEN** 符合能力的移动主体可以将其底边作为野路水平段使用

#### Scenario: Road upgrade changes horizontal traversal type
- **WHEN** 玩家将可行走地面的道路升级为石板路或水泥路
- **THEN** 该底边使用升级后的道路类型和移动代价，且仍保留原有水平连通位置

### Requirement: Horizontal road uses the cell bottom

系统 SHALL 将水平道路表示为格子底边的道路段；相邻同层道路段只有在端点连续且地面有效时才形成连续水平路线。

#### Scenario: Adjacent bottom segments connect
- **WHEN** 同一 `level` 上两个相邻格子的底边都有有效道路
- **THEN** 系统在两段道路之间建立水平通行连接

#### Scenario: Missing segment breaks a route
- **WHEN** 两个同层道路段之间存在没有有效道路的底边
- **THEN** 系统不把两段道路视为连续路线

### Requirement: Wild climb connects adjacent levels

系统 SHALL 允许野路在相邻台阶之间建立直向攀爬连接，并为该连接设置高于水平通行的移动代价。

#### Scenario: Wild path climbs one level
- **WHEN** 相邻两个 `level` 的对应位置都有可行走实体地面且没有楼梯或斜坡
- **THEN** 人和牲畜可以使用一条高代价的野路攀爬连接

#### Scenario: Wild climb does not skip levels
- **WHEN** 两个位置的层级差大于 1
- **THEN** 系统不会生成单条跨越多个台阶的野路攀爬连接

### Requirement: Stairs occupy one cell and one level transition

楼梯 SHALL 占用 1 个横向格并连接相邻两个台阶；楼梯 SHALL 只允许人和牲畜通行，不允许车辆通行。

#### Scenario: Valid stairs connection
- **WHEN** 玩家在两个相邻且有支撑的台阶之间放置楼梯
- **THEN** 系统占用该格并建立一条供人和牲畜使用的跨层连接

#### Scenario: Vehicle is blocked by stairs
- **WHEN** 车辆寻路经过只有楼梯的高度连接
- **THEN** 该路线被判定为不可通行

### Requirement: Ramps occupy two or three cells and one level transition

斜坡 SHALL 占用连续的 2 格或 3 格横向空间，并且每段只连接相邻两个台阶；斜坡 SHALL 允许人、牲畜和车辆通行。

#### Scenario: Two-cell ramp
- **WHEN** 玩家放置一段占 2 格的斜坡且端点和内部地面有效
- **THEN** 系统占用连续 2 格并建立一条跨 1 个台阶的斜坡连接

#### Scenario: Three-cell ramp
- **WHEN** 玩家放置一段占 3 格的斜坡且端点和内部地面有效
- **THEN** 系统占用连续 3 格并建立一条跨 1 个台阶的斜坡连接

#### Scenario: Ramp supports vehicles
- **WHEN** 车辆需要在相邻台阶之间移动且存在有效斜坡
- **THEN** 车辆可以使用该斜坡连接

### Requirement: Multi-level changes require chained connections

系统 SHALL 要求跨越多个台阶的路线由多段相邻的攀爬、楼梯或斜坡连接组成，不得由单个结构跳过中间层级。

#### Scenario: Chained ramps cross two levels
- **WHEN** 车辆需要上升两个台阶
- **THEN** 路线必须包含两段连续斜坡，不能只使用一段跨两层斜坡

#### Scenario: Mixed vertical route
- **WHEN** 人需要跨越多个台阶且路线依次包含楼梯和斜坡
- **THEN** 只要每段连接的通行能力匹配，系统可以组合这些连接形成完整路线

### Requirement: Road structures reserve their footprints

楼梯、斜坡和其他道路结构 SHALL 在其占地内阻止建筑或其他互斥结构重复占用；放置失败 SHALL 不留下部分占用或部分连接。

#### Scenario: Overlapping structure is rejected
- **WHEN** 斜坡或楼梯的任意占地格已经被建筑或其他结构占用
- **THEN** 新结构放置失败，原有占用和路线保持不变

#### Scenario: Invalid structure has no partial route
- **WHEN** 结构端点或内部地面不满足要求
- **THEN** 系统不创建该结构的任何占用或寻路连接
