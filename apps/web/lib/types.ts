export interface Source {
  id: string
  title: string
  excerpt?: string
  regulation?: string
  article?: string
  url?: string
}

export interface GraphNode {
  id: string
  type: string
  name: string
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type?: string
  label?: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}
