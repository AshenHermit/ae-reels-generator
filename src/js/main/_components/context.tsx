import React from "react";
import { ScriptData } from "../../../shared/script-data";

export type ContextType = {
    scriptData: ScriptData
    setScriptData: (scriptData: ScriptData)=>void
}
const ScriptDataContext = React.createContext<ContextType>({
    scriptData: {nodes: [], layersOrder: []},
    setScriptData: ()=>{}
});

export function ScriptDataProvider({children}: React.PropsWithChildren){
    const [scriptData, setScriptData] = React.useState<ScriptData>({nodes: [], layersOrder: []})
    return (
        <ScriptDataContext.Provider value={{
            scriptData, setScriptData
        }}>
            {children}
        </ScriptDataContext.Provider>
    )
}

export function useScriptDataCtx(): ContextType{
    return React.useContext(ScriptDataContext)
}