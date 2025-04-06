export const forEachLayer = (
  comp: CompItem,
  callback: (item: Layer, index: number) => void
) => {
  const len = comp.numLayers;
  for (let i = 1; i < len + 1; i++) {
    callback(comp.layers[i], i);
  }
};

export const forEachComp = (
  folder: FolderItem | Project,
  callback: (item: CompItem, index: number) => void
) => {
  const len = folder.numItems;
  let comps: CompItem[] = [];
  for (let i = 1; i < len + 1; i++) {
    const item = folder.items[i];
    if (item instanceof CompItem) {
      comps.push(item);
    }
  }
  for (let i = 0; i < comps.length; i++) {
    let comp = comps[i];
    callback(comp, i);
  }
};

export const compFromFootage = (item: FootageItem): CompItem => {
  return app.project.items.addComp(
    item.name,
    item.width,
    item.height,
    item.pixelAspect,
    item.duration,
    item.frameRate
  );
};

export const getProjectDir = () => {
  app.project.file;
  if (app.project.file !== null) {
    return app.project.file.parent;
  } else {
    return "";
  }
};

export const getActiveComp = () => {
  if (app.project.activeItem instanceof CompItem === false) {
    app.activeViewer?.setActive();
  }
  return app.project.activeItem as CompItem;
};

// Project Item Helpers

export const getItemByName = (parent: FolderItem, name: string) => {
  for (var i = 0; i < parent.numItems; i++) {
    const item = parent.items[i + 1];
    if (item.name === name) {
      return item;
    }
  }
};

// Metadata helpers

export const setAeMetadata = (propName: string, propValue: any) => {
  if (ExternalObject.AdobeXMPScript === undefined) {
    ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
  }
  if (!app.project || !ExternalObject.AdobeXMPScript || !XMPMeta) return;
  const prefix = "xmp:";
  const uri = XMPMeta.getNamespaceURI(prefix);
  const newPropName = prefix + propName;
  let metadata = new XMPMeta(app.project.xmpPacket);
  metadata.setProperty(uri, newPropName, propValue.toString());
  app.project.xmpPacket = metadata.serialize();
};

export const getAeMetadata = (propName: string) => {
  if (ExternalObject.AdobeXMPScript === undefined) {
    ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
  }
  if (!app.project || !ExternalObject.AdobeXMPScript || !XMPMeta) return;
  const prefix = "xmp:";
  const uri = XMPMeta.getNamespaceURI(prefix);
  const newPropName = prefix + propName;
  const metadata = new XMPMeta(app.project.xmpPacket);
  return metadata.getProperty(uri, newPropName);
};

// Вспомогательная функция: получить все свойства с ключами
export function getAllAnimatedProperties(group) {
  var results = [];
  for (var i = 1; i <= group.numProperties; i++) {
    var prop = group.property(i);
    if (prop.numProperties > 0) {
      results = results.concat(getAllAnimatedProperties(prop));
    } else if (prop.isTimeVarying) {
      results.push(prop);
    }
  }
  return results;
}

export function getAnimationBoundaries(layer: Layer) {
  var boundaries = null;

  var props = getAllAnimatedProperties(layer);
  for (var j = 0; j < props.length; j++) {
    var prop = props[j];
    if (!prop.isTimeVarying) continue;

    var keyCount = prop.numKeys;
    for (var k = keyCount; k >= 1; k--) {
      var time = prop.keyTime(k);
      if (!boundaries) {
        boundaries = [time, time];
      } else {
        if (time < boundaries[0]) boundaries[0] = time;
        if (time > boundaries[1]) boundaries[1] = time;
      }
    }
  }
  return boundaries;
}

export function moveAnimatedKeys(
  layer: Layer,
  timeFilter: (t: number) => boolean,
  offsetTime: number
) {
  processAnimationKeys(layer, (prop, k) => {
    var time = prop.keyTime(k);
    if (timeFilter(time)) {
      var value = prop.keyValue(k);
      var easeIn = prop.keyInTemporalEase(k);
      var easeOut = prop.keyOutTemporalEase(k);
      var interpIn = prop.keyInInterpolationType(k);
      var interpOut = prop.keyOutInterpolationType(k);
      var isHold = prop.keyTemporalContinuous(k);

      prop.removeKey(k);
      var newIndex = prop.addKey(time + offsetTime);
      prop.setValueAtKey(newIndex, value);
      prop.setTemporalEaseAtKey(newIndex, easeIn, easeOut);
      prop.setInterpolationTypeAtKey(newIndex, interpIn, interpOut);
      if (isHold) {
        prop.setTemporalContinuousAtKey(newIndex, true);
      }
    }
  });
}

export function deleteAnimationKeys(
  layer: Layer,
  timeFilter: (t: number) => boolean
) {
  processAnimationKeys(layer, (prop, k) => {
    var time = prop.keyTime(k);
    if (timeFilter(time)) {
      prop.removeKey(k);
    }
  });
}

export function processAnimationKeys(
  layer: Layer,
  func: (prop: AnyProperty, keyIdx: number) => void
) {
  var props = getAllAnimatedProperties(layer);

  for (var j = 0; j < props.length; j++) {
    var prop = props[j];
    if (!prop.isTimeVarying) continue;

    var keyCount = prop.numKeys;
    for (var k = keyCount; k >= 1; k--) {
      func(prop, k);
    }
  }
}
