import {
  helloVoid,
  helloError,
  helloStr,
  helloNum,
  helloArrayStr,
  helloObj,
} from "../utils/samples";
export { helloError, helloStr, helloNum, helloArrayStr, helloObj, helloVoid };
import { dispatchTS } from "../utils/utils";
import { ScriptNode, ScriptNodeTransform } from "../../shared/script-data";
import {
  deleteAnimationKeys,
  getAnimationBoundaries,
  moveAnimatedKeys,
} from "./aeft-utils";

/// <reference path="../../../node_modules/types-for-adobe/AfterEffects/23.0/index.d.ts"/>

var compWidth = 1080;
var compHeight = 1920;
var compName = "reel_composition";

function getExtensionPath() {
  try {
    // Получаем версию After Effects
    var extensionPath = Folder($.fileName).parent.parent.fsName;
    return extensionPath;
  } catch (e) {
    alert("Ошибка определения пути к User Presets: " + e.toString());
    return null;
  }
}

export const getPresetsPath = () => {
  return getExtensionPath() + "/presets";
};

export const selectReadFile = () => {
  var file = File.openDialog("select file", "*.txt");

  if (!file || file instanceof Array) {
    alert("file is not selected!");
    return null;
  }

  // Открываем файл и читаем его содержимое
  if (file.open("r")) {
    var content = file.read();
    file.close();

    return { filepath: `${file.path}/${file.name}`, content };
  } else {
    alert("cant open file!");
    return null;
  }
};

function getOrCreateCompByName(name: string) {
  var project = app.project;

  if (!project) {
    alert("Нет открытого проекта!");
    return;
  }

  var comp = null;
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem && item.name === name) {
      comp = item;
    }
  }
  if (!comp) {
    comp = project.items.addComp(name, compWidth, compHeight, 1, 60 * 2, 30);
  }
  var сompItem = comp as CompItem;
  сompItem.selected = true;

  // var yourCompViewer = сompItem.openInViewer();
  // if (yourCompViewer) yourCompViewer.setActive();

  return comp; // если не найдено
}

function getOrCreateNull(nullName: string): AVLayer | null {
  var comp = getOrCreateCompByName(compName);
  if (!comp) return null;

  var nullLayer = null;

  // Поиск null-слоя по имени
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.nullLayer && layer.name === nullName) {
      nullLayer = layer;
      break;
    }
  }

  // Если не нашли — создаём
  if (!nullLayer) {
    nullLayer = comp.layers.addNull();
    nullLayer.name = nullName;
  }

  return nullLayer as AVLayer;
}

function createTextLayer(
  layerParent: AVLayer | null,
  text: string,
  startTime: number,
  endTime: number
) {
  var comp = getOrCreateCompByName(compName);
  if (!comp) return;

  // Добавляем текстовый слой
  var textLayer = comp.layers.addText(text);

  // Центрируем текст
  var textProp = textLayer.property("Source Text");
  var textDocument = textProp.value as TextDocument;
  textDocument.font = "Montserrat-ExtraBold";
  textDocument.strokeColor = [0, 0, 0];
  textDocument.strokeWidth = 8;
  textDocument.justification = ParagraphJustification.CENTER_JUSTIFY; // Выравнивание по центру
  textProp.setValue(textDocument);

  // Центрируем позицию
  var textRect = textLayer.sourceRectAtTime(0, false);
  var textWidth = textRect.width;
  var textHeight = textRect.height;

  textLayer.position.setValue([compWidth / 2, compHeight / 2 + textHeight / 2]);

  textLayer.inPoint = startTime;
  textLayer.outPoint = endTime;

  if (layerParent) textLayer.parent = layerParent;

  return textLayer;
}

function createFootageLayer(
  layerParent: AVLayer | null,
  filepath: string,
  startTime: number,
  endTime: number,
  startCrop: number,
  audioFactor: number,
  fill?: "height" | "width"
) {
  var videoFile = new File(filepath);
  var importOptions = new ImportOptions(videoFile);

  var importedVideo = app.project.importFile(importOptions);

  var comp = getOrCreateCompByName(compName);
  if (!comp) return;

  if (comp && comp instanceof CompItem) {
    // Добавляем видео в композицию
    var videoLayer: AVLayer = comp.layers.add(importedVideo);

    // Получаем размеры исходного медиа
    var sourceWidth = videoLayer.source.width;
    var sourceHeight = videoLayer.source.height;

    if (fill) {
      // С учётом родительского масштаба и текущего масштаба — сначала нормализуем
      var pixelAspect = videoLayer.source.pixelAspect;
      var scaleFactor = compWidth / (sourceWidth * pixelAspect);
      if (fill == "height") {
        scaleFactor = compHeight / (sourceHeight * pixelAspect);
      }
      // Устанавливаем масштаб
      var scale = videoLayer.property("Scale");
      scale.setValue([scaleFactor * 100, scaleFactor * 100]);
    }

    // Устанавливаем точку начала (например, 2 секунды)
    videoLayer.startTime = startTime - startCrop;
    videoLayer.inPoint = startTime;
    videoLayer.outPoint = endTime;

    if (videoLayer.hasAudio && audioFactor != undefined) {
      var audio = videoLayer.audio;
      if (audio) {
        audio.audioLevels.setValue([
          audio.audioLevels.minValue +
            audioFactor * Math.abs(audio.audioLevels.minValue),
          audio.audioLevels.minValue +
            audioFactor * Math.abs(audio.audioLevels.minValue),
        ]);
      }
    }

    if (layerParent) videoLayer.parent = layerParent;

    return videoLayer;
  } else {
    alert("Откройте композицию перед запуском скрипта!");
  }
}

export function applyPreset(layer: Layer, presetPath: string) {
  layer.applyPreset(File(presetPath));
  // Применяем пресет
  if (File(presetPath).exists) {
  } else {
    alert("Пресет не найден: " + presetPath);
  }
}

export function adaptAnimationKeys(
  layer: Layer,
  startTime: number,
  endTime: number,
  deleteOverlappingKeys: boolean
) {
  var boundaries = getAnimationBoundaries(layer);
  if (!boundaries) return;
  var animLength = boundaries[1] - boundaries[0];
  var outLength = Math.abs(endTime - startTime);

  var rightOffset = endTime - boundaries[1];
  var leftOffset = startTime - boundaries[0];
  var center = (boundaries[0] + boundaries[1]) / 2;

  if (animLength > outLength && deleteOverlappingKeys) {
    var overlapDistance = Math.abs(animLength - outLength);
    deleteAnimationKeys(
      layer,
      (time) =>
        time > center - overlapDistance / 2 &&
        time < center + overlapDistance / 2
    );
  }

  moveAnimatedKeys(layer, (time) => time > center, rightOffset);
  moveAnimatedKeys(layer, (time) => time < center, leftOffset);
}

export function generateTransformAnimation(
  layer: AVLayer,
  node: ScriptNodeTransform
) {
  if (!layer || !node) return;

  var from = node.from;
  var to = node.to;
  var startTime = node.start;
  var endTime = node.end;

  var compCenter = [compWidth / 2, compHeight / 2];

  function parseValue(val: string, axis: "x" | "y" | "", isScale: boolean) {
    val = val.toString().trim();
    if (val.indexOf("%") > -1) {
      var num = parseFloat(val);
      if (isScale) return num;
      return axis === "x"
        ? compCenter[0] + (num / 100) * compWidth
        : compCenter[1] + (num / 100) * compHeight;
    } else {
      var num = parseFloat(val);
      return axis === "x" ? compCenter[0] + num : compCenter[1] + num;
    }
  }

  var pos = layer.property("Position") as TwoDProperty;
  var scale = layer.property("Scale") as TwoDProperty;

  var fromX = parseValue(from.x, "x", false);
  var fromY = parseValue(from.y, "y", false);
  var toX = parseValue(to.x, "x", false);
  var toY = parseValue(to.y, "y", false);
  var fromScale = parseValue(from.scale, "", true);
  var toScale = parseValue(to.scale, "", true);

  var midTime = (startTime + endTime) / 2;
  midTime += (startTime - midTime) / 1.5;

  var keyIndexStartPos = pos.addKey(startTime);
  pos.setValueAtKey(keyIndexStartPos, [fromX, fromY]);
  var keyIndexMidPos = pos.addKey(midTime);
  pos.setValueAtKey(keyIndexMidPos, [
    fromX + (toX - fromX) * 0.8,
    fromY + (toY - fromY) * 0.8,
  ]);
  var keyIndexEndPos = pos.addKey(endTime);
  pos.setValueAtKey(keyIndexEndPos, [toX, toY]);

  var keyIndexStartScale = scale.addKey(startTime);
  scale.setValueAtKey(keyIndexStartScale, [fromScale, fromScale]);
  var keyIndexMidScale = scale.addKey(midTime);
  scale.setValueAtKey(keyIndexMidScale, [
    fromScale + (toScale - fromScale) * 0.8,
    fromScale + (toScale - fromScale) * 0.8,
  ]);
  var keyIndexEndScale = scale.addKey(endTime);
  scale.setValueAtKey(keyIndexEndScale, [toScale, toScale]);

  layer.selected = true;
}

export function smoothLayers(layers?: AVLayer[]) {
  if (app.project.activeItem) {
    if (!layers) {
      layers = app.project.activeItem.selectedLayers;
    }
    if (!layers) return;
    for (let lr = 0; lr < layers.length; lr++) {
      const layer = layers[lr] as AVLayer;

      layer.selected = true;
      var pos = layer.property("Position");
      var scale = layer.property("Scale");
      const props = [pos, scale];
      for (let p = 0; p < props.length; p++) {
        const prop = props[p];
        prop.selected = true;

        for (var i = 1; i <= prop.numKeys; i++) {}

        // Включаем Auto Bezier
        for (var i = 2; i < prop.numKeys; i++) {
          prop.setSelectedAtKey(i, true);

          prop.setInterpolationTypeAtKey(
            i,
            KeyframeInterpolationType.BEZIER,
            KeyframeInterpolationType.BEZIER
          );
          prop.setTemporalEaseAtKey(i, [new KeyframeEase(1152, 50)]);
          // Только для средних ключей
          // prop.setSpatialAutoBezierAtKey(i, true);
        }
      }
    }
  }
}

export function createFilterLayer() {
  var comp = getOrCreateCompByName(compName);
  if (!comp) return;

  if (comp && comp instanceof CompItem) {
    var adjustmentSolid = comp.layers.addSolid(
      [1, 1, 1],
      "filter_adjustment_layer",
      comp.width,
      comp.height,
      comp.pixelAspect,
      comp.duration
    );
    adjustmentSolid.adjustmentLayer = true;

    return adjustmentSolid;
  }
}

export const buildNode = (node: ScriptNode) => {
  // app.beginUndoGroup("Nodes");
  var layer: Layer | undefined;
  var layerParent = getOrCreateNull(node.layer);
  if (node.type == "text") {
    layer = createTextLayer(layerParent, node.text, node.start, node.end);
  }
  if (node.type == "footage") {
    layer = createFootageLayer(
      layerParent,
      node.filepath,
      node.start,
      node.end,
      node.startCrop,
      node.audio !== undefined ? node.audio : 1,
      node.fill
    );
  }
  if (node.type == "transform") {
    if (layerParent) {
      generateTransformAnimation(layerParent, node);
    }
  }
  if (node.type == "filter") {
    layer = createFilterLayer();
  }

  if (layer && node.presets) {
    for (let i = 0; i < node.presets.length; i++) {
      const presetName = node.presets[i];
      applyPreset(layer, presetName);
    }
    adaptAnimationKeys(layer, node.start, node.end, node.type != "text");
  }

  if (layerParent) {
    // layerParent.selected = true;
    smoothLayers([layerParent]);
  }
  // app.endUndoGroup();
};

export const setupPrecomp = () => {
  var comp = getOrCreateCompByName(compName);
};
