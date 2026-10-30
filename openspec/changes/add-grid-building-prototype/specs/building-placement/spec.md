# Spec Delta

## Purpose

定义玩家从建筑列表选择类型、在地图中预览占地、固定候选位置并确认或撤回的完整交互，使玩家能够在开工前检查位置，取消时继续调整同一种建筑，并清楚区分可以放置与不可放置的区域。

## ADDED Requirements

### Requirement: Building catalog and selection

系统 SHALL 在地图右侧显示建筑列表，包含名称和占地尺寸，并提供覆盖 1 × 1、2 × 2、3 × 2、3 × 3 占地的至少四种示例建筑。选择建筑 SHALL 进入该类型的预览状态并显示选中反馈。

#### Scenario: Select a building
- **WHEN** 玩家点击列表中的 3 × 2 建筑
- **THEN** 该建筑显示为选中，且鼠标进入地图后预览对应的 6 格占地

### Requirement: Ghost preview follows the pointer

系统 SHALL 在预览状态且鼠标位于地图内时显示半透明建筑幽灵，按网格锚点跟随鼠标。鼠标离开地图时 SHALL 隐藏跟随幽灵并保留建筑选择。

#### Scenario: Preview follows snapped cells
- **WHEN** 玩家选择建筑后将鼠标移动到另一个地图格子
- **THEN** 幽灵移动到对应锚点，建筑占地尺寸保持不变

#### Scenario: Pointer leaves and returns
- **WHEN** 玩家将鼠标从地图移到右侧面板，再移回地图
- **THEN** 离开时跟随幽灵隐藏，返回后仍显示同种建筑并跟随新的地图位置

### Requirement: Placement validity feedback

系统 SHALL 以不同的占地颜色区分有效和无效位置，并在无效位置显示可理解的原因。越界或重叠的位置 SHALL 不允许进入待确认状态。

#### Scenario: Valid placement preview
- **WHEN** 幽灵占地完全位于地图内且全部格子空闲
- **THEN** 占地显示有效样式，玩家可以点击固定位置

#### Scenario: Invalid click preserves preview
- **WHEN** 玩家点击越界或与建筑重叠的幽灵位置
- **THEN** 幽灵保持预览状态，显示相应原因，且不出现待确认按钮、不创建建筑

### Requirement: Lock a candidate before construction

系统 SHALL 在玩家点击有效位置后，将建筑类型和锚点固定为唯一的待确认候选，并在其附近显示 ✓ / × 按钮。待确认期间 SHALL 不开工、不正式占地，鼠标移动或再次点击地图 SHALL 不移动候选或创建其他候选。

#### Scenario: Candidate remains fixed
- **WHEN** 玩家固定有效位置后移动鼠标或点击地图其他位置
- **THEN** 候选保持原位置，仅保留一组确认与取消按钮，且地图中尚无对应施工实例

#### Scenario: Controls remain usable near edges
- **WHEN** 待确认建筑位于地图边缘
- **THEN** ✓ / × 控件仍完整显示在地图视口内并可被点击

### Requirement: Cancel returns to the previous ghost state

系统 SHALL 在玩家点击 × 后移除待确认状态与按钮，恢复同种建筑及原候选锚点的预览状态，不创建建筑或占用格子。鼠标位于控件或地图外时 SHALL 等待鼠标回到地图后再显示跟随幽灵。

#### Scenario: Cancel then reposition
- **WHEN** 玩家点击 ×，再将鼠标移到地图另一有效位置
- **THEN** 同种建筑的幽灵跟随到新位置，原候选区域保持空闲，玩家可以重新固定候选

#### Scenario: Cancel does not jump to the button
- **WHEN** 玩家使用位于候选旁边的 × 按钮取消
- **THEN** 按钮位置不被当作一次新的地图定位或放置操作

### Requirement: Confirm construction and continue placement

系统 SHALL 仅在玩家点击 ✓ 且候选仍有效时提交一次建造，随后移除待确认按钮并恢复同种建筑的预览状态。确认时失效的候选 SHALL 不开工，并保留可取消的待确认状态及无效原因。

#### Scenario: Confirm a valid candidate
- **WHEN** 玩家点击有效候选的 ✓ 按钮
- **THEN** 原候选位置出现一个施工中的建筑，按钮消失，鼠标回到地图后可继续预览同种建筑

#### Scenario: Candidate becomes invalid before confirmation
- **WHEN** 候选在确认校验时被判定为越界或占地冲突
- **THEN** 系统不创建建筑或修改占用，显示无效原因，并允许玩家点击 × 返回预览

### Requirement: Switching building types replaces the draft

系统 SHALL 允许玩家在预览或待确认状态选择另一建筑类型；切换 SHALL 丢弃原草稿并进入新类型的预览状态，不隐式确认原候选。

#### Scenario: Switch while awaiting confirmation
- **WHEN** 玩家在待确认状态点击另一建筑类型
- **THEN** 原候选及其按钮消失，原位置不被占用，鼠标回到地图后显示新类型幽灵

### Requirement: Escape steps back through placement

系统 SHALL 将待确认状态下的 Esc 视为取消候选，将预览状态下的 Esc 视为退出摆放，并在退出后隐藏幽灵和清除建筑选择。

#### Scenario: Escape from a candidate
- **WHEN** 玩家在待确认状态按下 Esc
- **THEN** 恢复同种建筑的预览状态，且候选位置不产生建筑

#### Scenario: Escape from preview
- **WHEN** 玩家在预览状态按下 Esc
- **THEN** 幽灵消失，建筑列表不再显示当前选择，地图点击不再发起放置

### Requirement: UI actions remain isolated from the map

系统 SHALL 将建筑列表、确认和取消按钮的操作与地图点击隔离，并为 ✓ / × 提供可识别的操作名称。任何界面操作 SHALL 不额外触发地图放置。

#### Scenario: Confirm and cancel clicks do not pass through
- **WHEN** 玩家点击覆盖在地图上方的确认或取消按钮
- **THEN** 仅执行对应按钮操作，不在按钮下方固定新候选或额外创建建筑

#### Scenario: Catalog click does not place a building
- **WHEN** 玩家点击右侧建筑列表
- **THEN** 仅更新建筑选择，不在地图上产生候选或建筑
