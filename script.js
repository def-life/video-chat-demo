const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callButton = document.getElementById('callButton');
const hangupbutton = document.getElementById('hangupbutton');
let localStream, remoteStream, peerConnection, didIOffer = false;
const username = Math.random().toString(36).substring(2, 10);
const password = "x"
const peerConfiguration = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302'
            ]
        }
    ]
}

const socket = io({
    auth: {
        username,
        password
    }
});




async function call() {
    await fetchUserMedia()
    await createPeerConnection()

    // create offer
    try {
        const offer = await peerConnection.createOffer()
        didIOffer = true
        peerConnection.setLocalDescription(offer)
        socket.emit("newOffer", offer)
    } catch (err) {
        console.log(err)
    }

}

async function createPeerConnection(offerObj) {
    return new Promise(async (resolve, reject) => {
        peerConnection = new RTCPeerConnection(peerConfiguration)
        remoteStream = new MediaStream()
        remoteVideo.srcObject = remoteStream


        // send the track
        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream)
        })

        // receive the track
        peerConnection.addEventListener("track", (e) => {
            e.streams[0].getTracks().forEach((track) => {
                remoteStream.addTrack(track, remoteStream)
            })

        })

        // send ice candidate
        peerConnection.addEventListener("icecandidate", (e) => {
            if (e.candidate) {
                socket.emit("sendIceCandidateToServer", {
                    iceCandidate: e.candidate,
                    iceUsername: username,
                    didIOffer
                })
            }
        })

        if (offerObj) {
            await peerConnection.setRemoteDescription(offerObj.offer)
        }

        resolve()

    });
}


async function fetchUserMedia() {
    return new Promise(async (resolve, reject) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true
            })
            localVideo.srcObject = stream
            localStream = stream
            resolve()

        } catch (err) {
            console.log(err)
            reject()
        }

    })
}

async function answerOffer(offerObj) {
    await fetchUserMedia()
    await createPeerConnection(offerObj)
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    offerObj.answer = answer
    offerObj.answerUsername = username

    const iceCandidates = await socket.emitWithAck("newAnswer", offerObj)

    iceCandidates.forEach((candidate) => {
        peerConnection.addIceCandidate(candidate);
    })
    // generate answer and set local description
    // create answer
    // emit event answer with username, other info
    // saved ice candidate get them as well
}

async function addAnswer(offerObj) {
    await peerConnection.setRemoteDescription(offerObj.answer)
}

async function addNewIceCandidate(iceCandidate) {
    await peerConnection.addIceCandidate(iceCandidate)
}




callButton.addEventListener("click", call)
hangupbutton.addEventListener("click", () => {
    peerConnection.close()
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
})