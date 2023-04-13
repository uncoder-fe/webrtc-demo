# pion-turn
pion-turn创建turn服务

# proxy安装
go env -w GOPROXY=https://goproxy.cn

# build
cd ./pion-turn/examples/turn-server/simple

# run
./simple -public-ip 1.1.1.1 -users xx=123456

# 后台run
nohup ./simple -public-ip 1.1.1.1 -users xx=123456 &

# 是否正常
netstat -nplu

# 检测
turn:1.1.1.1:3478
xx
123456
https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/