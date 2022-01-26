const express = require('express');
const http = require('http');
const socket = require('socket.io')
const app = express()
const server = http.createServer(app);

app.use(express.static("public"))

const io = socket(server)



const cardNumbers = {
  ace : [0,13,26,39],
  two : [1,14,27,40],
  three : [2,15,28,41],
  four : [3,16,29,42],
  five : [4,17,30,43],
  six : [5,18,31,44],
  seven : [6,19,32,45],
  eight :[7,20,33,46],
  nine : [8,21,34,47],
  ten : [9,22,35,48],
  jack : [10,23,36,49],
  queen : [11,24,37,50],
  king : [12,25,38,51]
}

let gameStats = {
  currentPlayerTurn : 0,
  currentRoundTurnCount : 0,
  cardsOnTable : 0,
  pass : 0,
  pcards : [13,13,13,13],
  message : "",
  lastTurnLength : 0,
  lastPlayed : 0
}

let playerList = [];
let playerListCopy =[]
let users = []
let cardsArray  =[];
let tableCards = [];
let playerCards= [[],[],[],[]]
let ongoingcard = '';
let winner = []


function shuffleCards(){
  for(let i =0;i<52;i++){
    cardsArray.push(i)
  }

  for(let i =52 ; i>0;i--){
    let f = i%4;
    let index = Math.floor(Math.random() * i )
    playerCards[f].push(cardsArray[index]);
    cardsArray.splice(index,1);
  }
}


io.on('connection', socket =>{


  socket.on('joinRoom', (data)=>{
    let user = {id : socket.id , username : data.username }
    users.push(user)

    console.log(data.username);
  })

  socket.on('startGame', (data)=>{
    playerList = users
    shuffleCards();
   playerListCopy = playerList
    playerList.forEach((player , i ) => {
      let payload = genInitialData(player,i);
      io.to(player.id).emit("gameStats", payload) // Distribute Cards
    });
    io.emit('playerList' , playerList)
    gameStats.message = `Its ${playerListCopy[0].username} Turn`
    io.emit('gameData' , gameStats)

  })

  socket.on('play',data =>{
    //Removing Card from player possession
    data.cards.forEach((card, i) => {
      let index = playerCards[gameStats.currentPlayerTurn].indexOf(card);
      playerCards[gameStats.currentPlayerTurn].splice(index,1);
    });

    //Setting Last Player played
    gameStats.lastPlayed = gameStats.currentPlayerTurn

    //If New Round then Set base card
    if(gameStats.currentRoundTurnCount == 0){
      ongoingcard = data.type
    }
    gameStats.message = `${playerListCopy[gameStats.currentPlayerTurn].username} played ${data.cards.length} cards of ${ongoingcard}. `

    //Remove Nummber of Cards From card Count
    gameStats.pcards[gameStats.currentPlayerTurn] -= data.cards.length

    //Next player to Play
    let winFlag = 0
    //Enter while condition for skipping winner turn
    while(winFlag != -1){

    gameStats.currentPlayerTurn +=1;

    if(gameStats.currentPlayerTurn > 3)
     gameStats.currentPlayerTurn = 0

    winFlag = winner.indexOf(gameStats.currentPlayerTurn)
    if(gameStats.pcards[gameStats.currentPlayerTurn] == 0 && winFlag == -1){
      winFlag = 0;
      winner.push(gameStats.currentPlayerTurn)

    }
  }

    //Number of Turns in a round
    gameStats.currentRoundTurnCount +=1;

    //Total Cards on Table
    gameStats.cardsOnTable += data.cards.length

    //Number of cards Played in Last turn
    gameStats.lastTurnLength = data.cards.length

    //Setting Pass count 0
    gameStats.pass = 0;

    //Setting message
    gameStats.message +=` Now its ${playerListCopy[gameStats.currentPlayerTurn].username} turn`;

    //Setting The cards present on the table
    tableCards.push(...data.cards);

    //Sending players their card
    playerList.forEach((player , i ) => {
      io.to(player.id).emit("currentCards", playerCards[i]) // Distribute Cards
    });

    //Sending the complete game data
    for(let i =0;i<winner.length ; i++){
      io.to(playerList[winner[i]].id).emit('currentCards' , tableCards)
    }
    io.emit('gameData' , gameStats)


  })

  socket.on('pass',data =>{
    gameStats.pass +=1

    //If all player Passes
    if(gameStats.pass >= (4-winner.length)){

      //Resetting the required data
      gameStats.currentRoundTurnCount = 0;
      gameStats.cardsOnTable = 0;
      gameStats.pass = 0;
      gameStats.message =` Now its ${playerListCopy[gameStats.currentPlayerTurn].username} turn`;
      gameStats.lastTurnLength = 0;
      gameStats.lastPlayed = -1;
      tableCards = []
      io.emit('gameData',gameStats)
    }

    //else
    else {
      gameStats.message = `${playerListCopy[gameStats.currentPlayerTurn].username} passed. `
      let winFlag = 0
      while(winFlag != -1){

      gameStats.currentPlayerTurn +=1;

      if(gameStats.currentPlayerTurn > 3)
       gameStats.currentPlayerTurn = 0

      winFlag = winner.indexOf(gameStats.currentPlayerTurn)
      if(gameStats.pcards[gameStats.currentPlayerTurn] == 0 && winFlag == -1){
        winFlag = 0;
        winner.push(gameStats.currentPlayerTurn)

      }
    }
      gameStats.message +=` Now its ${playerListCopy[gameStats.currentPlayerTurn].username} turn`;
      io.emit('gameData',gameStats)
    }
  })


socket.on('bluff', data => {

      gameStats.message =` ${playerListCopy[gameStats.currentPlayerTurn].username} is Calling a bluff`;
      io.emit('gameData',gameStats)
      let oCard = cardNumbers[ongoingcard];
      let cards = []
      let bluff = false
      for (let i = tableCards.length-1 ; i>tableCards.length-1-gameStats.lastTurnLength ; i--){
        cards.push(tableCards[i])
      }

      for(let j = 0 ; j < gameStats.lastTurnLength ; j++){
        let index = oCard.indexOf(cards[j])
        if(index == -1){
          bluff = true;
          break
        }
      }
      if(bluff){
        playerCards[gameStats.lastPlayed].push(...tableCards)
        gameStats.pcards[gameStats.lastPlayed] = playerCards[gameStats.lastPlayed].length
        gameStats.lastPlayed = -1
        gameStats.currentRoundTurnCount = 0;
        gameStats.pass = 0;
        gameStats.message = `${playerListCopy[gameStats.currentPlayerTurn].username} called a successful bluff.`
        io.to(playerListCopy[gameStats.currentPlayerTurn].id).emit('bluffData' , {cards : cards , message : "You called a correct bluff"})
      }

      else {
        gameStats.message = `${playerListCopy[gameStats.currentPlayerTurn].username} called an unsuccessful bluff.`
        io.to(playerListCopy[gameStats.currentPlayerTurn].id).emit('bluffData' , {cards : cards , message : "You called a wrong bluff"})
        playerCards[gameStats.currentPlayerTurn].push(...tableCards)
        gameStats.pcards[gameStats.currentPlayerTurn] = playerCards[gameStats.currentPlayerTurn].length
        gameStats.currentPlayerTurn = gameStats.lastPlayed
        gameStats.lastPlayed = -1
        gameStats.currentRoundTurnCount = 0;
        gameStats.pass = 0;
      }

      gameStats.cardsOnTable = 0
      tableCards = []
      gameStats.message +=` Now its ${playerListCopy[gameStats.currentPlayerTurn].username} turn`;
})



socket.on('resumeGame',data =>{
  playerList.forEach((player , i ) => {
    io.to(player.id).emit("currentCards", playerCards[i]) // Distribute Cards
  });
  io.emit('gameData' , gameStats)
})


  socket.on('disconnect', () =>{
    let playerDisconnected = socket.id

    for(let i =0; i<users.length ; i++ ){
      if(playerDisconnected == users[i].id){
        console.log(users[i].username  + " Disconnected");
        users.splice(i,1)
        console.log(users);
      }

    }
  })

})


function genInitialData(player,i){
  let payload  = player
  payload.cards = playerCards[i];
  payload.position = i
  return payload
}


server.listen(3000,()=>{
  console.log("Server Up on port 3000");
})
