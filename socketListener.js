socket.on("newOfferAwaiting", (offers) => {
    createEls(offers)
})

socket.on("answerResponse", (offerObj) => {
    addAnswer(offerObj)
})

socket.on('receivedIceCandidateFromServer', (iceCandidate) => {
    addNewIceCandidate(iceCandidate)
})

function createEls(offers) {
    const answerEl = document.querySelector('#answer');
    offers.forEach(o => {
        const newOfferEl = document.createElement('div');
        newOfferEl.className = "answer_button"
        newOfferEl.innerHTML = `<button class="btn btn-success mt-1 col-1">Answer ${o.offerUsername}</button>`
        newOfferEl.addEventListener('click', () => answerOffer(o))
        answerEl.appendChild(newOfferEl);
    })
}