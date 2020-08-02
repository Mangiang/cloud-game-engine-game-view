'use strict'

const express = require('express')
Object.assign(global, { WebSocket: require('ws') })
var StompJs = require('@stomp/stompjs')
const { default: e } = require('express')
const { json } = require('express')
const { Kafka } = require('kafkajs')
const utf8 = require('utf8')

// Constants
const WS_PORT = 8081
const HTTP_PORT = 80
const HOST = '0.0.0.0'

const wsArray = []


const kafka = new Kafka({
    clientId: 'cloud-game-engine-game-view-backend',
    brokers: ['kafka-headless.default.svc.cluster.local:9092'],
    sasl: {
        mechanism: 'plain', // plain or scram-sha-256 or scram-sha-512
        username: 'user',
        password: 'user',
    },
})
const producer = kafka.producer()
const consumer = kafka.consumer({ groupId: "game_view" })

async function connecting() {
    await producer.connect()
    await consumer.connect()
}

async function consumerSubscribe() {
    await consumer.subscribe({ topic: 'game_state' })
}

async function disconnecting() {
    await producer.disconnect()
    await consumer.disconnect()
}

async function produce(topic, messages) {
    console.log(`Sending: ${JSON.stringify()}`)
    await producer.send({
        topic: topic,
        messages: messages,
    })
}

async function handleGameState(message) {
    console.log(`message ${message}`)
    const message_json = JSON.parse(message)
    console.log(`message_json ${message_json}`)
    wsArray.forEach((ws) => {
        ws.send(
            JSON.stringify({ value: {...message_json } }),
        )
    })
    console.log('message sent to the client')
}

const handlers = {
    "game_state": handleGameState
}

async function consume(topic) {
    await consumer.run({
        eachMessage: async({ topic, partition, message }) => {
            handlers[topic](message.value);
        },
    })
}


async function init() {

    await connecting();
    await consumerSubscribe();

    // HTTP serveur for Readyness and liveliness
    const app = express()
    app.get('/', (req, res) => {
        res.send('Hello World From Node')
    })
    app.listen(HTTP_PORT, HOST)
    console.log(`HTTP Running on http://${HOST}:${HTTP_PORT}`)
        // Websocket for the frontend
    const wss = new WebSocket.Server({ host: HOST, port: WS_PORT })
    console.log(`
        WS Running on ws: //${HOST}:${WS_PORT}`)
    wss.on('connection', async function connection(ws) {

        ws.on('message', async function incoming(message) {
            const msg = JSON.parse(message)
            console.log(`received: ${message}`)
            console.log(`message type: ${msg.type}`)
            console.log(`message value: ${msg.value}`)
            if (msg.type === 'input') {
                produce('input', [{ value: JSON.stringify({...msg.value }) }])
            } else if (msg.type === 'connection') {
                produce('connection', [{ value: JSON.stringify({ time: msg.time }) }])
            }
        })

        ws.on('close', (reasonCode, description) => {
            console.log('Closing connection')
            const index = wsArray.indexOf(ws)
            if (index > -1) {
                wsArray.splice(index, 1)
            }
        })
        ws.on('disconnect', (reasonCode, description) => {
            console.log('Disconnecting')
            const index = wsArray.indexOf(ws)
            if (index > -1) {
                wsArray.splice(index, 1)
            }
        })
        wsArray.push(ws)
    })

    await consume();
}

init().catch(reason => console.error(JSON.stringify(reason)));