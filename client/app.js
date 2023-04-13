import { io } from 'socket.io-client'
import axios from 'axios'
import { getUserAgentInfo } from './util'

// 获取Peer
async function createPeer(local_video, remote_video) {
    const turnConf = {
        iceServers: [
            // {
            //   urls: "stun:stun1.l.google.com:19302", // 免费的 STUN 服务器
            // },
            // {
            //   urls: 'turn:1.1.1.1:3478',
            //   username: 'xx',
            //   credential: '123456'
            // }
        ]
    }
    // 创建RTCPeerConnection实例
    const peer = new RTCPeerConnection(turnConf)
    peer.oniceconnectionstatechange = (evt) => {
        console.log('ICE connection state change: ' + evt.target.iceConnectionState)
    }
    // media
    const local_stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    })
    // 2. 将本地视频流添加到实例中
    local_stream.getTracks().forEach((track) => {
        peer.addTrack(track, local_stream)
    })
    // 3. 接收远程视频流并播放
    peer.ontrack = async (event) => {
        let [remoteStream] = event.streams
        remote_video.srcObject = remoteStream
    }
    return peer
}

window.onload = async () => {
    // 视频元素
    const local_video = document.querySelector('#local_video')
    const remote_video = document.querySelector('#remote_video')

    // apply/reply按钮
    const apply_btn = document.querySelector('#apply_btn')
    const reply_btn = document.querySelector('#reply_btn')

    // 当前是谁
    const username = getUserAgentInfo().includes('Edg') ? 'edg' : 'chrome'
    const role = username === 'edg' ? 'reader' : 'sender'
    // 是否是接收者
    const isReader = username === 'edg'
    // clients
    let clients = []

    // peer
    const peer = await createPeer(local_video, remote_video, isReader)

    // 创建socket通信实例
    let socket = null
    socket = io(`http://localhost:9800/webrtc`, {
        auth: {
            username,
            role
        }
    })
    socket.on('connect', () => {
        console.log('连接成功', socket)
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
            // 这里随便取第1个
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
        // 接电话
        reply_btn.addEventListener('click', async () => { })
    } catch (error) {
        console.log(error)
    }
    // 更新clients
    const getClients = document.querySelector('#getClients')
    getClients.addEventListener('click', () => {
        axios.get('http://localhost:9800/io-clients').then((res) => {
            const { data } = res
            clients = data.data
            console.log('clients', data.data)
        })
    })
}
