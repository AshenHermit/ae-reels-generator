import {
  ScriptData,
  ScriptNodeBreak,
  ScriptNodeFilter,
  ScriptNodeFootage,
  ScriptNodeText,
  ScriptNodeTransform,
  ScriptNodeType,
  toolNodesTypes,
  transIdentity,
} from "../../../shared/script-data";
import peggy from "peggy";
import grammarText from "./script-grammar.peggy?raw";
import { evalTS } from "../../lib/utils/bolt";
import path from "path";

export class ScriptParser {
  scriptData: ScriptData = { nodes: [], layersOrder: [] };
  content: string = "";
  fps: number = 24;
  dsl: any;
  lastPresets: { [layer: string]: string[] } = {};
  filterPresets: string[] = [];
  filepath: string = "";
  presetsPath: string = "";

  constructor(fps: number = 24) {
    this.fps = fps;
  }

  async parseFile(filepath: string, content: string): Promise<ScriptData> {
    this.scriptData = { nodes: [], layersOrder: [] };
    this.filepath = filepath;
    this.content = content;
    this.lastPresets = {};
    this.filterPresets = [];

    this.presetsPath = await this.getPresetsPath();
    this.dsl = this.parseDSL(this.content);
    this.buildData(this.dsl);

    return this.scriptData;
  }
  async getPresetsPath() {
    return await evalTS("getPresetsPath");
  }
  resolveFilepath(filepath: string) {
    let rootPath = this.filepath.slice(0, this.filepath.lastIndexOf("/") + 1);
    if (filepath.startsWith("@/")) {
      rootPath = this.presetsPath;
      filepath = filepath.slice(2);
    }
    filepath = path.join(rootPath, filepath);
    filepath = path.normalize(filepath);
    return filepath;
  }
  generateParserCode() {
    return peggy.generate(grammarText);
  }
  parseDSL(content: string) {
    const parser = peggy.generate(grammarText);
    return parser.parse(content);
  }
  buildData(dsl: any) {
    const processBlock = (block: any) => {
      if (block.textLines) {
        this.processTextBlock(block);
      }
      if (block.command) {
        this.parseCommandBlock(block.command);
      }
    };
    dsl.forEach((block: any) => {
      if (block.blockGroup) {
        block.blockGroup.forEach(processBlock);
      } else {
        processBlock(block);
      }
    });

    this.scriptData.layersOrder.push("filter");
    this.addFilter();
  }
  processTextBlock(textBlock: any) {
    let text = textBlock.textLines.join("\n");

    let node: ScriptNodeText = {
      start: textBlock.start,
      end: textBlock.end,
      layer: "text",
      type: "text",
      text: text,
      presets: this.getLastPresets("text"),
    };
    this.scriptData.nodes.push(node);
  }
  parseCommandBlock(commandBlock: any) {
    var type = commandBlock.name;
    var params = commandBlock.params;

    let funcMap: { [key: string]: (params: any) => any } = {
      footage: this.footageCmd.bind(this),
      break: this.breakCmd.bind(this),
      preset: this.presetCmd.bind(this),
      order: this.orderCmd.bind(this),
      transform: this.transformCmd.bind(this),
      filter: this.filterCmd.bind(this),
    };
    if (type in funcMap) {
      return funcMap[type](params);
    }
  }

  orderCmd(params: any) {
    let order = params.layers
      ? params.layers.split(",").map((x: string) => x.trim())
      : [];
    this.scriptData.layersOrder = order;
  }

  toSeconds(timeStr: string) {
    if (timeStr.indexOf(":") != -1) {
      const parts = timeStr.split(":").map((part) => parseInt(part, 10));
      return parts[0] * 3600 + parts[1] * 60 + parts[2] + parts[3] / 30; // предполагаем 30 кадров в секунду
    } else {
      return parseFloat(timeStr);
    }
  }

  footageCmd(params: any) {
    let fileName = params.file;
    let filepath = this.resolveFilepath(fileName);

    let layerName = params.layer ?? "footage";
    let audio = params.audio != undefined ? params.audio : 1;
    let fill = params.fill ? params.fill : undefined;

    let start = 0;
    let lastTextNode = this.getLastNodeInLayer("text");
    if (lastTextNode) {
      start = lastTextNode.start;
    }
    let lastFootageNode = this.getLastNodeInLayer(layerName);
    if (lastFootageNode) {
      lastFootageNode.end = start;
    }
    let end = start + 5;

    let startCrop = this.toSeconds(params.crop ?? "0");
    if (params.crop == "$startTime") startCrop = start;

    let node: ScriptNodeFootage = {
      start: start,
      end: end,
      startCrop: startCrop,
      layer: layerName,
      presets: this.getLastPresets(layerName),
      type: "footage",
      filepath: filepath,
      fill: fill,
      audio: audio,
    };
    this.scriptData.nodes.push(node);
  }

  breakCmd(params: any) {
    let layerName = params.layer ?? "footage";

    let start = 0;
    let lastTextNode = this.getLastNodeInLayer("text");
    if (lastTextNode) {
      start = lastTextNode.end;
    }
    let lastFootageNode = this.getLastNodeInLayer(layerName);
    if (lastFootageNode) {
      lastFootageNode.end = start;
    }
    let end = start + 5;

    let node: ScriptNodeBreak = {
      start: start,
      end: end,
      layer: layerName,
      presets: this.getLastPresets(layerName),
      type: "break",
    };
    this.scriptData.nodes.push(node);
  }
  presetCmd(params: any) {
    let layerName = params.layer ?? "text";
    let presets = params.files
      ? params.files
          .split(",")
          .map((x: string) => this.resolveFilepath(x.trim()))
      : [];

    this.lastPresets[layerName] = presets;
  }

  transformCmd(params: any) {
    let layerName = params.layer ?? "footage";

    let start = 0;
    let lastTextNode = this.getLastNodeInLayer("text");
    if (lastTextNode) {
      start = lastTextNode.start;
    }
    let from = transIdentity();
    let lastTransNode = this.getLastNodeInLayerByType(layerName, "transform");
    if (lastTransNode) {
      from = (lastTransNode as ScriptNodeTransform).to;
    }

    let to = Object.assign({}, from);
    to = Object.assign(to, params);

    let end = start + 0.5;

    let node: ScriptNodeTransform = {
      start: start,
      end: end,
      layer: layerName,
      presets: [],
      type: "transform",
      from: from,
      to: to,
    };
    this.scriptData.nodes.push(node);
  }

  filterCmd(params: any) {
    let presets = params.effects
      ? params.effects
          .split(",")
          .map((x: string) => this.resolveFilepath(x.trim()))
      : [];
    this.filterPresets = presets;
  }
  addFilter() {
    let node: ScriptNodeFilter = {
      start: 0,
      end: 0,
      layer: "filter",
      presets: this.filterPresets,
      type: "filter",
    };
    this.scriptData.nodes.push(node);
  }

  getLastPresets(layer: string): string[] {
    if (layer in this.lastPresets) {
      return this.lastPresets[layer];
    }
    return [];
  }
  getLastNodeInLayer(layer: string) {
    if (this.scriptData.nodes.length > 0) {
      var nodesInLayer = this.scriptData.nodes.filter(
        (x) => x.layer == layer && toolNodesTypes.indexOf(x.type) == -1
      );
      if (nodesInLayer.length > 0) {
        return nodesInLayer[nodesInLayer.length - 1];
      }
    }
    return null;
  }

  getLastNodeInLayerByType(layer: string, type: ScriptNodeType) {
    if (this.scriptData.nodes.length > 0) {
      var nodesInLayer = this.scriptData.nodes.filter(
        (x) => x.layer == layer && x.type == type
      );
      if (nodesInLayer.length > 0) {
        return nodesInLayer[nodesInLayer.length - 1];
      }
    }
    return null;
  }
}
