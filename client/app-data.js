import { io } from 'socket.io-client'
import axios from 'axios'

// 获取Peer
async function createPeer(chatList) {
    const turnConf = {
        iceServers: [
            {
                urls: "stun:stun1.l.google.com:19302", // 免费的 STUN 服务器
            },
            {
                urls: 'turn:1.1.1.1:3478',
                username: 'xx',
                credential: '123456'
            }
        ]
    }
    // 创建RTCPeerConnection实例
    const peer = new RTCPeerConnection(turnConf)
    peer.oniceconnectionstatechange = (evt) => {
        console.log('ICE connection state change: ' + evt.target.iceConnectionState)
    }
    const chatChannel = peer.createDataChannel('messagechannel') // 创建 dataChannel
    chatChannel.onerror = (error) => {
        console.log(error)
    }
    chatChannel.onopen = (event) => {
        // 监听连接成功
        console.log('chatChannel onopen', event)
    }
    chatChannel.onclose = function (event) {
        // 监听连接关闭
        console.log('chatChannel onclose', event)
    }
    chatChannel.onmessage = (e) => {
        // 监听消息接收
        console.log('channel onmessage', e.data)
    }
    peer.ondatachannel = (event) => {
        const receiveChannel = event.channel
        receiveChannel.onerror = (error) => {
            console.log(error)
        }
        receiveChannel.onmessage = (e) => {
            // 监听消息接收
            console.log('channel onmessage', e, e.data)
            const { username, content, time } = JSON.parse(e.data)
            const div = document.createElement('div')
            div.innerHTML = `${time}:${username}:${content}`
            chatList.appendChild(div)
        }
        receiveChannel.onopen = (event) => {
            // 监听连接成功
            console.log('chatChannel onopen', event)
        }
    }
    return { peer, chatChannel }
}

window.onload = async () => {
    // 视频元素
    const chatList = document.querySelector('#chat-list')
    const chatInput = document.querySelector('#chat-input')
    // apply/reply按钮
    const apply_btn = document.querySelector('#apply_btn')
    const reply_btn = document.querySelector('#reply_btn')

    // 当前是谁
    const username = `我是${Math.floor(Math.random() * 100)}号`
    // clients
    let clients = []

    // peer
    const { peer, chatChannel } = await createPeer(chatList)

    // 创建socket通信实例
    let socket = null
    socket = io(`https://xx.com/webrtc`, {
        path: "/xx-server/socket.io/",// 可以指定位置
        auth: { username }
    })
    socket.on('connect', () => {
        console.log('连接成功', socket)
    })
    socket.on('connect_error', (error) => {
        console.log('连接失败', error)
    })
    // reader，接收 offer，交换 SDP.
    socket.on('offer', async (data) => {
        let offer = new RTCSessionDescription(data.offer)
        await peer.setRemoteDescription(offer)
        let answer = await peer.createAnswer()

        socket.emit('answer', {
            to: data.from, // 呼叫端 Socket ID，从server里获取到的
            answer
        })
        await peer.setLocalDescription(answer)
        // 发送 candidate
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candid', {
                    to: data.from, // 呼叫端 Socket ID，从server里获取到的
                    candid: event.candidate
                })
            }
        }
    })
    // sender,接收 anser，交换 SDP.
    socket.on('answer', (data) => {
        let answer = new RTCSessionDescription(data.answer)
        peer.setRemoteDescription(answer)
    })
    // reader,sender接收 candidate
    socket.on('candid', (data) => {
        console.log('candidate', data.candid)
        let candid = new RTCIceCandidate(data.candid)
        peer.addIceCandidate(candid)
    })

    try {
        // 打电话
        apply_btn.addEventListener('click', async () => {
            // 这里取第1个
            const socket_id = clients[0].id
            const offer = await peer.createOffer({
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1
            })
            // 呼叫端设置本地offer描述，触发onicecandidate
            await peer.setLocalDescription(offer)
            socket.emit('offer', {
                to: socket_id, // 接收端 Socket ID
                offer
            })
            // 发送 candidate
            peer.onicecandidate = (event) => {
                console.log('onicecandidate', event)
                // 获取SDP
                if (event.candidate) {
                    socket.emit('candid', {
                        to: socket_id, // 接收端 Socket ID
                        candid: event.candidate
                    })
                }
            }
        })
        // 发消息
        reply_btn.addEventListener('click', async () => {
            const message = { content: chatInput.value, username, time: new Date().toLocaleString() }
            chatChannel.send(JSON.stringify(message))
            const div = document.createElement('div')
            div.innerHTML = `${message.time}:${message.username}:${message.content}`
            chatList.appendChild(div)
        })
    } catch (error) {
        console.log(error)
    }
    // 更新clients
    const getClients = document.querySelector('#getClients')
    getClients.addEventListener('click', () => {
        axios.get('https://xx.com/xx-server/io-clients').then((res) => {
            const { data } = res
            clients = data.data
            console.log('clients', data.data)
        })
    })
}
