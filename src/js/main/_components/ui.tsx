import React from "react"
import { evalTS } from "../../lib/utils/bolt";
import { useScriptDataCtx } from "./context";
import { ScriptParser } from "./script-parser";
import { ScriptNode } from "../../../shared/script-data";
import { Compositor } from "./compositor";

export function LoaderPanel(){
    const [loadedFilepath, setLoadedFilepath] = React.useState<string>("")
    const [error, setError] = React.useState<any>(null)
    const {scriptData, setScriptData} = useScriptDataCtx()

    const loadFile = React.useCallback(async()=>{
        let res = await evalTS("selectReadFile");
        if(res){
            setLoadedFilepath(res.filepath)
            const parser = new ScriptParser()
            try{
                setError(null)
                const data = await parser.parseFile(res.filepath, res.content)
                setScriptData(data)
                // setError(parser.parseDSL(res.content))
                // setError(parser.generateParserCode())
            }catch(e){
                if (e instanceof Error)
                setError([e.message, e.stack])
            }
        }
    }, [setScriptData])

    return <div className="flex flex-col items-center gap-4">
        <button className="button w-full" onClick={loadFile}>загрузить сценарий</button>
        {error ? 
            <pre className="error">
                {JSON.stringify(error, null, 2)}
            </pre>
        : null}
        {loadedFilepath ? 
            <div>
                файл сценария: {loadedFilepath}
            </div>
        : null}
    </div>
}

export function NodeItem({node}: {node: ScriptNode}){
    let content = <></>
    if(node.type == "footage"){
        content = <div><span className="secondary">{node.layer}</span>{node.filepath}</div>
    }
    if(node.type == "text"){
        content = <div className="flex items-center gap-4">
            <div className="secondary node-time"><div>{node.start.toFixed(2)}</div> - <div>{node.end.toFixed(2)}</div></div>
            <div>{node.text}</div>
        </div>
    }
    return <div className="flex flex-col">
        <div className="secondary">{node.type}</div>
        {content}
    </div>
}

export function ScriptView(){
    const {scriptData} = useScriptDataCtx()

    return <div className="flex flex-col gap-4">
        <h3>Сценарий</h3>
        {scriptData.nodes.map(node=><NodeItem node={node}/>)}
    </div>
}

export function GeneratorPanel(){
    const {scriptData} = useScriptDataCtx()
    const [isGenerating, setIsGenerating] = React.useState(false)
    const [progress, setProgress] = React.useState(0)

    const onUpdate = React.useCallback((nodeIndex: number)=>{
        setProgress(nodeIndex)
    }, [scriptData])

    const smooth = React.useCallback(async ()=>{
        let compositor = new Compositor(scriptData)
        await compositor.smoothLayers()
    }, [scriptData])

    const generate = React.useCallback(async ()=>{
        setIsGenerating(true)
        setProgress(0)
        let compositor = new Compositor(scriptData, onUpdate)
        await compositor.compose()
        setIsGenerating(false)
    }, [scriptData])

    return <div className="flex flex-col">
        <h3>Генерация</h3>
        <div className="flex items-center gap-4">
            <button onClick={generate}>
                {isGenerating ? `${progress} / ${scriptData.nodes.length}` : "сгенерировать"}
            </button>
            <button onClick={smooth}>
                сгладить слои
            </button>
        </div>
    </div>
}

export function UIComponent(){
    return <div className="flex flex-col gap-4">
        <LoaderPanel/>
        <hr/>
        <GeneratorPanel/>
        <hr/>
        <ScriptView/>
    </div>
}