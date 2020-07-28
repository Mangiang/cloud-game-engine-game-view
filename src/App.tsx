import './App.css'
import * as BABYLON from 'babylonjs'
import React, { useRef } from 'react'
import { useEffect } from 'react'

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const engine = new BABYLON.Engine(canvas, true)
      const scene = new BABYLON.Scene(engine)
      scene.clearColor = new BABYLON.Color4(255, 255, 255, 255)
      const camera = new BABYLON.FreeCamera(
        'camera',
        new BABYLON.Vector3(0, 0, -10),
        scene,
      )
      camera.setTarget(BABYLON.Vector3.Zero())
      const box = BABYLON.Mesh.CreateBox('Box', 4.0, scene)

      engine.runRenderLoop(() => scene.render())
    }
  })

  return <canvas id="babylon-canvas" ref={canvasRef} width={640} height={425} />
}

export default App
