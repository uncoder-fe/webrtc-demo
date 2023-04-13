// io.js
class IoServer {
    constructor(io) {
        this.io = io;
        this.rtcio = io.of("/webrtc");
        this.rtcio.on("connection", (socket) => {
            this.rtcListen(socket);
        });
    }
    rtcListen(socket) {
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
    }
}

module.exports = IoServer;
