const express = require('express')
const app = express()

//routes
app.get('/', (req, res) => {
	res.render('index')
})

//Listen on port 3000
server = app.listen(3000)

//socket.io instantiation
const io = require("socket.io")(server)

//listen on every connection
io.on('connection', (socket) => {

    socket.on('new_message1', (data) => {
        //send message to others except caller
        console.log(data);
        socket.broadcast.emit('new_message1', data);
    })
    
})
