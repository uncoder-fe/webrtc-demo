const Koa = require("koa");
const Router = require("@koa/router");
const cors = require("@koa/cors");
const http = require("http");
const SocketIO = require("socket.io");
const SocketIoApi = require("./io.js");

const app = new Koa();
const router = new Router();

// 呼叫端调用，获取已连接的接收端列表
router.get("/io-clients", async (ctx, next) => {
    // 拿到全局的socketIo
    let { io } = ctx.app.context;
    try {
        let data = await io.of("/webrtc").fetchSockets();
        let resarr = data
            .map((row) => ({
                id: row.id,
                auth: row.handshake.auth,
                data: row.data,
            }))
        ctx.body = { code: 200, data: resarr };
    } catch (error) {
        ctx.body = error.toString();
    }
});

app.use(cors());
app.use(router.routes());
app.use(router.allowedMethods());

// http server
const server = http.createServer(app.callback());

// socket server
try {
    const io = new SocketIO.Server(server, {
        cors: { origin: "*" },
        allowEIO3: true,
    });

    io.on("connection", (socket) => {
        console.log(socket.id);
    });

    io.on("connect_error", (error) => {
        console.log(error)
    });

    // new SocketIoApi(io);
    const rtcio = io.of("/webrtc")
    rtcio.on("connection", (socket) => {
        // 发送端｜发送 offer
        socket.on("offer", (json) => {
            let { to, offer } = json;
            let target = this.rtcio.sockets.get(to);
            if (target) {
                target.emit("offer", {
                    from: socket.id,
                    offer,
                });
            } else {
                console.error("offer 接收方未找到");
            }
        });
        // 接收端｜发送 answer
        socket.on("answer", (json) => {
            let { to, answer } = json;
            let target = this.rtcio.sockets.get(to);
            // console.log(to, socket)
            if (target) {
                target.emit("answer", {
                    from: socket.id,
                    answer,
                });
            } else {
                console.error("answer 接收方未找到");
            }
        });
        // 发送端｜发送 candidate
        socket.on("candid", (json) => {
            let { to, candid } = json;
            let target = this.rtcio.sockets.get(to);
            // console.log(to, socket)
            if (target) {
                target.emit("candid", {
                    from: socket.id,
                    candid,
                });
            } else {
                console.error("candid 接收方未找到");
            }
        });
    });

    // 将socketIo实例存到全局上下文
    app.context.io = io;
} catch (error) {
    console.log("error", error)
}
// http监听端口
server.listen(9800, () => {
    console.log(`listen to http://localhost:9800`);
});