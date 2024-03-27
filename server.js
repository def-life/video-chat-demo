import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';


const app = express();
const server = createServer(app);
const io = new Server(server);

const connectedSockets = []
let offers = [
    // {
    //     offerUsername,
    //     offerIceCandidates,
    //     offer,
    //     answer,
    //     answerIceCandidates,
    //     answerUsername
    // }
]


const __dirname = dirname(fileURLToPath(import.meta.url));


app.use(express.static(__dirname))


app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});


server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});


io.on("connection", (socket) => {
    const { username, password } = socket.handshake.auth;
    if (!username || !password) {
        socket.disconnect(true)
        return
    }

    connectedSockets.push({ id: socket.id, username })

    socket.on("newOffer", (offer) => {
        const offerObj = {
            offerUsername: username,
            offer,
            offerIceCandidates: [],
            answer: null,
            answerIceCandidates: [],
            answerUsername: null
        }
        offers.push(offerObj)
        socket.broadcast.emit("newOfferAwaiting", [offerObj])
    })


    // connected socket gets the available offers
    if (offers.length) {
        socket.broadcast.emit("newOfferAwaiting", offers)
    }


    socket.on("newAnswer", (offerObj, ackFunc) => {
        console.log("new Answer", offerObj)
        const socketToAnswer = connectedSockets.find((s) => s.username === offerObj.offerUsername)
        if (!socketToAnswer) {
            console.log('no matching socket')
            return
        }

        const offerToUpdate = offers.find((o) => o.offerUsername == offerObj.offerUsername)
        if (!offerToUpdate) {
            console.log('offer to update dont exist')
            return
        }



        ackFunc(offerToUpdate.offerIceCandidates)
        offerToUpdate.answer = offerObj.answer
        offerToUpdate.answerUsername = username

        socket.to(socketToAnswer.id).emit('answerResponse', offerToUpdate)

    })

    socket.on("sendIceCandidateToServer", ({ didIOffer, iceUsername, iceCandidate }) => {
        if (didIOffer) {
            const offerObj = offers.find((o) => o.offerUsername == iceUsername)
            if (!offerObj) {
                console.log('offer dont exit')
                return
            }

            offerObj.offerIceCandidates.push(iceCandidate)
            if (offerObj.answer) {
                const socketToSendTo = connectedSockets.find((s) => s.username == offerObj.answerUsername)

                if (!socketToSendTo) {
                    console.log("socketToSendTo left")
                    return
                }

                socket.to(socketToSendTo.id).emit('receivedIceCandidateFromServer', iceCandidate)
            }

        } else {
            const offerObj = offers.find((o) => o.answerUsername == iceUsername)

            const socketToSendTo = connectedSockets.find((s) => s.username == offerObj.offerUsername)
            if (!socketToSendTo) {
                console.log("socketToSendTo left")
                return
            }

            socket.to(socketToSendTo.id).emit('receivedIceCandidateFromServer', iceCandidate)
        }
    })



})