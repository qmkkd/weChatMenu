function onRequest(request, response, modules) {
    var token = "czh2cst";         //这里的值必须与在微信公众号后台填入的token值一致
    var crypto = modules.oCrypto; //使用加解密模块
    var httptype = modules.oHttptype;　//获取调用云端逻辑的是post或者get方式
    var xml2js = modules.oXml2js;　//实现xml和js格式之间的相互转换
    var db = modules.oData;         //数据库对象
    if ("get" == httptype) {
        　//是get方法,则是微信在验证回调的url是否有效
          var oriStr = [token, request.query.timestamp, request.query.nonce].sort().join('')
          var code = crypto.createHash('sha1').update(oriStr).digest('hex');
          if (code == request.query.signature) {　//验证通过，输出
              response.end(request.query.echostr);
          } else {
              response.end("Unauthorized");
          }
    } else {
           //是post,接收订阅者发送过来的消息。
           
           //接受到'查看菜谱'的信息，则返回菜单。
           if(request.body.xml.Content == '查看菜单'){
                db.find({
                "table":"course"
                },function(err,data){
                    var resultObject = JSON.parse(data);
                    var str = '\t\t菜单\n';
                    for(var results in resultObject){
                        var resultArr = resultObject[results];
                        for(var line in resultArr){
                            str = str + resultArr[line].name +  
                            '\n价格：￥' + resultArr[line].price + 
                            '\n评分：' + resultArr[line].score +
                            '\n\n';
                        }
                    }
                    var result = {
                            xml: {
                                ToUserName: request.body.xml.FromUserName,
                                FromUserName: request.body.xml.ToUserName,
                                CreateTime: new Date().getTime(),
                                MsgType: 'text',
                                Content: str
                            }
                        }
                    var builder = new xml2js.Builder();
                    var xml = builder.buildObject(result);
                    response.set('ContentType','text/xml');
                    response.send(xml);
                });
           }//end of if(menu)

           //如果接受的消息是“今天吃什么”，就推荐菜名并返回。
            else if(request.body.xml.Content == '今天吃什么'){
               
               var bql = modules.oBql;
               var str = '\t\t今日推荐\n';
               //select first course
               bql.exec({
                   "bql": "select * from course where score>=60 and type = '素菜' limit 1 "
               },function(err,data){
                    var resultObject = JSON.parse(data);
                    for(var results in resultObject){
                            str = str + resultObject[results][0].name +  
                            '\n价格：￥' + resultObject[results][0].price + 
                            '\n评分：' + resultObject[results][0].score +
                            '\n\n';
                    }
              },bql.exec({  //select second course
                  "bql": "select * from course where score>=60 and type= '荤菜' limit 1"
              },function(err,data){
                  var resultObject = JSON.parse(data);
                    for(var results in resultObject){
                            str = str + resultObject[results][0].name +  
                            '\n价格：￥' + resultObject[results][0].price + 
                            '\n评分：' + resultObject[results][0].score +
                            '\n\n';
                    }
                    str = str + '如果有不喜欢的菜，请给我们菜名反馈，我们将为你再次进行推荐！';
                    //transfer json to xml to send to weChat
                    var result = {
                            xml: {
                                ToUserName: request.body.xml.FromUserName,
                                FromUserName: request.body.xml.ToUserName,
                                CreateTime: new Date().getTime(),
                                MsgType: 'text',
                                Content: str
                            }
                        }
                    var builder = new xml2js.Builder();
                    var xml = builder.buildObject(result);
                    response.set('ContentType','text/xml');
                    response.send(xml);
              })//end of seletion of second course
              ); // end of seletion of first course
               
           }//end of if(eat_what)
           
          
           
           //如果接受的消息是“xxx菜”，就降低该菜品的用户满意，并返回另一个菜品。
          else{
               var coursename = request.body.xml.Content;
               var bql = modules.oBql;
               var str = '';
               var updId = '';
               var type = '';
               
               bql.exec({
                    "bql": "select objectId from course where name = '" + coursename + "' "
                },function(err,data){
                    var message = JSON.parse(data);
                    for(var course in message){
                        updId = updId + message[course][0].objectId;
                        type = type + message[course][0].type;
                    }
                    //降低评分
                    db.update({
                        "table": "course",
                        "objectId": updId,
                        "data": {"score": 50}
                    },function(err,data){
                        str = str + '已给这道菜差评！';
                    });
                  //推送另一道菜
              
          }//end of bad comments

    }//end of httptype is post
}           
