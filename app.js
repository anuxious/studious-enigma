const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

const server = require('http').createServer(app);
const io = require('socket.io')(server);
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
    debug: true,
});

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use('/peerjs', peerServer);

let counter = 0;
let users = [];

// ---------------------- Home --------------------------

app.get('/', function(req, res) {
    res.render('home');
});

// ---------------------- Create Room --------------------------

app.get('/createRoom', function(req, res) {
    const roomId = uuidv4();
    console.log(roomId);
    res.render('createRoom', { roomId: roomId });
});

// ---------------------- Join Room --------------------------

app.get('/joinRoom', function(req, res) {
    res.render('joinRoom');
});

// ---------------------- Join Room (post) --------------------------

app.post('/joinRoom', function(req, res) {
    const requestedroomId = req.body.roomId;
    res.redirect(`/${requestedroomId}`);
});

// ---------------------- Room --------------------------

app.get('/:roomId', function(req, res) {
    const roomId = req.params.roomId;

    if (counter >= 10) {
        res.render('sorry', { roomId: roomId });
    } else {
        res.render('room', { roomId: roomId });
    }
});


io.on('connection', socket => {
    socket.on('join-room', (roomId, userId, userName) => {

        users.push({ id: userId, name: userName });

        socket.join(roomId);

        counter++;
        console.log(counter, users);

        socket.to(roomId).emit('user-connected', userId, userName, users);

        socket.on('message', message => {
            socket.to(roomId).emit('createMessage', message, userId, userName);
        });

        socket.on('screen-share', (userId) => {
            // console.log(temp);
            socket.broadcast.to(roomId).emit('screen-sharing', userId, users);
        });

        socket.on('stop-screen-share', (userId) => {
            // console.log(temp);
            socket.broadcast.to(roomId).emit('stop-screen-sharing', userId, users);
        });

        socket.on('disconnect', () => {

            let index = 0;
            for (let i = 0; i < counter; i++) {
                if (users[i].id === userId) {
                    index = i;
                    break;
                }
            }

            users.splice(index, 1);
            counter--;

            console.log(`${userName} disconnect`);
            socket.to(roomId).emit('user-disconnected', userId, userName, users);
        });
    });
});

server.listen(process.env.PORT || port, function() {
    console.log(`Example app listening at http://localhost:${port}`);
});