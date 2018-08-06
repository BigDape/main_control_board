const ipInt = require('ip-to-int');

function boardSN() {
    //将四块板子的IP转换为int类型
    var BoardSN1 = ipInt('192.168.1.53').toInt();
    var BoardSN2 = ipInt('192.168.1.54').toInt();
    var BoardSN3 = ipInt('192.168.1.55').toInt();
    var BoardSN4 = ipInt('192.168.1.56').toInt();
    var temp = ipInt(sock.remoteAddress).toInt();
    //判断是哪个板子
    switch(temp){
        case BoardSN1:
            console.log("connected is board 0001");
            break;
        case BoardSN2:
            console.log("connected is board 0002");
            break;
        case BoardSN3:
            console.log("connected is board 0003");
            break;
        case BoardSN4:
            console.log("connected is board 0004");
            break;
        default:
            console.log("connected is another borad");
            break;
    };

};