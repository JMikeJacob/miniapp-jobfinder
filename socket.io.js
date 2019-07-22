const io = require('socket.io')()
const socketIo = {}
socketIo.io = io

const Redis = require('ioredis')
const redis = new Redis({
    port: 6379,
    host: 'localhost',
    family: 4,
    // password: 'root',
    db: 0
})

const documents = {};


const users = {}
const socketIds = {}
const usernames = []
const message_history = []

io.on('connection', (socket) => {
    console.log(`socket:${socket.id}`)
    socket.on('subscribe to notifs', (payload) => {
        console.log(payload)
        redis.pipeline()
             .hmset(`socketUser:${socket.id}`, {
                 role:payload.role,
                 id: payload.id
             })
             .set(`${payload.role}:socketId:${payload.id}`, socket.id)
             .exec()
             .then(() => {
                 redis.hget(`employer:${payload.id}`, 'app_notifications').then((res) => {
                    io.to(socket.id).emit('send count', {count: res})
                 })
             })
    })

    socket.on('unsubscribe from notifs', (payload) => {
        console.log(payload)
        redis.pipeline()
            .del(`socketUser:${socket.id}`)
            .del(`${payload.role}:socketId:${payload.id}`)
            .exec()
    })

    socket.on('notification', (payload) => {
        console.log(payload)
        let app_count = 1
        redis.hget(`employer:${payload.to}`, 'app_notifications').then((res) => {
            console.log(res)
            app_count += +res
            return redis.hset(`employer:${payload.to}`, 'app_notifications', app_count)
        }).then(() => {
            redis.get(`employer:socketId:${payload.to}`).then((res) => {
                if(res) {
                    console.log(app_count)
                    io.to(res).emit('notification', {to:payload.to, from:payload.from, message:payload.message, count:app_count})
                }
            })
        })
    })

    socket.on('response', (payload) => {
        console.log(payload)
        redis.get(`seeker:socketId:${payload.to}`).then((res) => {
            if(res) {
                io.to(res).emit('notification', {
                    to:payload.to,
                    from:payload.from,
                    message:payload.message,
                    type:payload.type
                })
            }
        })
    })

    socket.on('disconnect', () => {
        redis.hgetall(`socketUser:${socket.id}`).then((res) => {
            redis.pipeline()
                 .del(`socketUser:${socket.id}`)
                 .del(`${res.role}:socketId:${res.id}`)
                 .exec()
        }).then(() => {
            io.emit('user disconnected', {userId: socket.id})
        })
    })
})

module.exports = socketIo

// io.on('connection', function(socket){
//     // io.emit('chat message', "someone connected")
//     console.log("socket:" + socket.id)

//     socket.on('register', (username) => {
//         io.emit('chat message', { to: "ALL", msg: `${username} is in the building!` })
//         message_history.push({ to: "ALL", msg: `${username} is in the building!` })
//         users[username] = socket
//         socketIds[socket.id] = username
//         usernames.push(username)
//         console.log(users)
//         io.emit('add user', username)
//         console.log(users[username].id)
//     })

//     socket.on('get history', () => {
//         socket.emit('get history', {user: usernames, history: message_history})
//     })

//     socket.on('chat message', function(message){
//         console.log(message)
//         message_history.push(message)
//         if(message.to === "ALL") {
//             io.emit('chat message', { to: `${message.from} -> ALL`, msg: message.msg })
//         }
//         else {
//             io.to(users[message.to].id).emit('chat message', { to: `${message.from} -> ${message.to}`, msg: message.msg })
//         }
//         // io.emit('chat message', msg);
//     });

//     socket.on('disconnect', () => {
//         console.log("warning")
//         console.log(socket.id)
//         if(socketIds[socket.id]) {
//             io.emit('chat message', { to: "ALL", msg: `${socketIds[socket.id]} just left!` })
//             message_history.push({ to: "ALL", msg: `${socketIds[socket.id]} just left!` })
//             let username = socketIds[socket.id]
//             delete users[socketIds[socket.id]]
//             delete socketIds[socket.id]
//             io.emit('delete user', username)
//         }
//     })
// });



// http.listen(3000, function(){
//   console.log('listening on *:3000');
// });