import './App.css'
import * as BABYLON from 'babylonjs'
import React, { useRef, useEffect, useState } from 'react'

import { w3cwebsocket as W3CWebSocket, IMessageEvent } from 'websocket'

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scene, setScene] = useState<BABYLON.Scene>()
  const [client, setClient] = useState<W3CWebSocket>()

  function onmessage(message: IMessageEvent) {
    console.log(message)
    const data = JSON.parse(message.data.toString())
    const value = JSON.parse(data.value.toString())
    console.log(`value: ${JSON.stringify(value)}`)
    if (value.type === 'instantiate') {
      let date = Date.now();
      console.log(`instantiate time: ${value.time}`);
      console.log(`instantiate date: ${date}`);
      console.log(`instantiate operation: ${date - value.time}`);
      if (value.mesh === 'box') {
        // {"type": "instantiate", "mesh": "box", "name": "Box", "scale": 4}
        console.log(`Instancing a ${value.mesh} object`)
        const box = BABYLON.Mesh.CreateBox(
          value.name,
          value.scale ? value.scale : 4.0,
          scene,
        )
        scene!.addMesh(box)
      }
    } else if (value.type === 'translation') {
      let date = Date.now();
      console.log(`translation time: ${value.time}`);
      console.log(`translation time: ${value.time}`);
      console.log(`translation date: ${date}`);
      console.log(`translation operation: ${date - value.time}`);
      // {"type": "translation", "vector": {"x": 0, "y":1, "z":0}, "name": "Box", "distance": 5}
      console.log(`Apply translation to ${value.name} object`)
      const mesh:
        | BABYLON.AbstractMesh
        | undefined
        | null = scene!.getMeshByName(value.name)
      mesh!.translate(
        new BABYLON.Vector3(value.vector.x, value.vector.y, value.vector.z),
        value.distance ? value.distance : 0,
      )
      console.log(`New position: ${mesh?.position.toString()}`)
    }
  }

  useEffect(() => {
    if (canvasRef.current) {
      let myClient = new W3CWebSocket(
        'ws://localhost/plugins/cloud-game-engine-game-view-backend/ws',
      )
      myClient.onopen = () => {
        console.log('WebSocket Client Connected')
        const canvas = canvasRef.current
        const engine = new BABYLON.Engine(canvas, true)
        const sceneTmp = new BABYLON.Scene(engine)
        sceneTmp.clearColor = new BABYLON.Color4(255, 255, 255, 255)
        const camera = new BABYLON.FreeCamera(
          'camera',
          new BABYLON.Vector3(0, 0, -10),
          sceneTmp,
        )
        camera.setTarget(BABYLON.Vector3.Zero())
        sceneTmp.actionManager = new BABYLON.ActionManager(sceneTmp)
        sceneTmp.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            {
              trigger: BABYLON.ActionManager.OnKeyDownTrigger,
            },
            (evt) => {
              console.log(`${evt.sourceEvent.key} button was pressed`)
              myClient.send(
                JSON.stringify({
                  type: 'input',
                  value: { action: 'KEY_DOWN', key: evt.sourceEvent.key, time: Date.now()},
                }),
              )
            },
          ),
        )
        engine.runRenderLoop(() => sceneTmp.render())
        setClient(myClient)
        setScene(sceneTmp)
      }
    }
  }, [canvasRef])

  useEffect(() => {
    if (client && scene) {
      client.onmessage = onmessage;
      client.send(JSON.stringify({ type: 'connection', time: Date.now()}))
    }
  }, [client, scene])

  return <canvas id="babylon-canvas" ref={canvasRef} width={640} height={425} />
}

export default App
