# Spec Delta

## Purpose

为正俯视建造玩法提供统一的方格空间和建筑占地规则，使玩家看到的网格、鼠标指向的位置以及建筑实际占用的区域保持一致，并让地图边界和建筑之间的空间冲突能够被可靠地识别与反馈。

## ADDED Requirements

### Requirement: Top-down square grid

系统 SHALL 显示具有有限行数和列数的正俯视地图，每格为相同尺寸的正方形，并以可辨认的网格线呈现格子边界。

#### Scenario: Initial empty map
- **WHEN** 玩家首次进入原型
- **THEN** 地图显示完整的配置网格，且没有已占用格子或建筑

### Requirement: Pointer-to-cell mapping

系统 SHALL 将地图内的鼠标位置映射到一个确定的格子，以建筑占地的左上角为锚点。格子边界采用左上包含、右下不包含的规则；地图外的位置 SHALL 不产生地图内的放置锚点。

#### Scenario: Pointer moves within one cell
- **WHEN** 鼠标在同一格内部移动
- **THEN** 建筑的网格锚点保持不变

#### Scenario: Pointer crosses a grid line
- **WHEN** 鼠标向右越过相邻格子的公共边界
- **THEN** 建筑锚点向右移动一格，且恰好位于边界时归属右侧格子

#### Scenario: Pointer reaches the outer boundary
- **WHEN** 鼠标位于地图右侧或底部的外边界上，或位于地图外
- **THEN** 该位置不被识别为地图内的放置锚点

#### Scenario: Display scaling preserves alignment
- **WHEN** 画布因显示密度或布局调整而改变显示比例后，玩家指向某个可见格子的内部
- **THEN** 该可见格子仍然是建筑锚点，不因显示比例产生偏移

### Requirement: Rectangular building footprint

系统 SHALL 使用建筑定义中的正整数占地宽度和高度计算连续矩形格子，占用格数等于宽度乘以高度。建筑外观的尺寸 SHALL 不改变其占地范围。

#### Scenario: Non-square building footprint
- **WHEN** 玩家在第 5 列、第 4 行选择放置一个宽 3 格、高 2 格的建筑，行列从 0 开始编号
- **THEN** 占地包含第 5 至 7 列、第 4 至 5 行的全部 6 个格子

### Requirement: Entire footprint stays in bounds

系统 SHALL 仅在建筑占地中的每个格子都位于地图内时判定边界有效；任意一格越界都 SHALL 阻止进入待确认状态和开工。

#### Scenario: Footprint fits exactly at an edge
- **WHEN** 在 24 列、18 行地图中，将宽 3 格、高 2 格建筑的锚点放在第 21 列、第 16 行
- **THEN** 该建筑的边界检查有效

#### Scenario: Only part of the footprint is outside
- **WHEN** 在同一地图中，将该建筑的锚点放在第 22 列、第 16 行
- **THEN** 该建筑因右侧占地超出地图而被判定无效

### Requirement: Occupied cells block placement

系统 SHALL 在建筑占地与任意已占用格子重叠时阻止放置。施工中和已完成建筑的占地 SHALL 使用相同的阻挡规则，彼此仅相邻的建筑 SHALL 不被视为重叠。

#### Scenario: Only an interior cell is occupied
- **WHEN** 一个候选建筑的锚点格为空闲，但其占地内部的任意其他格子已被建筑占用
- **THEN** 该候选位置被判定无效

#### Scenario: Neighboring footprints touch
- **WHEN** 两个建筑仅共享占地边界，且没有占用相同格子
- **THEN** 已有建筑不阻止候选建筑放置

#### Scenario: Construction and completion share blocking behavior
- **WHEN** 玩家将候选建筑移动到施工中或已完成建筑的任意占地格
- **THEN** 两种情况下该候选位置均被判定无效
