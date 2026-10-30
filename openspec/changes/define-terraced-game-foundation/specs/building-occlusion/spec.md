# Spec Delta

## Purpose

定义侧视角建筑如何在单一台阶上占用横向格子，同时独立表达建筑高度和画面遮挡，避免视觉体积被误认为逻辑占地。

## ADDED Requirements

### Requirement: Horizontal footprint on one level

普通建筑 SHALL 以一个基准 `(column, level)` 为锚点，在同一个 `level` 上占用连续的横向格子；视觉高度 SHALL 不改变其逻辑占地格。

#### Scenario: Horizontal building footprint
- **WHEN** 玩家在某台阶放置宽度为 3 格的普通建筑
- **THEN** 建筑仅占用该台阶连续的 3 个横向格子

#### Scenario: Visual height does not add occupied levels
- **WHEN** 建筑的视觉高度覆盖其基准台阶上方的画面区域
- **THEN** 上方台阶不会仅因画面遮挡而自动标记为建筑占用

### Requirement: Footprint requires supported ground

系统 SHALL 要求普通建筑的全部横向占地格都是实体且可支撑建筑的地面。

#### Scenario: Air inside footprint blocks placement
- **WHEN** 建筑占地范围内任意一个横向格是 `air`
- **THEN** 建筑不能放置，且不产生部分占用

#### Scenario: Non-buildable ground blocks placement
- **WHEN** 建筑占地范围内任意一个实体格标记为不可支撑建筑
- **THEN** 建筑不能放置，即使其他占地格满足条件

### Requirement: Occlusion is derived separately

系统 SHALL 为建筑保存或推导独立的视觉高度、深度顺序和遮挡范围；遮挡结果 SHALL 用于渲染层，不得直接修改建筑逻辑占地。

#### Scenario: Tall building occludes lower scene
- **WHEN** 高建筑位于较高台阶并覆盖后方画面区域
- **THEN** 渲染层按建筑遮挡范围隐藏或压低被遮挡内容，建筑占用仍只来自其横向基准格

#### Scenario: Occlusion does not create a collision
- **WHEN** 一个空闲且有支撑的台阶格仅处于其他建筑的视觉遮挡范围内
- **THEN** 系统不会仅因遮挡拒绝该位置的建筑放置

### Requirement: Cross-level buildings are explicit special types

跨越多个台阶的桥、平台或其他建筑 SHALL 声明自己的跨层占地、支撑和通行规则，不能由普通建筑的视觉高度隐式产生。

#### Scenario: Special building declares cross-level support
- **WHEN** 玩家选择一个跨台阶建筑类型
- **THEN** 系统根据该类型的显式跨层占地和支撑要求校验放置

#### Scenario: Ordinary building cannot cross levels implicitly
- **WHEN** 普通建筑的视觉高度延伸到相邻台阶
- **THEN** 系统仍按单一基准台阶的横向占地处理，不生成跨层占用
