// Выбираем первый выделенный Null-объект
var nullLayer = app.project.activeItem.selectedLayers[0];
if (!nullLayer || !nullLayer.nullLayer) {
  alert("Пожалуйста, выделите Null-объект!");
} else {
  // Настройки анимации
  var startPos = [100, 100]; // Начальная позиция [x,y]
  var endPos = [500, 300]; // Конечная позиция [x,y]
  var duration = 2; // Длительность в секундах

  // Получаем свойство Position
  var pos = nullLayer.property("Position");

  for (var i = 0; i < pos.numKeys; i++) {
    pos.setSpatialAutoBezierAtKey(i + 1, true);
    pos.setInterpolationTypeAtKey(
      keyIndex,
      KeyframeInterpolationType.BEZIER,
      KeyframeInterpolationType.BEZIER
    );
  }

  alert("Плавная анимация успешно создана!");
}
