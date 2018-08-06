var net = require('net');
var HEADLEN = 32;
var BoardSNLEN = 5;

var HOST = '15.200.19.156';
var PORT = 6969;
const allClientList = [];
var bpServer = net.createServer();

var NATS = require('nats');
var nats = NATS.connect();//括号内写入nats服务器的IP

var sqlite3 = require('sqlite3');

//消息头的统一结构体
const _headSt = new _struct.Struct({
    u32FrameHeader: 'uint32',
    u16MsgType: 'uint16',
    u16MsgLength: 'uint16',
    u16frame: 'uint16',
    u16SubSysCode: 'uint16',
    boardsn: ['uint8', '00000000000000000000', 20]
}, 0, true);

/*启动接受LTE Client的Service*/
function startBPServer() {
    bpServer.on('connection', function (client) {
        client.name = "";
        client.setTimeout(20 * 1000, function () {
            console.warn("设备client" + client.name + "断开连接");
            broadcast();
        });
        /*将连接放入数组中*/
        allClientList.push(client);
        /*连接传送过来的数据*/
        client.on('data', function (data) {
            if (data != null) {
                handleMsg(client, data);
            }
        });
        /*监听客户端终止*/
        client.on('end', function () {//如果某个客户端断开连接，node控制台就会打印出来
            broadcast();
            console.log(client.remoteAddress + "[" + client.name + "]" + 'quit');
        });
        /*记录错误*/
        client.on('error', function (e) {
            broadcast();
            console.log(e);
        });
    });
    bpServer.listen(PORT);
    console.log('Server listening on ' + PORT);
}

/**
 * 消息头统一预处理，消息体分别对应处理
 * @param client 传入LTE设备对应的client
 * @param data 传入待解析的数据
 */
function handleMsg(client, data) {
    try {
        let headBuf = new Buffer(HEADLEN);
        let bodyBuf = new Buffer(data.length - HEADLEN);
        let boardSNBuf = new Buffer(BoardSNLEN);
        //将接收的数据划分成消息头和消息体
        data.copy(headBuf, 0, 0, HEADLEN);//消息头
        data.copy(bodyBuf, 0, HEADLEN, data.length);//消息体
        data.copy(boardSNBuf,0,HEADLEN - BoardSNLEN,HEADLEN);//BoardSN
        //publish消息到nats队列
        nats.publish('foo',data);
        //接受nast服务器传过来的nats服务器订阅信息
        nats.subscribe('foo', function(msg) {
            console.log('Received a message: ' + msg);
        });
        // 请求具有超时的单个响应。
        nats.requestOne('foo', null, {}, 1000, function(response) {
            if(response instanceof NATS.NatsError && response.code === NATS.REQ_TIMEOUT) {
                console.log('Request for foo timed out.');
                //从设备接受的data,存储到数据库中
                var db = new sqlite3.Database('data.db');//创建数据库
                db.run("create table test(FrameHeader varchar(8)," +
                    "MsgType varchar(4)," +
                    "MsgLength varchar(4)," +
                    "Frame varchar(4)," +
                    "SubSysCode varchar(4)," +
                    "BoardSN varchar(20)");//创建表test
                SaveData(data);
                return;
            }
           // console.log('Got a response for foo: ' + response);
        });


        /*按照MsgType 将消息体进行不同的处理*/
        switch (msgType) {

        }
    }
    catch (e) {
        console.log(e);
    }
}

/**
 * 处理客户端断开问题，无参数传入
 * @param
 * @param
 */
function broadcast() {
    let cleanup = [];//断开了的客户端们
    for (let i = 0; i < allClientList.length; i++) {
        //检查socket的可写状态
        if (allClientList[i].connecting) {
        } else {
            /*socket不可写，则将其从列表中移除*/

            //移除LTE设备的client和状态机
            let mBoardSn = allClientList[i].name;
            if (mBoardSn.length !== 0) {
                let ifRemoved = _LteFsm.removeLteFsm(mBoardSn);
                if (ifRemoved) {
                    console.warn("设备[" + mBoardSn + "]断开连接，状态机已移除");
                }
            }
            allClientList[i].destroy();
            cleanup.push(allClientList[i]);
        }
    }
    /*删除掉服务器的客户端数组中，已断开的客户端*/
    for (let i = 0; i < cleanup.length; i++) {
        if (cleanup[i].name.length !== 0) {
            clientMap.delete(cleanup[i].name);
        }
        allClientList.splice(allClientList.indexOf(cleanup[i]), 1);
    }
}

/**
 *存储data数据到数据库中
 *  参数：data
 *  分解数据，分类别传入数据库
 */
function  SaveData(data) {
    let FrameHeaderBuf = new Buffer(u32FrameHeader.length);
    let MsgTypeBuf = new Buffer(u16MsgType.length);
    let MsgLengthBuf = new Buffer(u16MsgLength.length);
    let FrameBuf = new Buffer(u16frame.length);
    let SubSysCode = new Buffer(u16SubSysCode.length);
    let BoardSN = new Buffer(boardsn.length);
    data.copy(FrameHeaderBuf, 0, 0, u32FrameHeader.length);//取出FrameHeaderBuf
    data.copy(MsgTypeBuf, 0, u32FrameHeader.length, MsgTypeBuf.length);//取出MsgTypeBuf
    data.copy(MsgLengthBuf, 0, u32FrameHeader.length + u16MsgType.length, MsgLengthBuf.length);//取出MsgLengthBuf
    data.copy(FrameBuf, 0, u32FrameHeader.length+u16MsgType.length+u16MsgLength.length, FrameBuf.length);//取出FrameBuf
    data.copy(SubSysCode, 0, u32FrameHeader.length+u16MsgType.length+u16MsgLength.length+u16frame.length , u16SubSysCode.length);//取出SubSysCode
    data.copy(BoardSN, 0, u32FrameHeader.length+u16MsgType.length+u16MsgLength.length+u16frame.length+boardsn.length , BoardSN.length);//取出BoardSN
    var sql = "insert into test(FrameHeader,MsgType,MsgLength,Frame,SubSysCode,BoardSN)" +
        "values(?,?,?,?)";
    db.run(sql,[FrameHeaderBuf,MsgTypeBuf,MsgLengthBuf,FrameBuf,SubSysCode,BoardSN],function(){
        //获取插入ID
        console.log(this.lastID);
        //获取改变行数
        console.log(this.changes);
    });
}











