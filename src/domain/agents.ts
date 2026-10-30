export type AgentKind = 'person' | 'livestock' | 'vehicle'
export type ConnectionKind = 'horizontal' | 'climb' | 'stairs' | 'ramp'
export const AGENT_CAPABILITIES: Readonly<Record<AgentKind, readonly ConnectionKind[]>> = {
  person: ['horizontal', 'climb', 'stairs', 'ramp'],
  livestock: ['horizontal', 'climb', 'stairs', 'ramp'],
  vehicle: ['horizontal', 'ramp'],
}
export const allowsConnection = (agent: AgentKind, connection: ConnectionKind): boolean => AGENT_CAPABILITIES[agent].includes(connection)
export const agentLabel: Record<AgentKind, string> = { person: '人', livestock: '牲畜', vehicle: '车辆' }
