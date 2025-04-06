function readTextFile() {
  // Открываем диалог выбора файла
  var file = File.openDialog("Выберите текстовый файл", "*.txt");

  if (!file) {
    alert("Файл не выбран!");
    return null;
  }

  // Открываем файл и читаем его содержимое
  if (file.open("r")) {
    var content = file.read();
    file.close();
    return content;
  } else {
    alert("Ошибка при открытии файла!");
    return null;
  }
}

// Запускаем функцию и выводим текст в диалоговое окно
var textContent = readTextFile();
if (textContent) {
  alert("Содержимое файла:\n\n" + textContent);
}
