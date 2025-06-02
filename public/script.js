const socket = io();
const roomID = "zoom-room"; // bisa diganti dinamis
const localVideo = document.createElement("video");
localVideo.muted = true;
localVideo.autoplay = true;
localVideo.playsInline = true;
document.getElementById("videos").appendChild(localVideo);

let localStream;
let peers = {};

// Dapatkan akses kamera dan mikrofon
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;

        socket.emit("join-room", roomID);

        socket.on("user-joined", id => {
            const peer = new SimplePeer({ initiator: true, trickle: false, stream });

            peer.on("signal", signal => {
                socket.emit("signal", { target: id, signal });
            });

            peer.on("stream", remoteStream => {
                addVideo(remoteStream, id);
            });

            peers[id] = peer;
        });

        socket.on("signal", data => {
            let peer = peers[data.sender];
            if (!peer) {
                peer = new SimplePeer({ initiator: false, trickle: false, stream });

                peer.on("signal", signal => {
                    socket.emit("signal", { target: data.sender, signal });
                });

                peer.on("stream", remoteStream => {
                    addVideo(remoteStream, data.sender);
                });

                peers[data.sender] = peer;
            }

            peer.signal(data.signal);
        });

        socket.on("user-left", id => {
            if (peers[id]) {
                peers[id].destroy();
                const video = document.getElementById(id);
                if (video) video.remove();
                delete peers[id];
            }
        });
    });

// Tambahkan video dari pengguna lain
function addVideo(stream, id) {
    if (document.getElementById(id)) return; // jangan tambahkan duplikat
    const video = document.createElement("video");
    video.srcObject = stream;
    video.id = id;
    video.autoplay = true;
    video.playsInline = true;
    document.getElementById("videos").appendChild(video);
}

// Chat
document.getElementById("sendBtn").onclick = () => {
    const msg = document.getElementById("msgInput").value;
    if (msg.trim()) {
        socket.emit("send-chat", msg);
        appendMessage("You", msg);
        document.getElementById("msgInput").value = "";
    }
};

socket.on("chat-message", data => {
    appendMessage(data.id, data.msg);
});

function appendMessage(sender, msg) {
    const div = document.createElement("div");
    div.textContent = `${sender}: ${msg}`;
    document.getElementById("messages").appendChild(div);
}

// Tombol kontrol
let muted = false;
let cameraOff = false;

document.getElementById("muteBtn").onclick = () => {
    muted = !muted;
    localStream.getAudioTracks().forEach(track => track.enabled = !muted);
};

document.getElementById("cameraBtn").onclick = () => {
    cameraOff = !cameraOff;
    localStream.getVideoTracks().forEach(track => track.enabled = !cameraOff);
};

document.getElementById("leaveBtn").onclick = () => {
    location.reload(); // cara cepat keluar dari room
};