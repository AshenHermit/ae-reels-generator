export type ScriptNodeBase = {
  start: number;
  end: number;
  layer: string;
  presets?: string[];
};

export type ScriptNodeBreak = ScriptNodeBase & {
  type: "break";
};

export type Transform = {
  x: string;
  y: string;
  scale: string;
};
export function transIdentity(): Transform {
  return { x: "0", y: "0", scale: "100%" };
}

export type ScriptNodeFilter = ScriptNodeBase & {
  type: "filter";
  presets: string[];
};

export type ScriptNodeTransform = ScriptNodeBase & {
  type: "transform";
  from: Transform;
  to: Transform;
};

export type ScriptNodeText = ScriptNodeBase & {
  type: "text";
  text: string;
};

export type ScriptNodeFootage = ScriptNodeBase & {
  type: "footage";
  filepath: string;
  startCrop: number;
  fill?: "height" | "width";
  audio?: number;
};

export type ScriptNode =
  | ScriptNodeFootage
  | ScriptNodeText
  | ScriptNodeBreak
  | ScriptNodeTransform
  | ScriptNodeFilter;

export type ScriptNodeType = ScriptNode["type"];

export const toolNodesTypes: ScriptNodeType[] = ["transform"];

export type ScriptData = {
  layersOrder: string[];
  nodes: ScriptNode[];
};
