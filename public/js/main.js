const socket = io();
let currentTurnRound ;
let position;
let playerList;
let otherPlayerPosition = [];

let leftPlayer = document.getElementsByClassName('left')[0];
let topPlayer = document.getElementsByClassName('top')[0];
let rightPlayer = document.getElementsByClassName('right')[0];
let buttons = Array.prototype.slice.call(document.getElementsByClassName('submitBut'));

const {username } = Qs.parse(location.search,{
  ignoreQueryPrefix: true
})

disableButtons();
disablechoice();

//SOcket Connections

socket.emit('joinRoom',{username})

socket.on('gameStats',(data)=>{
  console.log(data);
  let cardDiv =document.getElementById('cards')
  cardDiv.innerHTML = '';

  data.cards.forEach((item, i) => {
    cardDiv.innerHTML += `
    <img src="images/${item}.png" alt="" id="${item}" onclick="selectCard(${item})">
    `;
  });

position = data.position;
fillPositionTable()
position = data.position;
})

socket.on('playerList',(data)=>{
  playerList = data
  loadNames();

})

socket.on('gameData' , (data) =>{
  let count = position;
  currentTurnRound = data.currentRoundTurnCount;
  if(data.currentPlayerTurn != position){
    disableButtons();
    disablechoice();
  }
  else {
    enableButtons()
    if(data.currentRoundTurnCount == 0){
      enableChoice();
      disbaleTwoButton();
    }
  }

  cardsRemaining(data.pcards);
  showMessage(data.message , data.cardsOnTable);


})

socket.on('currentCards',(data)=>{
  let cardDiv =document.getElementById('cards')
  cardDiv.innerHTML = '';

  data.forEach((item, i) => {
    cardDiv.innerHTML += `
    <img src="images/${item}.png" alt="" id="${item}" onclick="selectCard(${item})">
    `;
  });
})


socket.on('bluffData', data =>{
  document.getElementById('bluff').innerHTML =
  `
  <h3>${data.message}</h3>
  <div class="cards" id="ccd">`
  for(let i =0 ; i<data.cards.length ; i++){
    document.getElementById('ccd').innerHTML +=
    `
    <img src="images/${data.cards[i]}.png" alt="">
    `;
  };
  document.getElementById('bluff').innerHTML +=
  `
  <button type="button" class="submitButt" name="button" onclick="resumeGame()">Ok</button>
  `;
})

//All the functions
function fillPositionTable(){
  for(let i=0;i<3;i++){
    position +=1;
    if(position > 3){
      position = 0
    }
    otherPlayerPosition.push(position)
  }
}


//display Functions
function loadNames(){
  leftPlayer.getElementsByTagName('h2')[0].innerText = playerList[otherPlayerPosition[0]].username;
  topPlayer.getElementsByTagName('h2')[0].innerText = playerList[otherPlayerPosition[1]].username;
  rightPlayer.getElementsByTagName('h2')[0].innerText = playerList[otherPlayerPosition[2]].username;
}


function disableButtons(){
  buttons.forEach((button, i) => {
    button.style.display = 'none';
  });

}

function enableButtons(){
  buttons.forEach((button, i) => {
    button.style.display = 'block'
  });

}

function disbaleTwoButton(){
  buttons[0].style.display = 'none';
  buttons[2].style.display = 'none';
}

function disablechoice(){

  document.getElementById('card').style.display = 'none'

}

function enableChoice(){
  document.getElementById('card').style.display = 'block'
}

function cardsRemaining(cards){
  leftPlayer.getElementsByTagName('p')[0].innerText = 'Cards Remaining  : '+ cards[otherPlayerPosition[0]];
  topPlayer.getElementsByTagName('p')[0].innerText = 'Cards Remaining  : '+ cards[otherPlayerPosition[1]];
  rightPlayer.getElementsByTagName('p')[0].innerText = 'Cards Remaining  : '+ cards[otherPlayerPosition[2]];
}

function showMessage(message , cot){
  document.getElementById('message').innerText = message;
  document.getElementById('cot').innerText = 'Cards on Table : ' + cot ;
}




//Game Functions

function play(){
  let cardss = [];
  let scard = Array.prototype.slice.call(document.getElementsByClassName('selected'));
  scard.forEach((card, i) => {
    cardss.push(parseInt(card.id))
  });


  if (cardss.length == 0){
    pass()
  }
  else{
    if(cardss.length > 4){
      alert("More than 4 cards Selected, Please Try again!")
    }
    else {
      let payload = {
        cards : cardss
      }
      if(currentTurnRound == 0){
        payload.type = document.getElementsByName('card')[0].value;
      }
      socket.emit('play',payload)
    }
  }

}

function pass(){
  socket.emit('pass',"Pass")
}

function bluff() {
  socket.emit('bluff' , "Bluff")
}

function resumeGame(){
  document.getElementById('bluff').innerHTML = ''
  socket.emit('resumeGame','resume')
}


function selectCard(id){
  document.getElementById(id).classList.toggle('selected');
}
