{
  function toSeconds(timeStr) {
    const parts = timeStr.split(':').map(part => parseInt(part, 10));
    return parts[0] * 3600 + parts[1] * 60 + parts[2] + parts[3] / 30; // предполагаем 30 кадров в секунду
  }
  
  function trimStart(str) {
    return str.replace(/^\s+/, '');
  }

  var macros = {};

  function applyParamsToData(data, params) {
    if(Array.isArray(params)){
      var paramsDict = {}
      params.forEach(param=>{
        paramsDict[param.name] = param.value
      })
      params = paramsDict
    }

    function resolve(value) {
      if (typeof value === "string" && value.startsWith("$")) {
        const key = value.slice(1);
        return params.hasOwnProperty(key) ? params[key] : value;
      }
      return value;
    }

    function recurse(value) {
      if (Array.isArray(value)) {
        return value.map(recurse);
      } else if (value && typeof value === "object") {
        const newObj = {};
        for (const key in value) {
          newObj[key] = recurse(value[key]);
        }
        return newObj;
      } else {
        return resolve(value);
      }
    }

    return recurse(data);
  }
}

Subtitles
  = _ blocks:(Block / CommandBlock / MacroBlock / MacroDeclaration)+ _ { return blocks; }

Block
  = start:Time _ "-" _ end:Time __
    textLines:Text
    __
    {
      return {
        start: toSeconds(start),
        end: toSeconds(end),
        textLines: textLines // Добавляем trim() для всего текста
      };
    }

CommandBlock
  = _ ">" _ name:CommandName _ ("\n" / "\r\n")? _ params:PropertiesBlock __ {
      return {
        command: {
          name: name,
          params: params
        }
      };
    }

CommandName
  = chars:[^ \n\r]+ { return chars.join("").trim(); }

MacroBlock
  = _ "/" _ name:CommandName _ "\n"? _ params:PropertiesBlock? __
    {
      if(name in macros){
        let group = macros[name].blocks
        if(params){
          group = applyParamsToData(group, params)
        }
        return {
          blockGroup: group
        };
      }
    }

MacroDeclaration
  = "macro" _ name:MacroDeclarationName _ "{" _ "\n"? _ blocks:(CommandBlock / MacroBlock)+ _ "\n"? _ "}"
    __
    {
      macros[name] = {
        name: name,
        blocks: blocks
      }
      return {
        macro: macros[name]
      };
    }
MacroDeclarationName
  = chars:[^ \n\r{]+ { return chars.join("").trim(); }

Time
  = [0-9][0-9] ":" [0-9][0-9] ":" [0-9][0-9] ":" [0-9][0-9] { return text(); }

Text
  = lines:NonEmptyLine+ { return lines; }

NonEmptyLine
  = _ text:[^\n]+ "\n"? { 
      return trimStart(text.join("")).trimRight(); 
    }

PropertiesBlock
  = _ props:PropertyLine+ {
    var dict = {}
    props.forEach(prop => {
      dict[prop.name] = prop.value
    })
    return dict
  }

PropertyLine
  = _ name:PropName _ ":" _ value:PropValue _ ("\n" / "\r\n")? {
      return {
        name: name,
        value: value
      };
    }

PropName
  = chars:[^:\n\r]+ { return chars.join("").trim(); }

PropValue
  = chars:[^\n\r]+ { return chars.join("").trim(); }

// Правила для пробелов
_ "whitespace"
  = [ \t]*

__ "optional newlines"
  = (_ "\n" _)*
