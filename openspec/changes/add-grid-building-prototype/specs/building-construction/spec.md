# Spec Delta

## Purpose

定义建筑从玩家确认开工到施工完成的生命周期，使确认操作具有明确的地图占用结果，并通过可见进度和完成外观反馈施工过程，同时支持玩家在已有建筑施工期间继续安排其他建筑。

## ADDED Requirements

### Requirement: Construction starts only after confirmation

系统 SHALL 仅在玩家确认一个有效待确认候选时，创建恰好一个施工中的建筑。选择类型、移动幽灵、固定位置或取消候选 SHALL 不创建建筑或启动施工。

#### Scenario: Candidate awaits a decision
- **WHEN** 玩家固定候选后等待超过该建筑的配置施工时长，尚未点击 ✓
- **THEN** 候选仍处于待确认状态，没有施工进度或已完成建筑

#### Scenario: Repeated confirmation is handled once
- **WHEN** 玩家对同一个待确认候选快速重复触发确认
- **THEN** 系统至多创建一个建筑，不生成重复施工实例

### Requirement: Confirmation occupies the entire footprint

系统 SHALL 在有效确认成功时立即占用建筑的全部格子，并保持建筑实例与占地结果一致。确认失败 SHALL 不产生建筑，也不留下部分占用。

#### Scenario: A new construction immediately blocks overlap
- **WHEN** 玩家确认一个 3 × 2 建筑后，立即预览与其任意占地格重叠的另一个建筑
- **THEN** 原建筑的全部 6 格均已被占用，新的重叠候选被判定无效

#### Scenario: Invalid confirmation leaves no partial result
- **WHEN** 确认操作因占地校验失败而被拒绝
- **THEN** 不出现该候选的施工实例，原有建筑与格子占用保持原状

### Requirement: Visible time-based construction progress

系统 SHALL 为施工中的建筑显示区别于成品的施工外观及可见进度。进度 SHALL 按确认后的经过时间与配置施工时长计算，在 0 到 100% 之间推进，不依赖渲染帧数。

#### Scenario: Progress advances after confirmation
- **WHEN** 一个施工时长为 3 秒的建筑已开工约 1.5 秒
- **THEN** 该建筑仍显示为施工中，进度约为 50%

#### Scenario: Delayed updates catch up
- **WHEN** 页面在建筑开工后暂时停止更新，再次更新时已超过配置施工时长
- **THEN** 该建筑按实际经过时间直接达到完成状态，不重新从暂停前的进度计时

### Requirement: Completion preserves position and occupancy

系统 SHALL 在经过时间达到配置施工时长后的首次更新中，将建筑转换为已完成外观，移除施工进度显示，并保持建筑的位置、占地及对其他建筑的阻挡效果。

#### Scenario: Construction completes
- **WHEN** 建筑达到配置施工时长并发生状态更新
- **THEN** 该建筑在原位置显示为完成状态，所有原占地格继续被占用

### Requirement: Independent concurrent construction

系统 SHALL 允许多个建筑同时施工，并分别根据各自的开工时间推进进度。已有建筑的施工或完工 SHALL 不移动、确认或取消玩家当前的幽灵与待确认候选。

#### Scenario: Build another while the first is under construction
- **WHEN** 玩家在建筑 A 开工后，在另一空闲位置确认建筑 B
- **THEN** 两个建筑均独立施工，B 不继承 A 的施工进度

#### Scenario: Completion does not interrupt placement
- **WHEN** 玩家正在移动幽灵或检查待确认候选时，另一建筑完成施工
- **THEN** 当前建筑选择、幽灵或候选位置保持不变，另一建筑正常显示完成外观
