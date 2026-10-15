// 서버 진입점: 정적 파일 서빙(public, shared) + Socket.io 연결
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './network/socket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use('/shared', express.static(path.join(__dirname, '../shared')));
app.use(express.static(path.join(__dirname, '../public')));

const server = http.createServer(app);
const io = new Server(server);
registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`listening on ${PORT}`));