//import express 和 ws 套件
const express = require('express')
const SocketServer = require('ws').Server
const jwt = require('jsonwebtoken')
const axios = require('axios')

//指定開啟的 port
const PORT = 3001
const JWT_KEY = 'testjwt';
const API_HOST = 'http://localhost:3000'

const verifyToken = async (token,key) => {
    if(!token) return {};
    return new Promise((resolve,reject) =>
       jwt.verify(token,key,(err,decoded) => err ? reject({}) : resolve(decoded))
    );
}

const sentToAll = ({user_id, user_name, message}) => {
    Object.values(clients).forEach(client => {
        client.ws.send(JSON.stringify({
            status: 'success',
            route: 'message',
            data: {
                user_id,
                user_name,
                message,
            }
        }));
    });
}

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
    clients[id] = { id, ws, login: false, user_id: undefined };

    ws.on('message', async (message) => {
        const parse = JSON.parse(message);
        if (parse) {
            switch (parse.route) {
                case 'auth':
                    let login = false;
                    try {
                        login = await verifyToken(parse.token, JWT_KEY);
                    }
                    catch (e) {}

                    console.log({login, exp: (new Date(login.exp).toISOString())});

                    if (login && login.exp >= (new Date()).getTime()) {
                        clients[id].login = true;
                        clients[id].user_id = login.user_id;
                        clients[id].user_name = login.user_name;

                        ws.send(JSON.stringify({
                            status: 'success',
                            route: 'auth',
                            message: 'login success'
                        }));

                        sentToAll({
                            user_id: clients[id].user_id,
                            user_name: clients[id].user_name,
                            message: '上線了',
                        });
                    } else {
                        ws.send(JSON.stringify({
                            status: 'error',
                            route: 'auth',
                            message: 'login fail'
                        }));
                    }

                    break;

                case 'message':
                    try {
                        const response = await axios.post(API_HOST + '/message/', {
                            user_id: clients[id].user_id,
                            message: parse.message,
                        });

                        if (!response.data.status) {
                            throw new Error('api error' + response.data.message);
                        }

                        sentToAll({
                            user_id: clients[id].user_id,
                            user_name: clients[id].user_name,
                            message: parse.message,
                        });
                    } catch (e) {
                        console.log(e.message);
                        ws.send(JSON.stringify({
                            status: 'error',
                            route: 'message',
                            message: 'server error'
                        }));
                    }
                    break;

                default:
                    ws.send(JSON.stringify({
                        status: 'error',
                        route: 'error',
                        message: 'unknow type'
                    }));
            }
        }
    });

    //當 WebSocket 的連線關閉時執行
    ws.on('close', () => {
        sentToAll({
            user_id: clients[id].user_id,
            user_name: clients[id].user_name,
            message: '已離線',
        });

        delete clients[id];
        console.log('Close connected')
    })
});

setInterval(() => {
    Object.values(clients).forEach(client => {
        const message = `${new Date()} sent to client ${client.id}`;
        client.ws.send(JSON.stringify({
            status: 'success',
            route: 'ping',
            message
        }));
    });

    console.log(`目前線上人數為 ${Object.keys(clients).length}`);
}, 10 * 1000);