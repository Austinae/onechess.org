$( document ).ready(function() { 

    var url = window.location.href
    var re = /([\w\d_-]*)\.?[^\\\/]*$/i;
    var gid = url.match(re)[1];

    $.get("/initData/"+gid, function (data) {
        window.onbeforeunload = confirmExit;
        function confirmExit()
        {
            socket.emit('leaveRoom', data.gid);
            return undefined;
            // return 'heyo';
        }
        var uid = data.uid;
        var eye;
        if (uid == data.white){ 
            eye = "w";  //user is white
        } 
        else if (uid == data.uid1 || uid == data.uid2){
            eye = "b"; //black
        }
        else{
            eye = "s"; //spectator
        }

        var socket = io();
        socket.emit('setRoom', data.gid);
        var canvas = document.getElementById("board");
        var ctx = canvas.getContext("2d");
        var letters = "abcdefghijklmnopqrstuvwxyz";
        var nbSqPSideX;
        var nbSqPSideY;
        var sqSize;
        var eyeMove = 0;
        var eyeView = data.eyeView
        var variant = data.variant;
        var board;


        function draw(board, moveNb){
            
            ctx.clearRect(0, 0, board.cwidth, board.cheight); //clear
            ctx.drawImage(board.images.board, 0, 0, board.cwidth, board.cheight); //background
            
            if(board.focus.piece != null){ //legal moves
                var validSquare;
                ctx.fillStyle = "#cc6600";
                for(var square in board.focus.validSquares.canMove){ //move
                    validSquare = strToDrawPos(board.focus.validSquares.canMove[square]);
                    ctx.globalAlpha = 0.8;
                    ctx.fillRect(validSquare[0]*sqSize, validSquare[1]*sqSize, sqSize, sqSize);
                    ctx.globalAlpha = 1.0;
                }
                ctx.fillStyle = "#ff3300";
                for(var square in board.focus.validSquares.canAttack){ //attack
                    validSquare = strToDrawPos(board.focus.validSquares.canAttack[square]);
                    ctx.globalAlpha = 0.8;
                    ctx.fillRect(validSquare[0]*sqSize, validSquare[1]*sqSize, sqSize, sqSize);
                    ctx.globalAlpha = 1.0;
                }
                
            }

            if(board.gameStates[moveNb].lastMove.originStr != null){ //last move highlight
                var origin;
                var destination;
                ctx.fillStyle = "#00ccff";
                origin = strToDrawPos(board.gameStates[moveNb].lastMove.originStr);
                destination = strToDrawPos(board.gameStates[moveNb].lastMove.destinationStr);
                ctx.globalAlpha = 0.5;
                ctx.fillRect(origin[0]*sqSize, origin[1]*sqSize, sqSize, sqSize);
                ctx.fillRect(destination[0]*sqSize, destination[1]*sqSize, sqSize, sqSize);
                ctx.globalAlpha = 1.0;
            }

            var piece;
            var boardPosition;
            var srcImgPosition;
            var pIndex;

            for(var pIndex in board.gameStates[moveNb].pieces){ //pieces
                piece = board.gameStates[moveNb].pieces[pIndex]
                if(piece.alive){ 
                    boardPosition = strToDrawPos(piece.positionStr)
                    srcImgPosition = board.coordinates[piece.spriteCoord]
                    ctx.drawImage(
                        board.images.pieces, //img
                        srcImgPosition[0]*board.subSizeX, //dx 
                        srcImgPosition[1]*board.subSizeY, //dy
                        board.subSizeX,  //sWidth
                        board.subSizeY,  //sHeight
                        boardPosition[0]*sqSize, //dx
                        boardPosition[1]*sqSize, //dy
                        sqSize, //dWidth
                        sqSize); //dHeight
                }
            }
        }

        function strToDrawPos(str){ //returns coord position depending on perspective from string 
            var letter = str[0];
            var number = str.substring(1)-1;

            if(eyeView=="white"){
                letter = letters.indexOf(letter);
                number = -number + nbSqPSideY - 1;
            }
            else{
                letter = letters.indexOf(letter);
                letter = -letter + nbSqPSideX - 1;
            }
            return [letter, number];
        }
    

        function strToPos(str){ //returns coord position from string
            return [letters.indexOf(str[0]), str.substring(1)-1];
        }
        

        function drawPosToStr(pos) { //returns string depending on perspective from coord position
            if(eyeView == "white"){
                    pos[1] = -pos[1]  + nbSqPSideY;
                }
                else{
                    pos[0] = -pos[0]  + nbSqPSideX - 1
                    pos[1] += 1;
                }
                return letters[pos[0]]+pos[1];
        }


        function posToStr(pos){ //return string from coord position
            return letters[pos[0]]+(pos[1]+1)
        }


        function deepCopyState(state){
            var newState = {"gameMode": tate.pieces[piece].gameMode,"moveNb":state.moveNb,"mate":state.mate,"check":state.check,pieces:[],"lastMove":state.lastMove}
            for(var piece in state.pieces){
                newState.pieces.push(
                    {"numberMoves": state.pieces[piece].numberMoves,
                    "positionStr": state.pieces[piece].positionStr,
                    "positionCoord": state.pieces[piece].positionCoord,
                    "type": state.pieces[piece].type,
                    "colour": state.pieces[piece].colour
                })  
            }
                return newState;
            }

        class Board{
            constructor(){
                this.nbSqPSideX;
                this.nbSqPSideY;
                this.images = {
                    board: null,
                    pieces: null
                };
                this.moveNb = 0;
                this.gameStates = [];
                this.focus = {
                    piece: null,
                    validSquares: null
                };
                this.eyeNb = 0;
                this.moves = {};
            }

            generateValidMoves(){
                var piece;
                var myOccupiedSquares = [];
                var opponentOccupiedSquares = [];
                for(var pIndex in this.gameStates[this.moveNb].pieces){//keep track of piece positions according to colour 
                    piece = this.gameStates[this.moveNb].pieces[pIndex];
                    if(piece.alive){
                        if(piece.colour[0] == eye){ //if piece belongs to user
                            myOccupiedSquares.push(piece.positionCoord);
                        }
                        else{
                            opponentOccupiedSquares.push(piece.positionCoord);
                        }
                    }
                }

                for(var pIndex in this.gameStates[this.moveNb].pieces){ //for each piece in current gamestate
                    piece = this.gameStates[this.moveNb].pieces[pIndex];
                    if(piece.colour[0] == eye){ //if piece belongs to user
                        this.moves[piece.pid] = this.getPieceMoves(this.gameStates[this.moveNb].pieces, piece, myOccupiedSquares, opponentOccupiedSquares);
                    }
                }
            }

            isInsideField(pos, field){
                return ((pos[0]>field[0]&&pos[0]<field[1]&&pos[1]>field[2]&&pos[1]<field[3]) ? true : false);
            }

            generatePositions(pos, offsets, offsetType, myOccupiedSquares, opponentOccupiedSquares, playingField, attacksOnOffset=true, special=null){ 
                var moves = {
                    canMove: [],
                    canAttack: []
                };
                var newPosition;
                for(var offsetIndex in offsets){
                    var offset = offsets[offsetIndex];
                    newPosition = [pos[0],pos[1]];
                    newPosition[0] += offset[0];
                    newPosition[1] += offset[1];
                    while(this.isInsideField(newPosition, playingField)){ //if position inside field
                        if(!isArrayInArray(myOccupiedSquares, newPosition)){ //if square not occupied by friendly piece
                            if(isArrayInArray(opponentOccupiedSquares, newPosition)){ //if square is occupied by enemy piece then
                                if(attacksOnOffset){
                                    moves.canAttack.push(posToStr(newPosition));
                                    break;
                                }
                            }else{
                                moves.canMove.push(posToStr(newPosition));
                            }
                        }else{ //if it is occupied
                            break;
                        }
                        if(offsetType == "singular"){
                            break;
                        }
                        newPosition[0] += offset[0];
                        newPosition[1] += offset[1];
                    }
                }
                return moves;
            }
        }


        class InternationalBoard extends Board {
            constructor() {
                super();
                this.variant = 1;
                this.type = "international";
                this.cwidth = 400;
                this.cheight = 400;
                this.nbSqPSideX = 8;
                this.nbSqPSideY = 8;
                this.subSizeX = 45;
                this.subSizeY = 45;
                this.imageSrcs = [
                    "images/international/pieces.svg",
                    "images/international/board.jpg"
                ];
                this.coordinates = {
                    0: [0, 0], //king white (w)
                    1: [0, 1], //king black (b)
                    2: [1, 0], //queen w
                    3: [1, 1], //queen b
                    4: [2, 0], //bishop w
                    5: [2, 1], //bishop b
                    6: [3, 0], //knight w
                    7: [3, 1], //knight b
                    8: [4, 0], //rook w
                    9: [4, 1], //rook b
                    10: [5, 0], //pawn w
                    11: [5, 1] //pawn b
                };

            }

            getPieceMoves(pieces, piece, myOccupiedSquares, opponentOccupiedSquares){ 
                switch(piece.type) {
                    case "king":
                        return this.generatePositions(piece.positionCoord, [[-1,1],[-1,0],[-1,-1],[0,1],[0,-1],[1,1],[1,0],[1,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,this.nbSqPSideX,-1,this.nbSqPSideY]);
                        break;
                    case "queen":
                        return this.generatePositions(piece.positionCoord, [[-1,1],[-1,0],[-1,-1],[0,1],[0,-1],[1,1],[1,0],[1,-1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,this.nbSqPSideX,-1,this.nbSqPSideY]);
                        break;
                    case "bishop":
                        return this.generatePositions(piece.positionCoord, [[-1,1],[1,1],[1,-1],[-1,-1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,this.nbSqPSideX,-1,this.nbSqPSideY]);
                        break;
                    case "knight":
                        return this.generatePositions(piece.positionCoord, [[-2,1],[-1,2],[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,this.nbSqPSideX,-1,this.nbSqPSideY]);
                        break;
                    case "rook":
                        return this.generatePositions(piece.positionCoord, [[-1,0],[0,1],[1,0],[0,-1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,this.nbSqPSideX,-1,this.nbSqPSideY]);
                        break;
                    case "pawn":
                        var moves;
                        if(piece.colour=="white"){
                            if(piece.numberMoves==0){
                                moves = this.generatePositions(piece.positionCoord, [[0,1],[0,2]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,this.nbSqPSideX,-1,this.nbSqPSideY],false,1);
                            }else{
                                moves = this.generatePositions(piece.positionCoord, [[0,1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,this.nbSqPSideX,-1,this.nbSqPSideY],false,1);
                            }
                            var newPosition;
                            var attackOffsets = [[1,1],[-1,1]]
                            for(var attackOffsetIndex in attackOffsets){
                                var attackOffset = attackOffsets[attackOffsetIndex];
                                newPosition = [piece.positionCoord[0],piece.positionCoord[1]];
                                newPosition[0] += attackOffset[0];
                                newPosition[1] += attackOffset[1];
                                if(this.isInsideField(newPosition, [-1,this.nbSqPSideX,-1,this.nbSqPSideY])){ //if position inside field
                                    if(isArrayInArray(opponentOccupiedSquares, newPosition)){ //if square is occupied by enemy piece then
                                            moves.canAttack.push(posToStr(newPosition));
                                    }
                                }
                            }
                            return moves;

                        }else{
                            if(piece.numberMoves==0){
                                moves = this.generatePositions(piece.positionCoord, [[0,-1],[0,-2]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,this.nbSqPSideX,-1,this.nbSqPSideY],false,1);
                            }else{
                                moves = this.generatePositions(piece.positionCoord, [[0,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,this.nbSqPSideX,-1,this.nbSqPSideY],false,1);
                            }
                            var newPosition;
                            var attackOffsets = [[-1,-1],[1,-1]]
                            for(var attackOffsetIndex in attackOffsets){
                                var attackOffset = attackOffsets[attackOffsetIndex];
                                newPosition = [piece.positionCoord[0],piece.positionCoord[1]];
                                newPosition[0] += attackOffset[0];
                                newPosition[1] += attackOffset[1];
                                if(this.isInsideField(newPosition, [-1,this.nbSqPSideX,-1,this.nbSqPSideY])){ //if position inside field
                                    if(isArrayInArray(opponentOccupiedSquares, newPosition)){ //if square is occupied by enemy piece then
                                            moves.canAttack.push(posToStr(newPosition));
                                    }
                                }
                            }
                            return moves;
                        }
                }
            }
        }

        class XiangqiBoard extends Board {
            constructor() {
                super();
                this.variant = 2;
                this.type = "xiangqi";
                this.cwidth = 450;
                this.cheight = 500;
                this.nbSqPSideX = 9;
                this.nbSqPSideY = 10;
                this.subSizeX = 300;
                this.subSizeY = 300;
                this.imageSrcs = [
                    "images/xiangqi/pieces.png",
                    "images/xiangqi/board.png"
                ];
                this.coordinates = {
                    0: [0, 0], //general/governor/jiang white (w)
                    1: [0, 1], //general/governor/jiang black (b)
                    2: [1, 0], //senior/counselor/shi w
                    3: [1, 1], //senior/counselor/shi b
                    4: [2, 0], //elephant/minister/shiang w
                    5: [2, 1], //elephant/minister/shiang b
                    6: [3, 0], //knight/horse/ma w
                    7: [3, 1], //knight/horse/ma b
                    8: [4, 0], //rook/chariot/chuh w
                    9: [4, 1], //rook/chariot/chuh b
                    10: [5, 0], //catapult/cannon/pao w
                    11: [5, 1], //catapult/cannon/pao b
                    12: [6, 0], //pawn/soldier w
                    13: [6, 1] //pawn/soldier b
                };
            }
        }

        class ShogiBoard extends Board {
            constructor(eyeView) {
                super();
                this.variant = 3;
                this.type = "shogi";
                this.cwidth = 450;
                this.cheight = 450;
                this.nbSqPSideX = 9;
                this.nbSqPSideY = 9;
                this.subSizeX = 225;
                this.subSizeY = 250;
                this.imageSrcs = [
                    "images/shogi/pieces.png",
                    "images/shogi/board.jpg"
                ];
                this.coordinates = {
                    0: [0, 0], //king for higher-ranked player/champion white (w)
                    1: [0, 1], //king for lower-ranked player/challenger w
                    2: [0, 2], //king for higher-ranked player/champion black (b)
                    3: [0, 3], //king for lower-ranked player/challenger b
                    4: [1, 0],  //rook w
                    5: [1, 1],  //rook w promoted(p)
                    6: [1, 2],  //rook b 
                    7: [1, 3],  //rook b p
                    8: [2, 0],  //bishop w
                    9: [2, 1],  //bishop w p
                    10: [2, 2],  //bishop b
                    11: [2, 3],  //bishop b p
                    12: [3, 0],  //gold w  
                    13: [3, 1],  //gold w p
                    14: [3, 2],  //gold b 
                    15: [3, 3],  //gold b p
                    16: [4, 0],  //silver w 
                    17: [4, 1],  //silver w p
                    18: [4, 2],  //silver b 
                    19: [4, 3],  //silver b p
                    20: [5, 0],  //knight w 
                    21: [5, 1],  //knight w p
                    22: [5, 2],  //knight b 
                    23: [5, 3],  //knight b p
                    24: [6, 0],  //lance w 
                    25: [6, 1],  //lance w p
                    26: [6, 2],  //lance b
                    27: [6, 3],  //lance b p
                    28: [7, 0],  //pawn w
                    29: [7, 1],  //pawn w p
                    30: [7, 2],  //pawn b
                    31: [7, 3],  //pawn b p
                }
            }
        }


        function loader(board, loadImg, allDone) {
            var count = board.imageSrcs.length;
            var finishedLoadImg = (board, i)=>{
                count--;
                if (0 == count) {
                    allDone(board);
                    return;
                }
            };

            for (var i in board.imageSrcs){
                loadImg(board, i, finishedLoadImg);
            }
        }


        function loadImage(board, i, onComplete) {
            var onLoad = function (event) {
                event.target.removeEventListener("load", onLoad);
                var re = /([\w\d_-]*)\.?[^\\\/]*$/i;
                var type = event.target.src.match(re)[1];
                if(type == "pieces"){
                    board.images.pieces = event.target;
                }
                else{
                    board.images.board = event.target;
                }
                onComplete(board, i);
            }
            var img = new Image();
            img.addEventListener("load", onLoad, false);
            img.src = board.imageSrcs[i];
        } 

        function getCursorPosition(event){
            var rect = canvas.getBoundingClientRect();
            var position = [Math.floor((event.clientX - rect.left)/sqSize), Math.floor((event.clientY - rect.top)/sqSize)];
            return position
        }


        function deepCopyState(state){
            var newState = {"moveNb":state.moveNb,"mate":state.mate,"check":state.check,"lastMove":state.lastMove,pieces:[]}
            for(var piece in state.pieces){
                newState.pieces.push(
                    {"pid": state.pieces[piece].pid,
                    "alive": state.pieces[piece].alive,
                    "numberMoves": state.pieces[piece].numberMoves,
                    "positionStr": state.pieces[piece].positionStr,
                    "positionCoord": state.pieces[piece].positionCoord,
                    "type": state.pieces[piece].type,
                    "colour": state.pieces[piece].colour,
                    "spriteCoord": state.pieces[piece].spriteCoord
                })  
            }
            return newState;
        }

        function isItMyTurn(){
            return (eye == (board.moveNb % 2 == 0 ? 'w' : 'b'));
        }

        function isStrInArray(array, value) {
            return array.indexOf(value) > -1;
        }

        function isArrayInArray(array, value){
            var i, j, current;
            for(i = 0; i < array.length; ++i){
                if(value.length === array[i].length){
                    current = array[i];
                    for(j = 0; j < value.length && value[j] === current[j]; ++j);
                    if(j === value.length)
                        return true;
                }
            }
            return false;
        }

        function clickHandler(board, event){
            if(isItMyTurn() && board.eyeNb == board.moveNb){ // if it's your turn then and watching correct game state
                var pos = getCursorPosition(event);
                var str = drawPosToStr(pos);
                var piece;
                console.log(board.gameStates[board.moveNb].pieces);
                //hold piece
                if(board.focus.piece == null){
                    for(var pIndex in board.gameStates[board.moveNb].pieces){
                        piece = board.gameStates[board.moveNb].pieces[pIndex];
                        if(piece.positionStr == str && piece.colour[0] == eye && piece.alive){ //if piece belongs to user and not dead
                            board.focus.piece = piece;
                            board.focus.validSquares = board.moves[piece.pid];
                            console.log("holding piece :", piece.type, piece.colour, piece.positionStr)
                            draw(board, board.moveNb);
                            break;
                        }
                    }
                }
                //drop piece
                else{
                    if(isStrInArray(board.focus.validSquares.canMove, str)||isStrInArray(board.focus.validSquares.canAttack, str)){ //local move validation
                        var newState = deepCopyState(board.gameStates[board.moveNb]);
                        for(var pIndex in newState.pieces){
                            if(newState.pieces[pIndex].positionStr == board.focus.piece.positionStr){ 
                                for(var pIndex2 in newState.pieces){ //if piece attacked change state to dead
                                    if(newState.pieces[pIndex2].positionStr == str){ 
                                        piece2 = newState.pieces[pIndex2];
                                        piece2.alive = false;
                                        console.log("killed piece :", piece2.type, piece2.colour, str, strToPos(str))
                                        break;
                                    }
                                }
                                piece = newState.pieces[pIndex];
                                piece.positionStr = str;
                                piece.positionCoord = strToPos(str);
                                piece.numberMoves += 1;
                                newState.lastMove.piece = piece;
                                console.log("dropped piece :", piece.type, piece.colour, str, strToPos(str))
                                break;
                            }
                        }
                        newState.lastMove.originStr = board.focus.piece.positionStr;
                        newState.lastMove.originCoord = strToPos(board.focus.piece.positionStr);
                        newState.lastMove.destinationStr = str;
                        newState.lastMove.destinationCoord = strToPos(str);
                        newState.moveNb += 1;
                        // needs validity check here from server (callback)
                        socket.emit('sendGameState', {gid:data.gid,state:newState});
                        board.gameStates.push(newState);
                        board.moveNb += 1; 
                        board.focus.piece = null;
                        board.moves = {};
                        draw(board, board.moveNb)
                    }
                    else{
                        console.log("dropped piece on wrong square:", board.focus.piece.type, board.focus.piece.colour)
                        board.focus.piece = null;
                        draw(board, board.moveNb)
                    }
                }
            } 
        }

        switch(variant){

            case 1:
                board = new InternationalBoard(eyeView);
                break;
            case 2:
                board = new XiangqiBoard(eyeView);
                break;
            case 3:
                board = new ShogiBoard(eyeView);
                break;
        }


        loader(board, loadImage, function () { //load images
            canvas.width = board.cwidth;
            canvas.height = board.cheight;
            sqSize = board.cwidth / board.nbSqPSideX;
            nbSqPSideX = board.nbSqPSideX;
            nbSqPSideY = board.nbSqPSideY;
            

            socket.emit('getInitBoardState', board.variant);

            socket.on('getInitBoardState', (state)=>{
                board.gameStates.push(state);
                socket.emit('getBoardStates', data.gid);
            });


            socket.on('getBoardStates', (states)=>{
                board.moveNb = states.length;
                board.eyeNb = states.length;
                if(states != null){
                    for (var state in states){
                        board.gameStates.push(states[state].gamestate);
                    }
                }
                if(isItMyTurn()){
                    board.generateValidMoves();
                }
                draw(board, board.moveNb);
            })

            socket.on('sendGameState', (state)=>{
                console.log("i've received the state", state);
                board.gameStates.push(state);
                board.moveNb += 1; 
                board.eyeNb = board.moveNb;
                if(isItMyTurn()){
                    board.generateValidMoves();
                }
                draw(board, board.moveNb);
            })
            
            if(eye == "w" || eye == "b"){
                canvas.addEventListener('mousedown', (event)=>{clickHandler(board, event)});
            }

            document.addEventListener('keydown', function(e) {
                if(board.focus.piece != null){
                    console.log("dropped piece :", board.focus.piece.type, board.focus.piece.colour)
                    board.focus.piece = null;
                }
                switch (e.keyCode) {
                    //navigate through gamestates
                    case 37:
                        if(board.eyeNb>0){
                            board.eyeNb -= 1;
                        }
                        break;
                    case 38:
                        if(board.eyeNb<board.moveNb){
                            board.eyeNb += 1;
                        }
                        break;
                    case 39:
                        if(board.eyeNb<board.moveNb){
                            board.eyeNb += 1;
                        }
                        break;
                    case 40:
                        if(board.eyeNb>0){
                            board.eyeNb -= 1;
                        }
                        break;
                    //change point of view
                    case 66:
                        eyeView = "black";
                        break;
                    case 87:
                        eyeView = "white";
                        break;
                    
                }
                draw(board, board.eyeNb);
            });

        });
    });
});   




   