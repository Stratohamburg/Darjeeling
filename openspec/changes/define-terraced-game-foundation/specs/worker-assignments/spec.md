# Spec Delta

## Purpose

定义工人在工作地点和运输线之间的显式分配，使生产劳动与搬运劳动不会同时占用同一个工人，并能通过统一寻路执行任务。

## ADDED Requirements

### Requirement: A worker has one active assignment

每个工人 SHALL 同时处于未分配、一个工作地点分配或一条运输线分配中的一种状态；工人不得同时拥有工作地点和运输线两个主动分配。

#### Scenario: Assign worker to workplace
- **WHEN** 玩家将未分配工人分配到田地或工厂
- **THEN** 工人的主动分配变为该工作地点，且不属于任何运输线

#### Scenario: Assign worker to transport line
- **WHEN** 玩家将未分配工人分配到运输线
- **THEN** 工人的主动分配变为该运输线，且不占用工作地点岗位

#### Scenario: Reassignment replaces old assignment
- **WHEN** 玩家把已有工作地点分配的工人改分配到运输线
- **THEN** 原工作地点释放该工人，工人只保留新的运输线分配

### Requirement: Workplaces expose assignment capacity

田地、工厂和其他工作地点 SHALL 声明可分配岗位容量；当容量已满时，系统 SHALL 拒绝额外分配且保留原有分配。

#### Scenario: Workplace accepts available slot
- **WHEN** 工作地点仍有空闲岗位且工人符合其要求
- **THEN** 分配成功并占用一个岗位

#### Scenario: Full workplace rejects assignment
- **WHEN** 工作地点的所有岗位都已被其他工人占用
- **THEN** 新分配失败，工人的原状态不改变

### Requirement: Worker task states follow assignment

系统 SHALL 根据工人的主动分配维护可观察的任务状态，包括空闲、前往工作、工作中、前往取货、搬运、前往交付和等待等阶段。

#### Scenario: Workplace worker starts work after arrival
- **WHEN** 已分配工人沿可行路线到达工作地点
- **THEN** 工人从前往工作转为工作中或该地点定义的等待状态

#### Scenario: Transport worker follows transport tasks
- **WHEN** 工人被分配到一条有效运输线
- **THEN** 工人按取货、搬运和交付阶段执行运输任务

### Requirement: Assignment uses traversal capabilities

工人的任务路线 SHALL 根据其移动主体能力、实体地面、道路和高度连接计算；不可达的工作地点或运输线不得被标记为已到达。

#### Scenario: Assigned worker cannot reach workplace
- **WHEN** 工人到工作地点之间没有符合其能力的路线
- **THEN** 工人保持不可达或等待状态，并向界面提供阻塞原因

#### Scenario: Route becomes blocked
- **WHEN** 工人现有路线因道路、楼梯、斜坡或地形变化失效
- **THEN** 系统将任务标记为需要重新计算或阻塞，不让工人穿过失效连接

### Requirement: Assignment changes are explicit

工人 SHALL 只有在玩家或受支持的系统命令改变分配时切换主动任务；暂时缺货、暂时无工作或路径重算不得自动把工人改派到其他工作地点。

#### Scenario: Temporary lack of work does not reassign
- **WHEN** 工厂暂时没有可执行的生产任务
- **THEN** 工人保持该工作地点分配并进入等待状态

#### Scenario: Player changes assignment
- **WHEN** 玩家明确选择新的工作地点或运输线
- **THEN** 系统释放旧岗位并让工人转入新的分配状态
