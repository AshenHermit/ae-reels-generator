import {
  ScriptData,
  ScriptNode,
  ScriptNodeText,
} from "../../../shared/script-data";
import peggy from "peggy";
import grammarText from "./script-grammar.peggy?raw";
import { evalTS } from "../../lib/utils/bolt";

export class Compositor {
  scriptData: ScriptData = { nodes: [], layersOrder: [] };
  onUpdate?: (nodeIndex: number) => void;

  constructor(scriptData: ScriptData, onUpdate?: (nodeIndex: number) => void) {
    this.scriptData = scriptData;
    this.onUpdate = onUpdate;
  }

  async setupPrecomp() {
    await evalTS("setupPrecomp");
  }

  async smoothLayers() {
    await evalTS("smoothLayers");
  }

  async compose() {
    await this.setupPrecomp();

    const nodes = this.scriptData.nodes.sort(
      (a, b) =>
        this.scriptData.layersOrder.indexOf(a.layer) -
        this.scriptData.layersOrder.indexOf(b.layer)
    );

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      await evalTS("buildNode", node);
      if (this.onUpdate) {
        this.onUpdate(i);
      }
    }
  }
}
