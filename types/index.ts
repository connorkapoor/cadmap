export type NodeType = 'company' | 'kernel' | 'software';

export type RelationshipType = 'owns' | 'uses-kernel' | 'built-on';

export type Tag =
  | 'open-source'
  | 'startup'
  | 'cloud'
  | 'implicit'
  | 'parametric'
  | 'direct'
  | 'mesh'
  | 'simulation'
  | 'pcb'
  | 'free'
  | 'commercial'
  | 'kernel-provider'
  | 'bim'
  | 'cam'
  | 'sculpt'
  | 'procedural';

export interface CadNode {
  id: string;
  name: string;
  type: NodeType;
  tags: Tag[];
  url?: string;
  description?: string;
  // Injected by force-graph at runtime
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  index?: number;
}

export interface CadLink {
  source: string;
  target: string;
  relationship: RelationshipType;
}

export interface GraphData {
  nodes: CadNode[];
  links: CadLink[];
}
