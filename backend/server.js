'use strict'

const express = require('express')
Object.assign(global, { WebSocket: require('ws') })
var StompJs = require('@stomp/stompjs')
const { default: e } = require('express')
const { json } = require('express')

// Constants
const WS_PORT = 8081
const HTTP_PORT = 80
const HOST = '0.0.0.0'

// HTTP serveur for Readyness and liveliness
const app = express()
app.get('/', (req, res) => {
    res.send('Hello World From Node')
})
app.listen(HTTP_PORT, HOST)
console.log(`HTTP Running on http://${HOST}:${HTTP_PORT}`)
const wsArray = []

// Websocket for the frontend
const wss = new WebSocket.Server({ host: HOST, port: WS_PORT })
console.log(`WS Running on ws://${HOST}:${WS_PORT}`)
    // Stomp cliend for RabbitMQ
let client = new StompJs.Client({
    brokerURL: 'ws://rabbitmq.default.svc.cluster.local:15674/ws',
    connectHeaders: {
        login: 'user',
        passcode: 'user',
    },
    debug: function(str) {
        console.log(str)
    },
    reconnectDelay: 2000,
    heartbeatIncoming: 20000,
    heartbeatOutgoing: 0,
})

client.onStompError = function(frame) {
        // Will be invoked in case of error encountered at Broker
        // Bad login/passcode typically will cause an error
        // Complaint brokers will set `message` header with a brief message. Body may contain details.
        // Compliant brokers will terminate the connection after any error
        console.log('Broker reported error: ' + frame.headers['message'])
        console.log('Additional details: ' + frame.body)
    }
    // let subscription = null
client.onConnect = function(frame) {
    // Do something, all subscribes must be done is this callback
    // This is needed because this will be executed after a (re)connect
    console.log('Stomp Connected')
    const subscription = client.subscribe('/queue/game_state', function(
        message,
    ) {
        console.log(message)
        wsArray.forEach((ws) => {
            ws.send(
                JSON.stringify({ type: message.destination, value: message.body }),
            )
        })
        console.log('message sent to the client')
    })
}
client.activate()

function publishInput(body) {
    return new Promise((resolve) => {
        client.publish({
            destination: '/queue/input',
            body: JSON.stringify(body),
        })
    })
}

function publishConnection(time) {
    return new Promise((resolve) => {
        client.publish({
            destination: '/queue/connection',
            body: JSON.stringify({ type: 'connection', time: time }),
        })
    })
}

wss.on('connection', function connection(ws) {
    ws.on('message', async function incoming(message) {
        const msg = JSON.parse(message)
        console.log(`received: ${msg}`)
        console.log(`message type: ${msg.type}`)
        console.log(`message value: ${msg.value}`)
        if (msg.type === 'input') {
            publishInput(msg.value)
        } else if (msg.type === 'connection') {
            publishConnection(msg.time)
        }
    })

    ws.on('close', (reasonCode, description) => {
        console.log('Closing connection')
            // subscription.unsubscribe()
            // client.deactivate()
        const index = wsArray.indexOf(ws)
        if (index > -1) {
            wsArray.splice(index, 1)
        }
    })
    ws.on('disconnect', (reasonCode, description) => {
        console.log('Disconnecting')
            // subscription.unsubscribe()
            // client.deactivate()
        const index = wsArray.indexOf(ws)
        if (index > -1) {
            wsArray.splice(index, 1)
        }
    })
    wsArray.push(ws)
        // ws.send('something');
})