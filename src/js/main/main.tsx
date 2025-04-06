import { useEffect, useState } from "react";
import { os, path } from "../lib/cep/node";
import {
  csi,
  evalES,
  evalFile,
  openLinkInBrowser,
  subscribeBackgroundColor,
  evalTS,
} from "../lib/utils/bolt";

import "./main.scss";
import { UIComponent } from "./_components/ui";
import { ScriptDataProvider } from "./_components/context";

const Main = () => {
  const [bgColor, setBgColor] = useState("#282c34");

  //* Demonstration of Traditional string eval-based ExtendScript Interaction
  const jsxTest = () => {
    console.log(evalES(`helloWorld("${csi.getApplicationID()}")`));
  };

  //* Demonstration of End-to-End Type-safe ExtendScript Interaction
  const jsxTestTS = () => {
    evalTS("helloStr", "test").then((res) => {
      console.log(res);
    });
    evalTS("helloNum", 1000).then((res) => {
      console.log(typeof res, res);
    });
    evalTS("helloArrayStr", ["ddddd", "aaaaaa", "zzzzzzz"]).then((res) => {
      console.log(typeof res, res);
    });
    evalTS("helloObj", { height: 90, width: 100 }).then((res) => {
      console.log(typeof res, res);
      console.log(res.x);
      console.log(res.y);
    });
    evalTS("helloVoid").then(() => {
      console.log("function returning void complete");
    });
    evalTS("helloError", "test").catch((e) => {
      console.log("there was an error", e);
    });
  };

  const nodeTest = () => {
    alert(
      `Node.js ${process.version}\nPlatform: ${
        os.platform
      }\nFolder: ${path.basename(window.cep_node.global.__dirname)}`
    );
  };

  useEffect(() => {
    if (window.cep) {
      subscribeBackgroundColor(setBgColor);
    }
  }, []);

  return (
    <div className="app" style={{ backgroundColor: bgColor }}>
      <ScriptDataProvider>
        <UIComponent/>
      </ScriptDataProvider>
    </div>
  );
};

export default Main;
