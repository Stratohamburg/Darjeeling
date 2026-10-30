# Spec Delta

## Purpose

为侧视角台阶式地图提供统一的逻辑坐标、地面存在性和支撑规则，使建筑、道路和移动主体共享同一套世界空间事实。

## ADDED Requirements

### Requirement: Fixed-step world coordinates

系统 SHALL 使用 `(column, level)` 表示世界位置，其中 `column` 表示横向格子，`level` 表示固定高度差的台阶层级。格子 SHALL 为正方形，横向列宽与相邻台阶高度差相等；地面、空洞网格与占地预览 SHALL 使用同一方格边界，并在视口中等比显示。

#### Scenario: Square cells keep their proportions
- **WHEN** 地图显示或视口大小改变
- **THEN** 同一格子的横向与纵向显示边长相等，指针输入与占地预览仍对应同一逻辑格

#### Scenario: Adjacent levels have a fixed step height
- **WHEN** 两个位置的 `level` 相差 1
- **THEN** 系统将它们视为相邻台阶，并使用同一配置的台阶高度差

#### Scenario: Logical coordinates are independent from screen pixels
- **WHEN** 地图视口缩放或移动
- **THEN** 同一 `(column, level)` 仍表示同一逻辑位置，建筑、道路和寻路关系不改变

### Requirement: Ground and air cells

系统 SHALL 允许每个 `(column, level)` 位置标记为实体地面或 `air`；`air` 位置 SHALL 不能直接承载建筑、道路或移动主体。

#### Scenario: Building requires ground
- **WHEN** 建筑的任意水平占地格标记为 `air`
- **THEN** 该位置被判定为不可建造

#### Scenario: Road requires ground
- **WHEN** 玩家尝试在 `air` 位置建立道路或高度连接
- **THEN** 操作被拒绝，且不产生可通行连接

#### Scenario: Worker cannot occupy air
- **WHEN** 寻路或移动结果指向 `air` 位置
- **THEN** 系统不生成该位置的移动节点，并阻止移动主体进入

### Requirement: Ground support and walkability are explicit

系统 SHALL 独立记录实体地面的建筑支撑能力和可行走能力；实体地面但不可支撑或不可行走的位置 SHALL 保留其对应限制。

#### Scenario: Solid but non-buildable ground
- **WHEN** 一个实体地面位置标记为不可支撑建筑
- **THEN** 建筑放置失败，即使该位置仍可作为其他地形或道路的一部分

#### Scenario: Solid but non-walkable ground
- **WHEN** 一个实体地面位置标记为不可行走
- **THEN** 系统不把该位置加入工人或牲畜的可行走节点

### Requirement: Traversal connections require valid endpoints

系统 SHALL 仅在起点和终点均为实体且满足对应通行条件时建立水平道路、攀爬、楼梯或斜坡连接。

#### Scenario: Connection over an air gap is rejected
- **WHEN** 高度连接的一端或其占地内部包含 `air`
- **THEN** 连接建立失败，且两侧不会因该操作获得新的通路

#### Scenario: Valid supported connection becomes traversable
- **WHEN** 连接的端点和占地均有满足条件的实体地面
- **THEN** 系统将该连接加入可供符合能力的移动主体使用的寻路图
