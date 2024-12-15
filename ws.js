//import express 和 ws 套件
const express = require('express')
const SocketServer = require('ws').Server

//指定開啟的 port
const PORT = 3000

//創建 express 的物件，並綁定及監聽 3000 port ，且設定開啟後在 console 中提示
const server = express()
    .listen(PORT, () => console.log(`Listening on ${PORT}`))

//將 express 交給 SocketServer 開啟 WebSocket 的服務
const wss = new SocketServer({ server });

const clients = {};
let client_id = 0;

//當 WebSocket 從外部連結時執行
wss.on('connection', ws => {

    //連結時執行此 console 提示
    console.log('Client connected');
    
    client_id++;

    const id = client_id;
    clients[id] = {id,ws};

    //當 WebSocket 的連線關閉時執行
    ws.on('close', () => {
        delete clients[id];
        console.log('Close connected')
    })
});

setInterval(() => {
    Object.values(clients).forEach(client => {
        const msg = `${new Date()} sent to client ${client.id}`;
        console.log(msg);
        client.ws.send(msg);
    });

    console.log({clients});

    console.log(`目前線上人數為 ${Object.keys(clients).length}`);
}, 1000);