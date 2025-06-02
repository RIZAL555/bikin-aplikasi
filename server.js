const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const rooms = {};

io.on("connection", socket => {
    socket.on("join-room", roomID => {
        if (!rooms[roomID]) rooms[roomID] = [];
        rooms[roomID].push(socket.id);
        socket.join(roomID);

        const others = rooms[roomID].filter(id => id !== socket.id);
        socket.emit("all-users", others);

        socket.to(roomID).emit("user-joined", socket.id);

        socket.on("signal", ({ target, signal }) => {
            io.to(target).emit("signal", { sender: socket.id, signal });
        });

        socket.on("helo", msg => {
            socket.to(roomID).emit("chat-message", { id: socket.id, msg });
        });

        socket.on("disconnect", () => {
            rooms[roomID] = rooms[roomID].filter(id => id !== socket.id);
            socket.to(roomID).emit("user-left", socket.id);
        });
    });
});

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server ready on port ${PORT}`);
});
