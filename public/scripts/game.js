$( document ).ready(function() { 


    // Gets the game id from the URL
    var url = window.location.href
    var reGid = /([\w\d_-]*)\.?[^\\\/]*$/i;
    var gid = url.match(reGid)[1];

    // Get data to start game using game id
    $.get("/initData/"+gid, function (data) {

        //   .--.      .-'.      .--.      .--.      .--.      .--.      .`-.      .--.
        // :::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\
        // '      `--'      `.-'      `--'      `--'      `--'      `-.'      `--'      `
        // UTLITY VARIABLES
        //   .--.      .-'.      .--.      .--.      .--.      .--.      .`-.      .--.
        // :::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\
        // '      `--'      `.-'      `--'      `--'      `--'      `-.'      `--'      `
        var [
            // Instantiate necessary variables
            socket, //socket.io
            eye, //player's role, black, white or spectator
            canvas, 
            letters, //alphabet 
            eyeView, //player's pov, black or white
            increment, 
            isLive, //true if still ongoing
            time, 
            variant, //1 (international), 2(xiangqi), 3(shogi)
            // Black's data
            busername, 
            bcountry,
            brw,
            brx,
            brs,
            wusername,
            // White's data
            wcountry,
            wrw,
            wrx,
            wrs,
            // More variables
            opponentDiv,
            playerDiv,
            datagameinfo,
            opponentData,
            playerData,
            usernames,
            divEyeNb,
            divMoveNb,
            // Undefined variables
            histimer, //opponent's clock
            mytimer, //player's clock
            nbSqPSideX, //number of squares on x axis
            nbSqPSideY, //number of squares on y axis
            sqSize, //square of pixel size
            board, 
            hasMove, 
            peice, 
            kingPosition, 
            newPieceMoves, 
            isStale, 
            occupied, 
            mySquares, 
            hisSquares, 
            promoteConfig
            ] = 
            [
            io(),
            data.eyeView,
            document.getElementById("board"),
            "abcdefghijklmnopqrstuvwxyz",
            (data.eyeView == "white" || data.eyeView == "spectator") ? "white" : "black",
            data.increment,
            data.live,
            data.time,
            data.variant,
            data.busername,
            data.bcountry,
            data.brw,
            data.brx,
            data.brs,
            data.wusername,
            data.wcountry,
            data.wrw,
            data.wrx,
            data.wrs,
            document.getElementById("player1"),
            document.getElementById("player2"),
            document.getElementById("datagameinfo"),
            document.getElementById("dataplayer1"),
            document.getElementById("dataplayer2"),
            {"white":data.wusername,"black":data.busername},
            document.getElementById("eyeNb"),
            document.getElementById("moveNb")
            ];

        // If the user leaves the page, kick from room
        window.onbeforeunload = confirmExit;
        function confirmExit()
        {
            socket.emit('leaveRoom', gid);
            return undefined;
        }

        // Set default times
        document.getElementById("playertime").innerHTML = "&nbsp;"+time+":00";
        document.getElementById("opponenttime").innerHTML = "&nbsp;"+time+":00";

        // Instantiate the socket and join room named after gid
        socket.emit('setRoom', gid);


        // Create context from canvas
        var ctx = canvas.getContext("2d")

        // If shogi, create canvases and contexts fort side boards
        if(variant==3){
            var canvasCptOne = document.getElementById("capturedOne");
            var ctxCptOne = canvasCptOne.getContext("2d");
            var canvasCptTwo = document.getElementById("capturedTwo");
            var ctxCptTwo = canvasCptTwo.getContext("2d");
            var opponentSb = document.getElementById("sbOne");
            var playerSb = document.getElementById("sbTwo");
            var opponentSbNbDeadPawn = document.getElementById("valuesPawnOne");
            var playerSbNbDeadPawn = document.getElementById("valuesPawnTwo");
            var opponentSbNbDeadLance = document.getElementById("valuesLanceOne");
            var playerSbNbDeadLance = document.getElementById("valuesLanceTwo");
            var opponentSbNbDeadKnight = document.getElementById("valuesKnightOne");
            var playerSbNbDeadKnight = document.getElementById("valuesKnightTwo");
            var opponentSbNbDeadSilver = document.getElementById("valuesSilverOne");
            var playerSbNbDeadSilver = document.getElementById("valuesSilverTwo");
            var opponentSbNbDeadGold = document.getElementById("valuesGoldOne");
            var playerSbNbDeadGold = document.getElementById("valuesGoldTwo");
            var opponentSbNbDeadBishop = document.getElementById("valuesBishopOne");
            var playerSbNbDeadBishop = document.getElementById("valuesBishopTwo");
            var opponentSbNbDeadRook = document.getElementById("valuesRookOne");
            var playerSbNbDeadRook = document.getElementById("valuesRookTwo");
        }


        //   .--.      .-'.      .--.      .--.      .--.      .--.      .`-.      .--.
        // :::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\
        // '      `--'      `.-'      `--'      `--'      `--'      `-.'      `--'      `
        //                             UTILITY FUNCTIONS
        //   .--.      .-'.      .--.      .--.      .--.      .--.      .`-.      .--.
        // :::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\
        // '      `--'      `.-'      `--'      `--'      `--'      `-.'      `--'      `

        function isStrInArray(array, value) { //returns true if e.g isStrInArray(["a1"], "a1")
            return array.indexOf(value) > -1;
        }

        function isArrayInArray(array, value){ //returns true if e.g isArrayInArray([[1,2]], [1,2])
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

        function arraysEqual(a, b) { //checks if two arrays (same order here) are equal 
            if (a === b) return true;
            if (a == null || b == null) return false;
            if (a.length !== b.length) return false;
            for (var i = 0; i < a.length; ++i) {
                if (a[i] !== b[i]) return false;
            }
            return true;
        }

        function getPromotedStrs(str, num){ //returns squares where promoted configs need to be displayed
            var i;
            var squares = [];
            if(eye=="white"){ //decrement
                for(i=0;i<num;i++){
                    squares.push(str[0]+(str.substring(1)-i));
                }
            }else{ //increment
                for(i=0; i<num;i++){
                    squares.push(str[0]+(parseInt(str.substring(1))+i));
                }
            }
            return squares;
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
       
        function getDateDiff(date){ //get time difference in millis
            return new Date().getTime()-date;
        }

        function getFutureDate(millis){ //get date object from current time + millis
            var dateObj = Date.now();
            dateObj += millis;
            return new Date(dateObj);
        }

        function setClockTime(millis, name){ //sets clock time for visual purposes
            var cd = countdown(Date.now(), getFutureDate(millis), countdown.MINUTES | countdown.SECONDS);
            document.getElementById(name).innerHTML = "&nbsp;"+cd.minutes+":"+(cd.seconds < 10 ? '0' : '')+cd.seconds;
            if(name == "playertime"){
                document.getElementById("timerplayer2").style.backgroundColor = "grey";
            }else{
                document.getElementById("timerplayer1").style.backgroundColor = "grey";
            }
        }

        function startTimer(endDate, name){ //initiates countdown using date object endDate
            if(name == "playertime"){
                document.getElementById("timerplayer2").style.backgroundColor = "white";
            }else{
                document.getElementById("timerplayer1").style.backgroundColor = "white";
            }
            var timer = countdown
                (
                    endDate, (ts)=> {
                        document.getElementById(name).innerHTML = "&nbsp;"+ts.minutes+":"+(ts.seconds < 10 ? '0' : '')+ts.seconds;
                        if(ts.minutes==0 && ts.seconds==0){
                            stopCountdown(timer);
                        }
                    },
                    countdown.MINUTES|countdown.SECONDS
            );
            return timer;
        }

        function pauseTimer(timer){ //pauses timer 
            window.clearInterval(timer);
        }

        function stopCountdown(timer){ //pauses timer and ends game
            window.clearInterval(timer);
            if(eye == "white" || eye == "black"){
                if(isItMyTurn()){
                    socket.emit('gameover', {gid:gid,type:"timeover",winnercolour:returnOpponentEye(eye)});
                    alert("timeover, you lost on time");
                }else{
                    socket.emit('gameover', {gid:gid,type:"timeover",winnercolour:eye});
                    alert("timeover, you won on time");
                }
            }
        }

        function msToMinSec(millis) { //convert millis to secs
            var minutes = Math.floor(millis / 60000);
            var seconds = ((millis % 60000) / 1000).toFixed(0);
            return [minutes, parseInt(seconds)];
        }

        function deepCopyState(state){ //returns deep copy of board state
            var newState = {"gameMode":state.gameMode,"timeremaining":state.timeremaining,"moveNb":state.moveNb,"check":state.check,"lastMove":state.lastMove, pieces:[]}
            for(var piece in state.pieces){
                newState.pieces.push(
                    {
                    "pid": state.pieces[piece].pid,
                    "alive": state.pieces[piece].alive,
                    "numberMoves": state.pieces[piece].numberMoves,
                    "positionStr": state.pieces[piece].positionStr,
                    "positionCoord": state.pieces[piece].positionCoord,
                    "originalType": state.pieces[piece].originalType,
                    "type": state.pieces[piece].type,
                    "colour": state.pieces[piece].colour,
                    "spriteCoord": state.pieces[piece].spriteCoord
                })  
            }
                return newState;
        }

        function isKingInCheck(board, state, colour){ //checks if king with in check, returns false or object {positionStr:value} if true, colour arg is the king's colour (w o)
            var occupancy;
            var isInCheck = false;
            var kingPos;
            var piece;
            var moves;
            var attackMove;

            for(var pieceIndex in state.pieces){ //get king position 
                piece = state.pieces[pieceIndex];
                if(piece.colour == colour && piece.alive && piece.type=="king"){
                    kingPos = piece.positionStr;
                    break;
                }
            }

            occupancy = board.getSquareOccupancy(state, returnOpponentEye(colour)); //get coords of all pieces on board

            for(var pieceIndex in state.pieces){ //if piece can attack the king then it is in check
                piece = state.pieces[pieceIndex];
                if(piece.colour==returnOpponentEye(colour) && piece.alive){ 
                    moves = board.getPieceMoves(piece, occupancy[0], occupancy[1]); 
                    for(var moveIndex in moves.canAttack){ 
                        attackMove = moves.canAttack[moveIndex];
                        if(attackMove == kingPos){
                            isInCheck=true;
                            break;
                        }
                    }
                }
                if(isInCheck==true){
                    break;
                }
            }

            if(isInCheck){
                return {
                    positionStr: kingPos
                }
            }else{
                return false;
            }
        }

        function drawPiece(context, board, s, d, sqSize, cwidth=null, cheight=null, degree=null, alpha=null){ //draws all motifs that appear on the canvas board object
            if(degree!=null){
                context.save(); 
                context.translate(cwidth, cheight);
                context.rotate(degree*Math.PI/180);
                if(alpha!=null){
                    context.globalAlpha = 0.8;
                }
                context.drawImage(
                    board.images.pieces, //img
                    s[0]*board.subSizeX, //sx 
                    s[1]*board.subSizeY, //sy
                    board.subSizeX,  //sWidth
                    board.subSizeY,  //sHeight
                    -d[0]*sqSize+(cwidth-50), //dx
                    -d[1]*sqSize+(cheight-50), //dy
                    sqSize, //dWidth
                    sqSize); //dHeight
                if(alpha!=null){
                    context.globalAlpha = 1.0;
                }
                context.restore();
            }else{
                if(alpha!=null){
                    context.globalAlpha = 0.8;
                }
                context.drawImage(
                    board.images.pieces, //img
                    s[0]*board.subSizeX, //sx 
                    s[1]*board.subSizeY, //sy
                    board.subSizeX,  //sWidth
                    board.subSizeY,  //sHeight
                    d[0]*sqSize, //dx
                    d[1]*sqSize, //dy
                    sqSize, //dWidth
                    sqSize); //dHeight
                if(alpha!=null){
                    context.globalAlpha = 1.0;
                }
            }
        }

        function drawSquare(context, position, sqSize, alpha=null, fillStyle=null){ //draw square on canvas given certain arguments
            if(fillStyle!=null){
                context.fillStyle = fillStyle;
            }
            if(alpha!=null){
                context.globalAlpha = 0.8;
            }
            context.fillRect(position[0]*sqSize, position[1]*sqSize, sqSize, sqSize);
            if(alpha!=null){
                context.globalAlpha = 1.0;
            }
        }

        function sbPlacement(type){ //used in shogi for placing pieces on sideboard, converts piece type with position
            switch(type) {
                case "pawn":
                    return "a1";
                case "lance":
                    return "b1";
                case "knight":
                    return "c1";
                case "silver":
                    return "a2";
                case "gold":
                    return "b2";
                case "bishop":
                    return "c2";
                case "rook":
                    return "a3";
            }
        }

        function strToPlacementPiece(str){ //used in shogi for placing pieces on sideboard, converts position string with piece type
            switch(str) {
                case "a1":
                    return "pawn";
                case "b1":
                    return "lance";
                case "c1":
                    return "knight";
                case "a2":
                    return "silver";
                case "b2":
                    return "gold";
                case "c2":
                    return "bishop";
                case "a3":
                    return "rook";
            }
        }

        function drawSbPieceAndDecoration(spanElement, nbDeadPieces, owner, type, colour, getSpriteCoord){ //draws pieces on sideboard
            if(nbDeadPieces[owner][type]!=0){
                spanElement.parentNode.style.display = "block";
                spanElement.innerHTML = "&nbsp;"+nbDeadPieces[owner][type];
                ((eyeView==colour) ?
                    ((eyeView=="white")? 
                        drawPiece(ctxCptTwo, board, board.coordinates[getSpriteCoord(type, colour)], strToPos(sbPlacement(type)), sqSize, 150, 150, 180, 0.2)
                        : 
                        drawPiece(ctxCptTwo, board, board.coordinates[getSpriteCoord(type, colour)], strToPos(sbPlacement(type)), sqSize, null, null, null, 0.2)
                    )
                    : 
                    ((eyeView=="white")? 
                        drawPiece(ctxCptOne, board, board.coordinates[getSpriteCoord(type, colour)], strToPos(sbPlacement(type)), sqSize, 150, 150, 180, 0.2)
                        : 
                        drawPiece(ctxCptOne, board, board.coordinates[getSpriteCoord(type, colour)], strToPos(sbPlacement(type)), sqSize, null, null, null, 0.2)
                    )
                )
            }else{
                spanElement.parentNode.style.display = "none";
            }
        }

        function draw(board, moveNb){ //draws board gamestate onto the canvas
            
            // Some necessary variables
            var validSquare; 
            var piece; 
            var boardPosition; 
            var srcImgPosition;
            var config;
            var configSquares;

            // Clearing and setting background
            ctx.clearRect(0, 0, board.cwidth, board.cheight); //clear canvas
            ctx.drawImage(board.images.board, 0, 0, board.cwidth, board.cheight); //background
            
            // Shogi Sideboard
            
            if(variant==3){
                ctxCptOne.clearRect(0, 0, board.cCptOneWidth, board.cCptOneHeight); //clear
                ctxCptTwo.clearRect(0, 0, board.cCptTwoWidth, board.cCptTwoHeight); //clear
                ctxCptOne.drawImage(board.images.sideboard, 0, 0, board.cCptOneWidth, board.cCptOneHeight); //background
                ctxCptTwo.drawImage(board.images.sideboard, 0, 0, board.cCptTwoWidth, board.cCptTwoHeight); //background

                var nbDeadPieces = board.prisoners;
                if(eyeView=="white"){
                    drawSbPieceAndDecoration(opponentSbNbDeadPawn, nbDeadPieces, "bDeadPieces", "pawn", "black", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadPawn, nbDeadPieces, "wDeadPieces", "pawn", "white", board.getSpriteCoord);
                    drawSbPieceAndDecoration(opponentSbNbDeadLance, nbDeadPieces, "bDeadPieces", "lance", "black", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadLance, nbDeadPieces, "wDeadPieces", "lance", "white", board.getSpriteCoord);
                    drawSbPieceAndDecoration(opponentSbNbDeadKnight, nbDeadPieces, "bDeadPieces", "knight", "black", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadKnight, nbDeadPieces, "wDeadPieces", "knight", "white", board.getSpriteCoord);
                    drawSbPieceAndDecoration(opponentSbNbDeadSilver, nbDeadPieces, "bDeadPieces", "silver", "black", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadSilver, nbDeadPieces, "wDeadPieces", "silver", "white", board.getSpriteCoord);
                    drawSbPieceAndDecoration(opponentSbNbDeadGold, nbDeadPieces, "bDeadPieces", "gold", "black", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadGold, nbDeadPieces, "wDeadPieces", "gold", "white", board.getSpriteCoord);
                    drawSbPieceAndDecoration(opponentSbNbDeadBishop, nbDeadPieces, "bDeadPieces", "bishop", "black", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadBishop, nbDeadPieces, "wDeadPieces", "bishop", "white", board.getSpriteCoord);
                    drawSbPieceAndDecoration(opponentSbNbDeadRook, nbDeadPieces, "bDeadPieces", "rook", "black", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadRook, nbDeadPieces, "wDeadPieces", "rook", "white", board.getSpriteCoord);
                }else{
                    drawSbPieceAndDecoration(opponentSbNbDeadPawn, nbDeadPieces, "wDeadPieces", "pawn", "white", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadPawn, nbDeadPieces, "bDeadPieces", "pawn", "black", board.getSpriteCoord);
                    drawSbPieceAndDecoration(opponentSbNbDeadLance, nbDeadPieces, "wDeadPieces", "lance", "white", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadLance, nbDeadPieces, "bDeadPieces", "lance", "black", board.getSpriteCoord);
                    drawSbPieceAndDecoration(opponentSbNbDeadKnight, nbDeadPieces, "wDeadPieces", "knight", "white", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadKnight, nbDeadPieces, "bDeadPieces", "knight", "black", board.getSpriteCoord);
                    drawSbPieceAndDecoration(opponentSbNbDeadSilver, nbDeadPieces, "wDeadPieces", "silver", "white", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadSilver, nbDeadPieces, "bDeadPieces", "silver", "black", board.getSpriteCoord);
                    drawSbPieceAndDecoration(opponentSbNbDeadGold, nbDeadPieces, "wDeadPieces", "gold", "white", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadGold, nbDeadPieces, "bDeadPieces", "gold", "black", board.getSpriteCoord);
                    drawSbPieceAndDecoration(opponentSbNbDeadBishop, nbDeadPieces, "wDeadPieces", "bishop", "white", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadBishop, nbDeadPieces, "bDeadPieces", "bishop", "black", board.getSpriteCoord);
                    drawSbPieceAndDecoration(opponentSbNbDeadRook, nbDeadPieces, "wDeadPieces", "rook", "white", board.getSpriteCoord);
                    drawSbPieceAndDecoration(playerSbNbDeadRook, nbDeadPieces, "bDeadPieces", "rook", "black", board.getSpriteCoord);
                }
            }


            // Previous move
            if(board.eyeNb!=0 && board.gameStates[moveNb].lastMove.originStr != null && board.gameStates[moveNb].lastMove.destinationStr != null){ 
                drawSquare(ctx, strToDrawPos(board.gameStates[moveNb].lastMove.originStr), sqSize, alpha=0.5, fillStyle="#00ccff")
                drawSquare(ctx, strToDrawPos(board.gameStates[moveNb].lastMove.destinationStr), sqSize, alpha=0.5, fillStyle="#00ccff")
            }

            // Legal moves
            if(board.focus.piece != null){ 
                if(board.focus.piece.positionStr != null){
                    drawSquare(ctx, strToDrawPos(board.focus.piece.positionStr), sqSize, alpha=0.8, fillStyle="#8080ff") //piece selected square
                }

                for(var square in board.focus.validSquares.canMove){ //piece move squares
                    drawSquare(ctx, strToDrawPos(board.focus.validSquares.canMove[square]), sqSize, alpha=0.8, fillStyle="#cc6600")
                }

                for(var square in board.focus.validSquares.canAttack){ //piece attack squares
                    drawSquare(ctx, strToDrawPos(board.focus.validSquares.canAttack[square]), sqSize, alpha=0.8, fillStyle="#ff3300")
                }
            }

            // King in check 
            if(board.gameStates[moveNb].check!=false){
                drawSquare(ctx, strToDrawPos(board.gameStates[moveNb].check.positionStr), sqSize, alpha=0.8, fillStyle="#ff1a1a")
            }

            // Pieces
            for(var pIndex in board.gameStates[moveNb].pieces){
                piece = board.gameStates[moveNb].pieces[pIndex]
                if(piece.alive){ 
                    if(variant!=3 || (variant == 3 && eyeView == "black")){
                        drawPiece(ctx, board, board.coordinates[piece.spriteCoord], strToDrawPos(piece.positionStr), sqSize);
                    }else{ //shogi piece rotation 
                        drawPiece(ctx, board, board.coordinates[piece.spriteCoord], strToDrawPos(piece.positionStr), sqSize, cwidth=canvas.width, cheight=canvas.height, degree=180);
                    }
                }
            }

            // Promotion
            if(board.promoting){ 
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = "#4d0000"; 
                ctx.fillRect(0, 0, board.cwidth, board.cheight); //hide background
                ctx.globalAlpha = 1.0;

                configSquares = getPromotedStrs(board.promotingSquare, board.promotionConfigs.length);

                for(var pConfig in board.promotionConfigs){
                    drawPiece(ctx, board, board.coordinates[board.promotionConfigs[pConfig].spriteCoord], strToDrawPos(configSquares[pConfig]), sqSize);
                }
            }

        }


        class Board{ //superclass that holds board variables and validates board events
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
                this.promotionConfigs = [];
                this.promotingChoice = [];
                this.promoting = false;
                this.promotingSquare;

            }

            getSquareOccupancy(gamestate, pov){ //returns two arrays that hold information about which pieces are actively on the board
                var myOccupiedSquares = [];
                var opponentOccupiedSquares = [];
                var piece;
                for(var pIndex in gamestate.pieces){
                    piece = gamestate.pieces[pIndex];
                    if(piece.alive){
                        if(piece.colour == pov){
                            myOccupiedSquares.push(piece.positionCoord);
                        }
                        else{
                            opponentOccupiedSquares.push(piece.positionCoord);
                        }
                    }
                }
                return [myOccupiedSquares, opponentOccupiedSquares]
            }


            generateValidMoves(){ //the master function which creates moves for each piece belonging to the player who's about to play
                var piece;
                var move;
                var newState;
                var occupancy = this.getSquareOccupancy(this.gameStates[this.moveNb], eye); //tracks down pieces on board with string position
                var myOccupiedSquares = occupancy[0];
                var opponentOccupiedSquares = occupancy[1];


                for(var pIndex in this.gameStates[this.moveNb].pieces){ //for each piece in current gamestate
                    piece = this.gameStates[this.moveNb].pieces[pIndex];
                    if(piece.colour == eye && piece.alive){ //if piece belongs to the user whos turn it is to play
                        this.moves[piece.pid] = this.getPieceMoves(piece, myOccupiedSquares, opponentOccupiedSquares); //generate positions
                    }
                    else if(piece.colour == eye && variant==3 && piece.alive == false){
                        this.moves[piece.pid] = this.getPieceMoves(piece, myOccupiedSquares, opponentOccupiedSquares); //generate positions
                    }
                }

                var newMoves = {};
                var newMove;
                var isValid;

                for(var pIndex in this.moves){ //filter out moves which would result in the king being attacked next move
                    newMove = {
                        canMove: [],
                        canAttack: []
                    };

                    for(var mIndex in this.moves[pIndex].canMove){ //for each no capture move
                        isValid = true;
                        move = this.moves[pIndex].canMove[mIndex];
                        newState = deepCopyState(this.gameStates[this.moveNb]); //create a copy gamestate
                        newState.pieces[pIndex].positionStr = move; //move piece in copy gamestate
                        newState.pieces[pIndex].positionCoord = strToPos(move);
                        newState.pieces[pIndex].alive = true;

                        if(isKingInCheck(this, newState, eye) == false){ //if, after moving the piece to the given square the king is not under attack by any opponent piece then it is valid
                            if(variant==2){ //xiangqi, if, after moving the piece to the given square the king is not facing the other king then it is valid
                                var wKingPos; 
                                var bKingPos; 
                                var occ = this.getSquareOccupancy(newState, eye);
                                var allBoardPiecesPos = occ[0].concat(occ[1]);
                                var isValid = false;

                                for(var pindex in newState.pieces){
                                    if(newState.pieces[pindex].pid == 4){
                                        wKingPos = newState.pieces[pindex].positionCoord;
                                    }
                                    if(newState.pieces[pindex].pid == 20){
                                        bKingPos = newState.pieces[pindex].positionCoord;
                                        break;
                                    }
                                }
                                if(wKingPos[0]==bKingPos[0]){
                                    for(var i=wKingPos[1]+1;i<bKingPos[1];i++){
                                        if(isArrayInArray(allBoardPiecesPos, [wKingPos[0], i])){
                                            isValid = true;
                                            break;
                                        }
                                    }
                                    if(isValid){
                                        newMove.canMove.push(move);
                                    }
                                }else{
                                    newMove.canMove.push(move);
                                }
                            }else{
                                newMove.canMove.push(move);
                            }
                        }
                    }
                    for(var mIndex in this.moves[pIndex].canAttack){ //for each capture move
                        isValid = true;
                        move = this.moves[pIndex].canAttack[mIndex];
                        newState = deepCopyState(this.gameStates[this.moveNb]); //create a copy gamestate

                        for(var pIndex2 in newState.pieces){ //if piece attacked change state to dead
                            if(newState.pieces[pIndex2].positionStr == move && newState.pieces[pIndex2].alive){ 
                                piece = newState.pieces[pIndex2];
                                piece.alive = false;
                                break;
                            }
                        }   

                        newState.pieces[pIndex].positionStr = move; //move piece in copy gamestate
                        newState.pieces[pIndex].positionCoord = strToPos(move);

                        if(isKingInCheck(this, newState, eye) == false){ //if, after moving the piece to the given square the king is not under attack by any opponent piece then it is valid
                            if(variant==2){ //xiangqi, if, after moving the piece to the given square the king is not facing the other king then it is valid
                                var wKingPos; 
                                var bKingPos; 
                                var allBoardPiecesPos = opponentOccupiedSquares.concat(myOccupiedSquares);
                                var isValid = false;

                                for(var pindex in newState.pieces){
                                    if(newState.pieces[pindex].pid == 4){
                                        wKingPos = newState.pieces[pindex].positionCoord;
                                    }
                                    if(newState.pieces[pindex].pid == 20){
                                        bKingPos = newState.pieces[pindex].positionCoord;
                                        break;
                                    }
                                }
                                if(wKingPos[0]==bKingPos[0]){
                                    for(var i=wKingPos[1]+1;i<bKingPos[1];i++){
                                        if(isArrayInArray(allBoardPiecesPos, [wKingPos[0], i])){
                                            isValid = true;
                                            break;
                                        }
                                    }
                                }

                                if(isValid){
                                    newMove.canAttack.push(move);
                                }
                            }else{
                                newMove.canAttack.push(move);
                            }
                        }
                    }
                    newMoves[pIndex] = newMove;
                }
                this.moves = newMoves;
            }

            isInsideField(pos, field){ //used to verify is a position is inside of the baord
                return ((pos[0]>field[0]&&pos[0]<field[1]&&pos[1]>field[2]&&pos[1]<field[3]) ? true : false);
            }

            generatePositions(pos, offsets, offsetType, myOccupiedSquares, opponentOccupiedSquares, playingField, attacksOnOffset=true, attackOver=false){ //helps generateValidMoves by creating all possible moves against other pieces but without insight into validity with things such as pinned pieces
                var moves = {
                    canMove: [],
                    canAttack: []
                };
                var newPosition;
                var attackOverVar;
                for(var offsetIndex in offsets){
                    var offset = offsets[offsetIndex];
                    newPosition = [pos[0],pos[1]];
                    newPosition[0] += offset[0];
                    newPosition[1] += offset[1];
                    attackOverVar = 0;
                    while(this.isInsideField(newPosition, playingField)){ //if position inside field
                        if(!isArrayInArray(myOccupiedSquares, newPosition)){ //if square not occupied by friendly piece
                            if(isArrayInArray(opponentOccupiedSquares, newPosition)){ //if square is occupied by enemy piece then
                                if(attackOver==false){
                                    if(attacksOnOffset){
                                        moves.canAttack.push(posToStr(newPosition));
                                        break;
                                    }else{
                                        break;
                                    }
                                }else{
                                    if(attackOverVar==0){
                                        if(attacksOnOffset){
                                            moves.canAttack.push(posToStr(newPosition));
                                        }else{
                                            attackOverVar += 1;
                                        }
                                    }else{
                                        moves.canAttack.push(posToStr(newPosition));
                                        break;
                                    }
                                }
                            }else{
                                if(attackOver==false){
                                    moves.canMove.push(posToStr(newPosition));
                                }else{
                                    if(attackOverVar==0){
                                        moves.canMove.push(posToStr(newPosition));
                                    }
                                }
                            }
                        }else{ //if it is occupied
                            if(attackOver){
                                if(attackOverVar==0){
                                    attackOverVar += 1;
                                }else{
                                    break;
                                }
                            }else{
                                break;
                            }
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


        class InternationalBoard extends Board { //holds information about the western chess pieces and rules
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
                    "images/international/board.png"
                ];
                this.coordinates = { //holds information about where the piece sprites are from the images file
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

            getPromotionConfigs(piece, str){ //holds information about piece promotions
                var promotionConfigs = []
                switch(piece.type){
                    case "pawn":
                        if(str[1]==8||str[1]==1){
                            if(piece.colour =="white"){
                                promotionConfigs.push({
                                    type:"queen",
                                    spriteCoord:2
                                });
                                promotionConfigs.push({
                                    type:"rook",
                                    spriteCoord:8
                                });
                                promotionConfigs.push({
                                    type:"bishop",
                                    spriteCoord:4
                                });
                                promotionConfigs.push({
                                    type:"knight",
                                    spriteCoord:6
                                });
                            }else{
                                promotionConfigs.push({
                                    type:"queen",
                                    spriteCoord:3
                                });
                                promotionConfigs.push({
                                    type:"rook",
                                    spriteCoord:9
                                });
                                promotionConfigs.push({
                                    type:"bishop",
                                    spriteCoord:5
                                });
                                promotionConfigs.push({
                                    type:"knight",
                                    spriteCoord:7
                                });
                                
                            }
                        }
                        break;
                }
                return promotionConfigs;
            }

            areCastlingSquaresCheckFree(state, kingId, type){ //helps getPieceMoves by checking if certain squares are being attacked by opponent pieces for the purpose of castling
                var isValid;
                var squaresToCheck;
                var opponentKingId = ((kingId==20) ? 4 : 20);
                if(eye == "white"){
                    if(type=="qs"){
                        squaresToCheck = ["c1", "d1"]

                    }else{
                        squaresToCheck = ["f1", "g1"]
                    }
                }else{
                    if(type=="qs"){
                        squaresToCheck = ["c8", "d8"]

                    }else{
                        squaresToCheck = ["f8", "g8"]
                    }
                }
                var newState = deepCopyState(state); 
                for(var pIndex in newState.pieces){ //this avoids infinte loop
                    if(newState.pieces[pIndex].pid==opponentKingId){
                        newState.pieces[pIndex].numberMoves = 1;
                        break;
                    }
                }
                for(var pIndex in newState.pieces){ //see if by moving king to d1 king is in check
                    if(newState.pieces[pIndex].pid==kingId){
                        newState.pieces[pIndex].positionStr = squaresToCheck[0]; 
                        newState.pieces[pIndex].positionCoord = strToPos(squaresToCheck[0]);
                        newState.pieces[pIndex].numberMoves = 1;

                        isValid = isKingInCheck(this, newState, eye); //if player's king is in check then 
                        if(isValid!=false){
                            isValid=false;
                            break;
                        }
                        newState.pieces[pIndex].positionStr = squaresToCheck[1]; 
                        newState.pieces[pIndex].positionCoord = strToPos(squaresToCheck[1]);
                        newState.pieces[pIndex].numberMoves = 1;
                        isValid = isKingInCheck(this, newState, eye); //if player's king is in check then 
                        if(isValid!=false){
                            isValid=false;
                            break;
                        }
                        isValid=true;
                        break;
                    }                                          
                }
                if(isValid==true){
                    return true;
                }else{
                    return false;
                }
            }

            getPieceMoves(piece, myOccupiedSquares, opponentOccupiedSquares){ //apply rules of each piece to generate moves
                var moves;
                switch(piece.type) {
                    case "king":
                        moves = this.generatePositions(piece.positionCoord, [[-1,1],[-1,0],[-1,-1],[0,1],[0,-1],[1,1],[1,0],[1,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,8,-1,8]);
                        
                        // Castling
                        var p;
                        var kingPiece;
                        var newState;
                        var isValidQs;
                        var isValidKs;
                        var allBoardPiecesPos = opponentOccupiedSquares.concat(myOccupiedSquares);

                        if(this.gameStates[this.moveNb].check==false){ //if king not in check
                            if(piece.numberMoves == 0){ //if king hasn't moved
                                for(var pIndex in this.gameStates[this.moveNb].pieces){ 
                                    p = this.gameStates[this.moveNb].pieces[pIndex];
                                    if(piece.colour=="white"){
                                        if(p.pid==0){ //queen-side (qs)
                                            if(p.numberMoves==0 && p.alive){ //if qs rook is alive and hasn't moved
                                                if((!isArrayInArray(allBoardPiecesPos, strToPos("d1")))&&(!isArrayInArray(allBoardPiecesPos, strToPos("c1")))){ 
                                                    if(this.areCastlingSquaresCheckFree(this.gameStates[this.moveNb], 4, "qs")==true){
                                                        moves.canMove.push("c1");
                                                    }    
                                                }
                                            }
                                        }
                                        if(p.pid==7){ //king-side (ks)
                                            if(p.numberMoves==0 && p.alive){ //if ks rook is alive hasn't moved
                                                if((!isArrayInArray(allBoardPiecesPos, strToPos("f1")))&&(!isArrayInArray(allBoardPiecesPos, strToPos("g1")))){ 
                                                    if(this.areCastlingSquaresCheckFree(this.gameStates[this.moveNb], 4, "ks")==true){
                                                        moves.canMove.push("g1");
                                                    }
                                                }
                                            }
                                            break; //we can break here since qs rook will always come first
                                        }
                                    }else{ //black
                                        if(p.pid==16){ //queen-side (qs)
                                            if(p.numberMoves==0 && p.alive){ //if qs rook is alive and hasn't moved
                                                if((!isArrayInArray(allBoardPiecesPos, strToPos("d8")))&&(!isArrayInArray(allBoardPiecesPos, strToPos("c8")))){ 
                                                    if(this.areCastlingSquaresCheckFree(this.gameStates[this.moveNb], 20, "qs")==true){
                                                        moves.canMove.push("c8");
                                                    }  
                                                }

                                            }
                                        }
                                        if(p.pid==23){ //king-side (ks)
                                            if(p.numberMoves==0 && p.alive){ //if ks rook is alive and hasn't moved
                                                if((!isArrayInArray(allBoardPiecesPos, strToPos("f8")))&&(!isArrayInArray(allBoardPiecesPos, strToPos("g8")))){ 
                                                    if(this.areCastlingSquaresCheckFree(this.gameStates[this.moveNb], 20, "ks")==true){
                                                        moves.canMove.push("g8");
                                                    }   
                                                }
                                            }
                                            break; //we can break here since qs rook will always come first
                                        }
                                    }
                                }
                            }
                        }
                        return moves;
                    case "queen":
                        return this.generatePositions(piece.positionCoord, [[-1,1],[-1,0],[-1,-1],[0,1],[0,-1],[1,1],[1,0],[1,-1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,8,-1,8]);
                    case "bishop":
                        return this.generatePositions(piece.positionCoord, [[-1,1],[1,1],[1,-1],[-1,-1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,8,-1,8]);
                    case "knight":
                        return this.generatePositions(piece.positionCoord, [[-2,1],[-1,2],[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,8,-1,8]);
                    case "rook":
                        return this.generatePositions(piece.positionCoord, [[-1,0],[0,1],[1,0],[0,-1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,8,-1,8]);
                    case "pawn":
                        var squareToCheck;
                        var twoMoveSquare;
                        var allBoardPiecesPos = opponentOccupiedSquares.concat(myOccupiedSquares);
                        var enPassantSquareCoord;
                        if(piece.colour=="white"){
                            if(piece.numberMoves==0){
                                moves = this.generatePositions(piece.positionCoord, [[0,1],[0,2]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,8,-1,8],false);
                                // Removes [0,2] if a piece stands on [0,1]
                                squareToCheck = strToPos(piece.positionStr[0] + (parseInt(piece.positionStr.substring(1))+1));
                                twoMoveSquare = piece.positionStr[0] + (parseInt(piece.positionStr.substring(1))+2);
                                if(isStrInArray(moves.canMove, twoMoveSquare)){
                                    if(isArrayInArray(allBoardPiecesPos, squareToCheck)){ 
                                        moves.canMove.splice(moves.canMove.indexOf(twoMoveSquare), 1);
                                    }
                                }
                            }else{
                                moves = this.generatePositions(piece.positionCoord, [[0,1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,8,-1,8],false);
                            }

                            // Add en-passant square
                            if(this.moveNb!=0){
                                if(this.gameStates[this.moveNb].lastMove.piece.type=="pawn"){
                                    if((Math.abs(this.gameStates[this.moveNb].lastMove.originCoord[1] - this.gameStates[this.moveNb].lastMove.destinationCoord[1]))>1){
                                        if(this.gameStates[this.moveNb].lastMove.piece.colour=="white"){
                                            enPassantSquareCoord = [this.gameStates[this.moveNb].lastMove.originCoord[0],this.gameStates[this.moveNb].lastMove.originCoord[1]+1];
                                        }else{
                                            enPassantSquareCoord = [this.gameStates[this.moveNb].lastMove.originCoord[0],this.gameStates[this.moveNb].lastMove.originCoord[1]-1];
                                        }
                                    }
                                }
                            }

                            // Attacking 
                            var newPosition;
                            var attackOffsets = [[1,1],[-1,1]]
                            for(var attackOffsetIndex in attackOffsets){
                                var attackOffset = attackOffsets[attackOffsetIndex];
                                newPosition = [piece.positionCoord[0],piece.positionCoord[1]];
                                newPosition[0] += attackOffset[0];
                                newPosition[1] += attackOffset[1];
                                if(this.isInsideField(newPosition, [-1,8,-1,8])){ //if position inside field
                                    if(isArrayInArray(opponentOccupiedSquares, newPosition)){ //if square is occupied by enemy piece then
                                            moves.canAttack.push(posToStr(newPosition));
                                    }
                                    if(typeof enPassantSquareCoord !== "undefined")
                                    {
                                        if(arraysEqual(newPosition,enPassantSquareCoord)){
                                            moves.canAttack.push(posToStr(newPosition));
                                        }
                                    } 
                                }
                            }
                            return moves;

                        }else{
                            if(piece.numberMoves==0){
                                moves = this.generatePositions(piece.positionCoord, [[0,-1],[0,-2]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,8,-1,8],false);
                                // Removes [0,-2] if a piece stands on [0,-1]
                                squareToCheck = strToPos(piece.positionStr[0] + (parseInt(piece.positionStr.substring(1))-1));
                                twoMoveSquare = piece.positionStr[0] + (parseInt(piece.positionStr.substring(1))-2);
                                if(isStrInArray(moves.canMove, twoMoveSquare)){
                                    if(isArrayInArray(allBoardPiecesPos, squareToCheck)){ 
                                        moves.canMove.splice(moves.canMove.indexOf(twoMoveSquare), 1);
                                    }
                                }
                            }else{
                                moves = this.generatePositions(piece.positionCoord, [[0,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,8,-1,8],false);
                            }

                            // Add en-passant square
                            if(this.moveNb!=0){
                                if(this.gameStates[this.moveNb].lastMove.piece.type=="pawn"){
                                    if((Math.abs(this.gameStates[this.moveNb].lastMove.originCoord[1] - this.gameStates[this.moveNb].lastMove.destinationCoord[1]))>1){
                                        if(this.gameStates[this.moveNb].lastMove.piece.colour=="white"){
                                            enPassantSquareCoord = [this.gameStates[this.moveNb].lastMove.originCoord[0],this.gameStates[this.moveNb].lastMove.originCoord[1]+1];
                                        }else{
                                            enPassantSquareCoord = [this.gameStates[this.moveNb].lastMove.originCoord[0],this.gameStates[this.moveNb].lastMove.originCoord[1]-1];
                                        }
                                    }
                                }
                            }

                            // Attacking
                            var newPosition;
                            var attackOffsets = [[-1,-1],[1,-1]]
                            for(var attackOffsetIndex in attackOffsets){
                                var attackOffset = attackOffsets[attackOffsetIndex];
                                newPosition = [piece.positionCoord[0],piece.positionCoord[1]];
                                newPosition[0] += attackOffset[0];
                                newPosition[1] += attackOffset[1];
                                if(this.isInsideField(newPosition, [-1,8,-1,8])){ //if position inside field
                                    if(isArrayInArray(opponentOccupiedSquares, newPosition)){ //if square is occupied by enemy piece then
                                            moves.canAttack.push(posToStr(newPosition));
                                    }
                                    if(typeof enPassantSquareCoord !== "undefined")
                                    {
                                        if(arraysEqual(newPosition,enPassantSquareCoord)){
                                            moves.canAttack.push(posToStr(newPosition));
                                        }
                                    } 
                                }
                            }
                            return moves;
                        }
                }
            }
        }

        class XiangqiBoard extends Board { //holds information about the xiangqi chess pieces and rules
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
                this.coordinates = { //holds information about where the piece sprites are from the images file
                    0: [0, 0], //general/governor/jiang white (w)
                    1: [0, 1], //general/governor/jiang black (b)
                    2: [1, 0], //counselor/senior/shi w
                    3: [1, 1], //counselor/senior/shi b
                    7: [2, 1], //elephant/minister/shiang b
                    4: [3, 0], //knight/horse/ma w
                    5: [3, 1], //knight/horse/ma b
                    6: [2, 0], //elephant/minister/shiang w
                    8: [4, 0], //rook/chariot/chuh w
                    9: [4, 1], //rook/chariot/chuh b
                    10: [5, 0], //catapult/cannon/pao w
                    11: [5, 1], //catapult/cannon/pao b
                    12: [6, 0], //pawn/soldier w
                    13: [6, 1] //pawn/soldier b
                };
            }

            getPromotionConfigs(piece, str){ //holds information about piece promotions
                var promotionConfigs = []
                switch(piece.type){
                    case "pawn":
                        if(piece.colour=="white"){
                            if(str[1]==6){
                                promotionConfigs.push({
                                    type:"promotedpawn",
                                    spriteCoord:12
                                });                                
                            }
                        }else{
                            if(str[1]==5){
                                promotionConfigs.push({
                                    type:"promotedpawn",
                                    spriteCoord:13
                                });                                
                            }
                        }
                        break;
                }
                return promotionConfigs;
            }

            inBetweenElephantJump(str1, str2){
                var pos1 = strToPos(str1);
                var pos2 = strToPos(str2);
                var pos3 = [];
                if(pos1[0]>pos2[0]){
                    pos3.push(pos2[0] + 1);
                }else{
                    pos3.push(pos1[0] + 1);
                }
                if(pos1[1]>pos2[1]){
                    pos3.push(pos2[1] + 1);
                }else{
                    pos3.push(pos1[1] + 1);
                }
                return pos3;               
            }

            inBetweenKnightJump(str1, str2){   
                var pos1 = strToPos(str1); //after
                var pos2 = strToPos(str2); //before
                var diffX = pos1[0]-pos2[0];
                var diffY = pos1[1]-pos2[1];

                if(Math.abs(diffX) > Math.abs(diffY)){
                    if(diffX<0){
                        return [pos2[0] - 1, pos2[1]];
                    }else{
                        return [pos2[0] + 1, pos2[1]];
                    }
                }else{
                    if(diffY<0){
                        return [pos2[0], pos2[1] - 1];
                    }else{
                        return [pos2[0], pos2[1] + 1];
                    }
                }
            }

            getPieceMoves(piece, myOccupiedSquares, opponentOccupiedSquares){ //apply rules of each piece to generate moves
                switch(piece.type) {
                    case "king":
                        if(piece.colour=="white"){
                            return this.generatePositions(piece.positionCoord, [[-1,0],[0,1],[0,-1],[1,0]], "singular", myOccupiedSquares, opponentOccupiedSquares, [2,6,-1,3]);

                        }else{
                            return this.generatePositions(piece.positionCoord, [[-1,0],[0,1],[0,-1],[1,0]], "singular", myOccupiedSquares, opponentOccupiedSquares, [2,6,6,10]);
                        }                
                        break;
                    case "counselor":
                        if(piece.colour=="white"){
                            return this.generatePositions(piece.positionCoord, [[-1,-1],[-1,1],[1,1],[1,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [2,6,-1,3]);

                        }else{
                            return this.generatePositions(piece.positionCoord, [[-1,-1],[-1,1],[1,1],[1,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [2,6,6,10]);
                        }                
                        break;
                    case "catapult":
                        return this.generatePositions(piece.positionCoord, [[-1,0],[0,1],[1,0],[0,-1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,10], false, true);
                        break;
                    case "elephant":
                        var moves;
                        var newMoves = {
                            canMove: [],
                            canAttack: []
                        };
                        var squareToCheck;
                        if(piece.colour=="white"){
                            moves = this.generatePositions(piece.positionCoord, [[-2,-2],[-2,2],[2,2],[2,-2]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,5]);
                            for(var move in moves.canMove){
                                squareToCheck = this.inBetweenElephantJump(moves.canMove[move], piece.positionStr); //square in between elephant jump
                                if(!isArrayInArray(opponentOccupiedSquares.concat(myOccupiedSquares), squareToCheck)){ //is the square occupied by friendly/opponent piece
                                    newMoves.canMove.push(moves.canMove[move]);
                                }
                            }
                            for(var move in moves.canAttack){
                                squareToCheck = this.inBetweenElephantJump(moves.canAttack[move], piece.positionStr); //square in between elephant jump
                                if(!isArrayInArray(opponentOccupiedSquares.concat(myOccupiedSquares), squareToCheck)){ //is the square occupied by friendly/opponent piece
                                    newMoves.canAttack.push(moves.canAttack[move]);
                                }
                            }
                            return newMoves;
                        }else{
                            moves = this.generatePositions(piece.positionCoord, [[-2,-2],[-2,2],[2,2],[2,-2]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,4,10]);
                            for(var move in moves.canMove){
                                squareToCheck = this.inBetweenElephantJump(moves.canMove[move], piece.positionStr); //square in between elephant jump
                                if(!isArrayInArray(opponentOccupiedSquares.concat(myOccupiedSquares), squareToCheck)){ //is the square occupied by friendly/opponent piece
                                    newMoves.canMove.push(moves.canMove[move]);
                                }
                            }
                            for(var move in moves.canAttack){
                                squareToCheck = this.inBetweenElephantJump(moves.canAttack[move], piece.positionStr); //square in between elephant jump
                                if(!isArrayInArray(opponentOccupiedSquares.concat(myOccupiedSquares), squareToCheck)){ //is the square occupied by friendly/opponent piece
                                    newMoves.canAttack.push(moves.canAttack[move]);
                                }
                            }
                            return newMoves;
                        }       
                        break;
                    case "knight":
                        var moves;
                        var newMoves = {
                            canMove: [],
                            canAttack: []
                        };
                        var squareToCheck;
                        moves = this.generatePositions(piece.positionCoord, [[-2,1],[-1,2],[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,10]);
                        for(var move in moves.canMove){
                            squareToCheck = this.inBetweenKnightJump(moves.canMove[move], piece.positionStr); //square in between knight jump
                            if(!isArrayInArray(opponentOccupiedSquares.concat(myOccupiedSquares), squareToCheck)){ //is the square occupied by friendly/opponent piece
                                newMoves.canMove.push(moves.canMove[move]);
                            }
                        }
                        for(var move in moves.canAttack){
                            squareToCheck = this.inBetweenElephantJump(moves.canAttack[move], piece.positionStr); //square in between knight jump
                            if(!isArrayInArray(opponentOccupiedSquares.concat(myOccupiedSquares), squareToCheck)){ //is the square occupied by friendly/opponent piece
                                newMoves.canAttack.push(moves.canAttack[move]);
                            }
                        }
                        return newMoves;
                        break;
                    case "rook":
                        return this.generatePositions(piece.positionCoord, [[-1,0],[0,1],[1,0],[0,-1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,10]);
                        break;
                    case "pawn":
                        if(piece.colour=="white"){
                            return this.generatePositions(piece.positionCoord, [[0,1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,10]);
                        }else{
                            return this.generatePositions(piece.positionCoord, [[0,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,10]);
                        }
                        break;
                    case "promotedpawn":
                        if(piece.colour=="white"){
                            return this.generatePositions(piece.positionCoord, [[0,1],[-1,0],[1,0]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,10]);
                        }else{
                            return this.generatePositions(piece.positionCoord, [[0,-1],[-1,0],[1,0]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,10]);
                        }
                        break;
                }
            }
        }

        class ShogiBoard extends Board { //holds information about the shogi chess pieces and rules
            constructor(eyeView) {
                super();
                this.variant = 3;
                this.type = "shogi";
                this.cwidth = 450;
                this.cheight = 450;
                this.cCptOneWidth = 150;
                this.cCptOneHeight = 150;
                this.cCptTwoWidth = 150;
                this.cCptTwoHeight = 150;
                this.nbSqPSideX = 9;
                this.nbSqPSideY = 9;
                this.subSizeX = 225;
                this.subSizeY = 250;
                this.prisoners;
                this.images = {
                    board: null,
                    pieces: null,
                    sideboard: null
                };
                this.imageSrcs = [
                    "images/shogi/pieces.png",
                    "images/shogi/board.jpg",
                    "images/shogi/sideboard.jpg"
                ];
                this.coordinates = { //holds information about where the piece sprites are from the images file
                    0: [0, 2], //king for higher-ranked player/champion black (w)
                    1: [0, 3], //king for lower-ranked player/challenger w
                    2: [0, 0], //king for higher-ranked player/champion white (b)
                    3: [0, 1], //king for lower-ranked player/challenger b
                    4: [1, 2],  //rook w
                    5: [1, 3],  //rook w p
                    6: [1, 0],  //rook b
                    7: [1, 1],  //rook b promoted(p)
                    8: [2, 2],  //bishop w
                    9: [2, 3],  //bishop w p
                    10: [2, 0],  //bishop b
                    11: [2, 1],  //bishop b p
                    12: [3, 2],  //gold w 
                    13: [3, 3],  //gold w p
                    14: [3, 0],  //gold b
                    15: [3, 1],  //gold b p
                    16: [4, 2],  //silver w 
                    17: [4, 3],  //silver w p
                    18: [4, 0],  //silver b
                    19: [4, 1],  //silver b p
                    20: [5, 2],  //knight w 
                    21: [5, 3],  //knight w p
                    22: [5, 0],  //knight b
                    23: [5, 1],  //knight b p
                    24: [6, 2],  //lance w
                    25: [6, 3],  //lance w p
                    26: [6, 0],  //lance b 
                    27: [6, 1],  //lance b p
                    28: [7, 2],  //pawn w
                    29: [7, 3],  //pawn w p
                    30: [7, 0],  //pawn b
                    31: [7, 1],  //pawn b p
                }
            }
            getPromotionConfigs(piece, str){ //holds information about piece promotions
                var promotionConfigs = []
                if(piece.originalType == piece.type && piece.type != "gold" && piece.type != "king"){
                    if(piece.colour == "white"){
                        if(str[1]>6 || piece.positionStr[1]>6 ){
                            if(piece.type=="gold" || piece.type=="silver" || piece.type=="rook" || piece.type=="bishop"){
                                promotionConfigs.push({
                                    type:piece.type,
                                    spriteCoord:piece.spriteCoord
                                });
                            }
                            switch(piece.type){
                                case "pawn":
                                    if(str[1]==9){
                                        promotionConfigs.push({
                                            type:"gold",
                                            spriteCoord:29
                                        });
                                    }else{
                                        promotionConfigs.push({
                                            type:piece.type,
                                            spriteCoord:piece.spriteCoord
                                        });
                                        promotionConfigs.push({
                                            type:"gold",
                                            spriteCoord:29
                                        });
                                    }
                                    break;
                                case "lance":
                                    if(str[1]==9){
                                        promotionConfigs.push({
                                            type:"gold",
                                            spriteCoord:25
                                        });
                                    }else{
                                        promotionConfigs.push({
                                            type:piece.type,
                                            spriteCoord:piece.spriteCoord
                                        });
                                        promotionConfigs.push({
                                            type:"gold",
                                            spriteCoord:25
                                        });
                                    }
                                    break;
                                case "knight":
                                    if(str[1]==9 || str[1]==8){
                                        promotionConfigs.push({
                                            type:"gold",
                                            spriteCoord:21
                                        });
                                    }else{
                                        promotionConfigs.push({
                                            type:piece.type,
                                            spriteCoord:piece.spriteCoord
                                        });
                                        promotionConfigs.push({
                                            type:"gold",
                                            spriteCoord:21
                                        });
                                    }
                                    break;
                                case "silver":
                                    promotionConfigs.push({
                                        type:"gold",
                                        spriteCoord:17
                                    });
                                    break;
                                case "rook":
                                    promotionConfigs.push({
                                        type:"prook",
                                        spriteCoord:5
                                    });
                                    break;
                                case "bishop":
                                    promotionConfigs.push({
                                        type:"pbishop",
                                        spriteCoord:9
                                    });
                                    break;
                            }
                        }
                    }else{
                        if(str[1]<4 || piece.positionStr[1]<4){
                            if(piece.type=="gold" || piece.type=="silver" || piece.type=="rook" || piece.type=="bishop"){
                                promotionConfigs.push({
                                    type:piece.type,
                                    spriteCoord:piece.spriteCoord
                                });
                            }
                            switch(piece.type){
                                case "pawn":
                                    if(str[1]==1){
                                        promotionConfigs.push({
                                            type:"gold",
                                            spriteCoord:31
                                        });
                                    }else{
                                        promotionConfigs.push({
                                            type:piece.type,
                                            spriteCoord:piece.spriteCoord
                                        });
                                        promotionConfigs.push({
                                            type:"gold",
                                            spriteCoord:31
                                        });
                                    }
                                    break;
                                case "lance":
                                    if(str[1]==1){
                                        promotionConfigs.push({
                                            type:"gold",
                                            spriteCoord:27
                                        });
                                    }else{
                                        promotionConfigs.push({
                                            type:piece.type,
                                            spriteCoord:piece.spriteCoord
                                        });
                                        promotionConfigs.push({
                                            type:"gold",
                                            spriteCoord:27
                                        });
                                    }
                                    break;
                                case "knight":
                                    if(str[1]==1 || str[1]==2){
                                        promotionConfigs.push({
                                            type:"gold",
                                            spriteCoord:23
                                        }); 
                                    }else{
                                        promotionConfigs.push({
                                            type:piece.type,
                                            spriteCoord:piece.spriteCoord
                                        });
                                        promotionConfigs.push({
                                            type:"gold",
                                            spriteCoord:23
                                        });
                                    }
                                    break;
                                case "silver":
                                    promotionConfigs.push({
                                        type:"gold",
                                        spriteCoord:19
                                    });
                                    break;
                                case "rook":
                                    promotionConfigs.push({
                                        type:"prook",
                                        spriteCoord:7
                                    });
                                    break;
                                case "bishop":
                                    promotionConfigs.push({
                                        type:"pbishop",
                                        spriteCoord:11
                                    });
                                    break;
                            }
                        }
                    }
                }
                return promotionConfigs;
            }

            createPrisonerList(){ //used for the purpose of displaying pieces to the sideboard and thus dropping
                var wDeadPieces = {
                    "pawn":0,
                    "lance":0,
                    "knight":0,
                    "silver":0,
                    "gold":0,
                    "bishop":0,
                    "rook":0
                }
                var bDeadPieces = {
                    "pawn":0,
                    "lance":0,
                    "knight":0,
                    "silver":0,
                    "gold":0,
                    "bishop":0,
                    "rook":0
                }
                
                for(var pIndex in board.gameStates[board.moveNb].pieces){
                    if(board.gameStates[board.moveNb].pieces[pIndex].alive == false){
                        if(board.gameStates[board.moveNb].pieces[pIndex].colour == "white"){
                            wDeadPieces[board.gameStates[board.moveNb].pieces[pIndex].originalType] += 1;
                        }else{
                            bDeadPieces[board.gameStates[board.moveNb].pieces[pIndex].originalType] += 1;
                        }
                    }
                }

                this.prisoners =  {"wDeadPieces":wDeadPieces, "bDeadPieces":bDeadPieces}
            }

            getBoardStrEmptySquares(limitX, limitY, occupiedSquares, minX=null, minY=null, skipXs=null, skipYs=null){ //used for dropping, returns array with all squares which aren't occupied
                var allBoardSquares = [];
                if(minX==null){
                 minX=0;
                }
                if(minY==null){
                    minY=0;
                }
                for (var x=minX;x<limitX;x++){
                    if(skipXs!=null){
                        if(skipXs.includes(x)){
                            continue;
                        }
                    }
                    for (var y=minY;y<limitY;y++){
                        if(skipYs!=null){
                            if(skipYs.includes(y)){
                                continue;
                            }
                        }
                        if(!isArrayInArray(occupiedSquares, [x,y])){
                            allBoardSquares.push(posToStr([x, y]));
                        }
                    }
                }
                return allBoardSquares;
            }

            getSpriteCoord(type, colour){ //used for dropping, returns colour according to spriteCoord
                switch(type) {
                    case "lance":
                        return ((colour=="white") ? 24 : 26);
                    case "knight":
                        return ((colour=="white") ? 20 : 22);
                    case "silver":
                        return ((colour=="white") ? 16 : 18);
                    case "gold":
                        return ((colour=="white") ? 12 : 14);
                    case "rook":
                        return ((colour=="white") ? 4 : 6);
                    case "bishop":
                        return ((colour=="white") ? 8 : 10);
                    case "pawn":
                        return ((colour=="white") ? 28 : 30);
                }
            }

            getPieceMoves(piece, myOccupiedSquares, opponentOccupiedSquares){ //apply rules of each piece to generate moves
                if(piece.alive){
                    switch(piece.type) {
                        case "king":
                            return this.generatePositions(piece.positionCoord, [[-1,1],[-1,0],[-1,-1],[0,1],[0,-1],[1,1],[1,0],[1,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                        case "lance":
                            if(piece.colour=="white"){
                                return this.generatePositions(piece.positionCoord, [[0,1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);

                            }else{
                                return this.generatePositions(piece.positionCoord, [[0,-1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                            }    
                        case "knight":
                            if(piece.colour=="white"){
                                return this.generatePositions(piece.positionCoord, [[-1,2],[1,2]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                            }else{
                                return this.generatePositions(piece.positionCoord, [[-1,-2],[1,-2]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                            }
                        case "silver":
                            if(piece.colour=="white"){
                                return this.generatePositions(piece.positionCoord, [[-1,1],[-1,-1],[0,1],[1,1],[1,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                            }else{
                                return this.generatePositions(piece.positionCoord, [[-1,1],[-1,-1],[0,-1],[1,1],[1,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                            }
                        case "gold":
                            if(piece.colour=="white"){
                                return this.generatePositions(piece.positionCoord, [[-1,1],[-1,0],[0,1],[0,-1],[1,1],[1,0]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                            }else{
                                return this.generatePositions(piece.positionCoord, [[-1,-1],[-1,0],[0,1],[0,-1],[1,-1],[1,0]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                            }
                        case "rook":
                            return this.generatePositions(piece.positionCoord, [[-1,0],[0,1],[1,0],[0,-1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                        case "bishop":
                            return this.generatePositions(piece.positionCoord, [[-1,1],[1,1],[1,-1],[-1,-1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                        case "pawn":
                            if(piece.colour=="white"){
                                return this.generatePositions(piece.positionCoord, [[0,1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                            }else{
                                return this.generatePositions(piece.positionCoord, [[0,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                            }
                        case "prook":
                            var rookMoves = this.generatePositions(piece.positionCoord, [[-1,0],[0,1],[1,0],[0,-1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                            var addons = this.generatePositions(piece.positionCoord, [[-1,1],[-1,-1],[1,1],[1,-1]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                            return {"canMove":rookMoves["canMove"].concat(addons["canMove"]), "canAttack":rookMoves["canAttack"].concat(addons["canAttack"])};
                        case "pbishop":
                            var bishopMoves = this.generatePositions(piece.positionCoord, [[-1,1],[1,1],[1,-1],[-1,-1]], "plural", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                            var addons = this.generatePositions(piece.positionCoord, [[-1,0],[0,1],[0,-1],[1,0]], "singular", myOccupiedSquares, opponentOccupiedSquares, [-1,9,-1,9]);
                            return {"canMove":bishopMoves["canMove"].concat(addons["canMove"]), "canAttack":bishopMoves["canAttack"].concat(addons["canAttack"])};
                        
                    }
                }else{ //dead pieces
                    switch(piece.type) {
                        case "pawn":
                            var moves = {"canMove":[], "canAttack":[]};
                            var p;
                            var skipXs = [];
                            var canMove;
                            var move;
                            var newState;
                            var isValid;

                            for(var pIndex in board.gameStates[board.moveNb].pieces){ //pawns can't be dropped on column where another of the player's unpromoted pawn is placed
                                p = board.gameStates[board.moveNb].pieces[pIndex];
                                if(p.type == "pawn" && p.alive && p.colour==eye){
                                    skipXs.push(p.positionCoord[0]);
                                }
                            }
                            if(piece.colour=="white"){
                                canMove = this.getBoardStrEmptySquares(this.nbSqPSideX, this.nbSqPSideY-1, myOccupiedSquares.concat(opponentOccupiedSquares), null, null, skipXs, null);
                            }else{
                                canMove = this.getBoardStrEmptySquares(this.nbSqPSideX, this.nbSqPSideY, myOccupiedSquares.concat(opponentOccupiedSquares), null, 1, skipXs, null);
                            }

                            for(var mIndex in canMove){ //pawns can't attack the king when dropped on the board
                                newState = deepCopyState(board.gameStates[board.moveNb]); 
                                move = canMove[mIndex];
                                for(var pIndex in newState.pieces){
                                    if(newState.pieces[pIndex].pid == piece.pid){
                                        newState.pieces[pIndex].positionStr = move;
                                        newState.pieces[pIndex].positionCoord = strToPos(move);
                                        newState.pieces[pIndex].alive = true;
                                        if(!isKingInCheck(this, newState, returnOpponentEye(eye))){
                                            moves["canMove"].push(move);
                                        }
                                        break;
                                    }
                                }
                            }
                            return moves;
                        case "lance":
                            if(piece.colour=="white"){
                                return {"canMove":this.getBoardStrEmptySquares(this.nbSqPSideX, this.nbSqPSideY-2, myOccupiedSquares.concat(opponentOccupiedSquares), null, null, null, null), "canAttack":[]};
                            }else{
                                return {"canMove":this.getBoardStrEmptySquares(this.nbSqPSideX, this.nbSqPSideY, myOccupiedSquares.concat(opponentOccupiedSquares), null, 2, null, null), "canAttack":[]};
                            }
                    
}                    return {"canMove":this.getBoardStrEmptySquares(this.nbSqPSideX, this.nbSqPSideY, myOccupiedSquares.concat(opponentOccupiedSquares)), "canAttack":[]};
                }
            }
        }

        function loader(board, loadImg, allDone) { //used for executing the code only once images have been received
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

        function loadImage(board, i, onComplete) { //works in cooperation with loader
            var onLoad = function (event) {
                event.target.removeEventListener("load", onLoad);
                var re = /([\w\d_-]*)\.?[^\\\/]*$/i;
                var type = event.target.src.match(re)[1];
                if(type == "pieces"){
                    board.images.pieces = event.target;
                }else if(type == "sideboard"){
                    board.images.sideboard = event.target;
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

        function getCursorPosition(event, canvas){ //gets cursor position when mouse is pressed on canvas
            var rect = canvas.getBoundingClientRect();
            var position = [Math.floor((event.clientX - rect.left)/sqSize), Math.floor((event.clientY - rect.top)/sqSize)];
            return position
        }

        function returnOpponentEye(e){ //returns opponent's eye
            return ((e=="white") ? "black" : "white");
        }

        function isItMyTurn(){ //returns true if it a player's turn according to eye and board move
            return (eye == (board.moveNb % 2 == 0 ? "white" : "black"));
        }

        function sbEventListener(board, type, event){ //important function, shogi sideboard event listener
            if(isItMyTurn() && board.eyeNb == board.moveNb && isLive){
                if(eyeView==eye){
                    if(type=="two"){
                        var pieceType = strToPlacementPiece(posToStr(getCursorPosition(event, canvasCptTwo)));
                        if(board.prisoners[eye[0]+"DeadPieces"][pieceType]>0){
                            for(var pIndex in board.gameStates[board.moveNb].pieces){
                                var piece = board.gameStates[board.moveNb].pieces[pIndex];
                                if(piece.colour==eye && piece.type==pieceType && piece.alive == false){
                                    board.focus.piece = piece;
                                    board.focus.validSquares = board.moves[piece.pid];
                                    draw(board, board.moveNb);
                                    break;
                                }
                            }
                        }
                    }
                }else{
                    if(type=="one"){
                        var pieceType = strToPlacementPiece(posToStr(getCursorPosition(event, canvasCptOne)));
                        if(board.prisoners[eye[0]+"DeadPieces"][pieceType]>0){
                            for(var pIndex in board.gameStates[board.moveNb].pieces){
                                var piece = board.gameStates[board.moveNb].pieces[pIndex];
                                if(piece.colour==eye && piece.type==pieceType && piece.alive == false){
                                    board.focus.piece = piece;
                                    board.focus.validSquares = board.moves[piece.pid];
                                    draw(board, board.moveNb);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        function boardEventListener(board, event){ //important function, main board event listener
            if(isItMyTurn() && board.eyeNb == board.moveNb && isLive){ //player's turn, eye on correct gamestate, game is live
                var pos = getCursorPosition(event, canvas);
                var str = drawPosToStr(pos);
                var piece;
                var configSquares;

                //grab piece
                if(board.focus.piece == null){
                    for(var pIndex in board.gameStates[board.moveNb].pieces){
                        piece = board.gameStates[board.moveNb].pieces[pIndex];
                        if(piece.positionStr == str && piece.colour == eye && piece.alive){ //if piece belongs to user and not dead
                            board.focus.piece = piece;
                            board.focus.validSquares = board.moves[piece.pid];
                            // console.log("holding piece :", piece.type, piece.colour, piece.positionStr)
                            draw(board, board.moveNb);
                            break;
                        }
                    }
                }

                //drop piece
                else{
                    if(board.promoting){
                        configSquares = getPromotedStrs(board.promotingSquare, board.promotionConfigs.length);

                        if(isStrInArray(configSquares, str)){
                            board.promotingChoice = board.promotionConfigs[configSquares.indexOf(str)];
                        }
                        else{
                            // console.log("promotion selected square is wrong");
                            board.focus.piece = null;
                            board.promoting = false;
                            draw(board, board.moveNb)
                        }
                    }


                    if(isStrInArray(board.focus.validSquares.canMove, str)||isStrInArray(board.focus.validSquares.canAttack, str)||board.promoting){ 

                        if(board.promoting==false){
                            if(!(variant == 3 && board.focus.piece.alive == false)){
                                board.promotingSquare = str;
                                board.promotionConfigs = board.getPromotionConfigs(board.focus.piece, str);
                                if(board.promotionConfigs.length!=0){
                                    board.promoting=true;
                                    draw(board, board.moveNb);
                                    return;
                                }
                            }
                        }

                        var newState = deepCopyState(board.gameStates[board.moveNb]); 
                        for(var pIndex in newState.pieces){
                            if(newState.pieces[pIndex].pid == board.focus.piece.pid && newState.pieces[pIndex].alive){
                                
                                piece = newState.pieces[pIndex];

                                for(var pIndex2 in newState.pieces){ //remove piece if on destination square by switching alive to false
                                    if(board.promoting==false){ 
                                        if(newState.pieces[pIndex2].positionStr == str && newState.pieces[pIndex2].alive){ 
                                            newState.pieces[pIndex2].alive = false;
                                            if(variant==3){
                                                newState.pieces[pIndex2].colour = returnOpponentEye(newState.pieces[pIndex2].colour);
                                                newState.pieces[pIndex2].type = newState.pieces[pIndex2].originalType;
                                                newState.pieces[pIndex2].spriteCoord = board.getSpriteCoord(newState.pieces[pIndex2].type, newState.pieces[pIndex2].colour)
                                                newState.pieces[pIndex2].positionStr = null;
                                                newState.pieces[pIndex2].positionCoord = null;
                                            }
                                            break;
                                        }
                                    }else{
                                        if(newState.pieces[pIndex2].positionStr == board.promotingSquare && newState.pieces[pIndex2].alive){ 
                                            newState.pieces[pIndex2].alive = false;
                                            if(variant == 3){
                                                newState.pieces[pIndex2].colour = returnOpponentEye(newState.pieces[pIndex2].colour);
                                                newState.pieces[pIndex2].type = newState.pieces[pIndex2].originalType;
                                                newState.pieces[pIndex2].spriteCoord = board.getSpriteCoord(newState.pieces[pIndex2].type, newState.pieces[pIndex2].colour)
                                                newState.pieces[pIndex2].positionStr = null;
                                                newState.pieces[pIndex2].positionCoord = null;
                                            }
                                            break;
                                        }
                                    }
                                }

                                if(board.moveNb!=0){ //en-passant in western chess
                                    if(newState.lastMove.piece.type=="pawn" && variant == 1 && piece.type == "pawn"){ 
                                        if((Math.abs(newState.lastMove.originCoord[1] - newState.lastMove.destinationCoord[1]))>1){
                                            if(newState.lastMove.piece.colour=="white"){
                                                if(posToStr([newState.lastMove.originCoord[0],newState.lastMove.originCoord[1]+1])==str){
                                                    for(var pIndex2 in newState.pieces){
                                                        if(newState.pieces[pIndex2].pid==newState.lastMove.piece.pid){
                                                            newState.pieces[pIndex2].alive = false;
                                                            break;
                                                        }
                                                    }
                                                }
                                            }else{
                                                if(posToStr([newState.lastMove.originCoord[0],newState.lastMove.originCoord[1]-1])==str){
                                                   for(var pIndex2 in newState.pieces){
                                                        if(newState.pieces[pIndex2].pid==newState.lastMove.piece.pid){
                                                            newState.pieces[pIndex2].alive = false;
                                                            break;
                                                        }
                                                    } 
                                                }
                                            }
                                        }
                                    }
                                }

                                if(piece.type=="king" && variant == 1){ //castling in western chess
                                    var diffPos = strToPos(board.focus.piece.positionStr)[0]-strToPos(str)[0];
                                    if((Math.abs(diffPos))>1){
                                        if(piece.colour=="white"){
                                            if(diffPos>0){ //queen-side
                                                for(var pIndex2 in newState.pieces){ //get rook
                                                    if(newState.pieces[pIndex2].pid==0){
                                                        newState.pieces[pIndex2].positionStr = "d1";
                                                        newState.pieces[pIndex2].positionCoord = strToPos("d1");
                                                        break;
                                                    }
                                                }
                                            }else{ //king-side
                                                for(var pIndex2 in newState.pieces){ //get rook
                                                    if(newState.pieces[pIndex2].pid==7){
                                                        newState.pieces[pIndex2].positionStr = "f1";
                                                        newState.pieces[pIndex2].positionCoord = strToPos("f1");
                                                        break;
                                                    }
                                                }
                                            }
                                        }else{
                                            if(diffPos>0){ //queen-side
                                                for(var pIndex2 in newState.pieces){ //get rook
                                                    if(newState.pieces[pIndex2].pid==16){
                                                        newState.pieces[pIndex2].positionStr = "d8";
                                                        newState.pieces[pIndex2].positionCoord = strToPos("d8");
                                                        break;
                                                    }
                                                }
                                            }else{ //king-side
                                                for(var pIndex2 in newState.pieces){ //get rook
                                                    if(newState.pieces[pIndex2].pid==23){
                                                        newState.pieces[pIndex2].positionStr = "f8";
                                                        newState.pieces[pIndex2].positionCoord = strToPos("f8");
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                
                                if(board.promoting==false){
                                    piece.positionStr = str;
                                    piece.positionCoord = strToPos(str);
                                }else{
                                    piece.positionStr = board.promotingSquare;
                                    piece.positionCoord = strToPos(board.promotingSquare);
                                    piece.type = board.promotingChoice.type;
                                    piece.spriteCoord = board.promotingChoice.spriteCoord;
                                }
                                piece.numberMoves += 1;
                                newState.lastMove.piece = piece;
                                break;

                            }
                            else if(newState.pieces[pIndex].pid == board.focus.piece.pid && newState.pieces[pIndex].alive==false){
                                piece = newState.pieces[pIndex];
                                newState.lastMove.piece = piece;
                                piece.positionStr = str;
                                piece.numberMoves+=1;
                                piece.positionCoord = strToPos(str);
                                piece.alive = true;
                                break
                            }
                        }
                        newState.check = false;
                        var isInCheck = isKingInCheck(board, newState, returnOpponentEye(eye)); //if opponent king is in check add flag to state
                        if(isInCheck!=null){
                            newState.check = isInCheck;
                        }
                        if(board.focus.piece.positionStr!=null){
                            newState.lastMove.originStr = board.focus.piece.positionStr;
                            newState.lastMove.originCoord = strToPos(board.focus.piece.positionStr);
                        }else{
                            newState.lastMove.originStr = null;
                            newState.lastMove.originCoord = null;
                        }
                        newState.lastMove.destinationStr = str;
                        newState.lastMove.destinationCoord = strToPos(str);
                        newState.moveNb += 1;
                        // clock
                        if(newState.moveNb == 1){
                            newState.timeremaining = {
                                "date": new Date().getTime(),
                                "timeleftmillis": time*60000
                            }
                            histimer = startTimer(getFutureDate(time*60000), "opponenttime")
                        }else if(newState.moveNb == 2){
                            newState.timeremaining = {
                                "date": new Date().getTime(),
                                "timeleftmillis": time*60000 - getDateDiff(board.gameStates[board.moveNb].timeremaining.date) + increment * 1000
                            }
                            pauseTimer(mytimer);
                            setClockTime(newState.timeremaining.timeleftmillis, "playertime");
                            histimer = startTimer(getFutureDate(time*60000), "opponenttime")
                        }else{
                            newState.timeremaining = {
                                "date": new Date().getTime(),
                                "timeleftmillis": board.gameStates[board.moveNb-1].timeremaining.timeleftmillis - getDateDiff(board.gameStates[board.moveNb].timeremaining.date) + increment * 1000
                            }
                            pauseTimer(mytimer);
                            setClockTime(newState.timeremaining.timeleftmillis, "playertime");
                            histimer = startTimer(getFutureDate(board.gameStates[board.moveNb].timeremaining.timeleftmillis), "opponenttime")                  
                        }
                        socket.emit('sendGameState', {gid:gid,state:newState});
                        board.gameStates.push(newState);
                        board.moveNb += 1;
                        board.eyeNb += 1;
                        board.focus.piece = null;
                        board.moves = {};
                        board.promoting = false;
                        board.promotionConfigs = [];
                        divEyeNb.innerHTML = "&nbsp;"+board.eyeNb;
                        divMoveNb.innerHTML = "&nbsp;"+board.moveNb;
                        if(variant==3){
                            board.createPrisonerList();
                        }
                        draw(board, board.moveNb)
                    }
                    else{
                        board.focus.piece = null;
                        draw(board, board.moveNb)
                    }
                }
            } 
        }
        
        switch(variant){ //displays game information based on variant
            case 1:
                datagameinfo.innerHTML = "Western Chess "+time+"+"+increment;
                opponentData.style.width ="400px";
                playerData.style.width ="400px";
                if(eye=="white"){
                    opponentData.innerHTML = "&nbsp;&nbsp;"+wusername+" ("+wrw+")";
                    playerData.innerHTML = "&nbsp;&nbsp;"+busername+" ("+brw+")"; 
                }else{
                    opponentData.innerHTML = "&nbsp;&nbsp;"+busername+" ("+brw+")";
                    playerData.innerHTML = "&nbsp;&nbsp;"+wusername+" ("+wrw+")";
                }
                board = new InternationalBoard(eyeView);
                break;
            case 2:
                datagameinfo.innerHTML = "Xiangqi "+time+"+"+increment;
                opponentData.style.width ="450px";
                playerData.style.width ="450px";
                if(eye=="white"){
                    opponentData.innerHTML = "&nbsp;&nbsp;"+wusername+" ("+wrx+")";
                    playerData.innerHTML = "&nbsp;&nbsp;"+busername+" ("+brx+")"; 
                }else{
                    opponentData.innerHTML = "&nbsp;&nbsp;"+busername+" ("+brx+")";
                    playerData.innerHTML = "&nbsp;&nbsp;"+wusername+" ("+wrx+")";
                }
                board = new XiangqiBoard(eyeView);
                break;
            case 3: 
                datagameinfo.innerHTML = "Shogi "+time+"+"+increment;
                opponentData.style.width ="450px";
                playerData.style.width ="450px";
                if(eye=="white"){
                    opponentData.innerHTML = "&nbsp;&nbsp;"+wusername+" ("+wrs+")";
                    playerData.innerHTML = "&nbsp;&nbsp;"+busername+" ("+brs+")"; 
                }else{
                    opponentData.innerHTML = "&nbsp;&nbsp;"+busername+" ("+brs+")";
                    playerData.innerHTML = "&nbsp;&nbsp;"+wusername+" ("+wrs+")";
                }
                board = new ShogiBoard(eyeView);
                break;
        }


        //   .--.      .-'.      .--.      .--.      .--.      .--.      .`-.      .--.
        // :::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\
        // '      `--'      `.-'      `--'      `--'      `--'      `-.'      `--'      `
        //                After images are loaded, run events and listeners
        //   .--.      .-'.      .--.      .--.      .--.      .--.      .`-.      .--.
        // :::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\::::::::.\
        // '      `--'      `.-'      `--'      `--'      `--'      `-.'      `--'      `        
        loader(board, loadImage, function () { //load images and only after they have been loaded, start execution of the following
            canvas.width = board.cwidth;
            canvas.height = board.cheight;
            sqSize = board.cwidth / board.nbSqPSideX;
            nbSqPSideX = board.nbSqPSideX;
            nbSqPSideY = board.nbSqPSideY;
            
            if(eye=="white"){
                opponentDiv.style.marginTop = "-255px"; 
                playerDiv.style.marginTop = Math.round(board.cheight-195).toString()+"px"; 
            }else{
                opponentDiv.style.marginTop = "-255px"; 
                playerDiv.style.marginTop = Math.round(board.cheight-195).toString()+"px"; 
            }

            socket.emit('getInitBoardState', board.variant);

            socket.on('getInitBoardState', (state)=>{ //fetches initial board game state
                board.gameStates.push(state);
                socket.emit('getBoardStates', gid);
            });


            socket.on('getBoardStates', (states)=>{ //get all gamestates
                board.moveNb = states.length;
                board.eyeNb = states.length;
                divEyeNb.innerHTML = "&nbsp;"+board.eyeNb;
                divMoveNb.innerHTML = "&nbsp;"+board.moveNb;
                if(states != null){
                    for (var state in states){
                        board.gameStates.push(states[state].gamestate);
                    }
                }
                if(variant==3){
                    board.createPrisonerList();
                }

                if(isLive){ //if game is ongoing
                    hasMove = false;
                    if(isItMyTurn()){
                        board.generateValidMoves();
                        for(var mIndex in board.moves){ //check if player has at least one move.
                            if(board.moves[mIndex].canMove.length!=0||board.moves[mIndex].canAttack.length!=0){
                                hasMove = true;
                                break;
                            }
                        }
                        if(hasMove==false){ //if no possible moves
                            occupied = board.getSquareOccupancy(board.gameStates[board.moveNb], returnOpponentEye(eye));
                            mySquares = occupied[0];
                            hisSquares = occupied[1];
                            for(var pieceIndex in board.gameStates[board.moveNb].pieces){ //get king position
                                peice = board.gameStates[board.moveNb].pieces[pieceIndex];
                                if(peice.colour == eye && peice.type=="king"){
                                    kingPosition = peice.positionStr;
                                    break;
                                }
                            }
                            isStale = true;
                            for(var opIndex in board.gameStates[board.moveNb].pieces){ //if one of opponent's piece can attack my king then mate, else stalemate
                                if(isStale == false){
                                    break;
                                }
                                if(board.gameStates[board.moveNb].pieces[opIndex].colour == returnOpponentEye(eye) && board.gameStates[board.moveNb].pieces[opIndex].alive){ 
                                    newPieceMoves = board.getPieceMoves(board.gameStates[board.moveNb].pieces[opIndex], mySquares, hisSquares); 
                                    for(var moveIndex in newPieceMoves.canAttack){ //if any move attacks the king position then the original move is deemed invalid
                                        if(newPieceMoves.canAttack[moveIndex] == kingPosition){
                                            isStale = false;
                                            break;
                                        }
                                    }
                                }
                            }
                            if(isStale){
                                socket.emit('gameover', {gid:gid,type:"stalemate",winnercolour:"grey"});
                                alert("stalemate");
                            }else{
                                socket.emit('gameover', {gid:gid,type:"mate",winner:returnOpponentEye(eye)});
                                alert("mate");
                            }

                        }
                    }
                    if(isLive){
                        if(isItMyTurn()){
                            if(board.moveNb!=0){
                                if(board.moveNb==1){
                                    mytimer = startTimer(getFutureDate(time*60000 - getDateDiff(board.gameStates[board.moveNb].timeremaining.date)), "playertime")
                                }else if(board.moveNb==2){                                        
                                    mytimer = startTimer(getFutureDate(time*60000 - getDateDiff(board.gameStates[board.moveNb].timeremaining.date)), "playertime")
                                    setClockTime(board.gameStates[board.moveNb].timeremaining.timeleftmillis, "opponenttime");
                                }else{
                                    mytimer = startTimer(getFutureDate(board.gameStates[board.moveNb-1].timeremaining.timeleftmillis) - getDateDiff(board.gameStates[board.moveNb].timeremaining.date), "playertime")
                                    setClockTime(board.gameStates[board.moveNb].timeremaining.timeleftmillis, "opponenttime");
                                }                                
                            }
                        }else{
                            if(board.moveNb!=0){
                                if(board.moveNb==1){
                                    histimer = startTimer(getFutureDate(time*60000 - getDateDiff(board.gameStates[board.moveNb].timeremaining.date)), "opponenttime")
                                }else if(board.moveNb==2){
                                    histimer = startTimer(getFutureDate(time*60000 - getDateDiff(board.gameStates[board.moveNb].timeremaining.date)), "opponenttime")
                                    setClockTime(board.gameStates[board.moveNb].timeremaining.timeleftmillis, "playertime");
                                }else{
                                    histimer = startTimer(getFutureDate(board.gameStates[board.moveNb-1].timeremaining.timeleftmillis) - getDateDiff(board.gameStates[board.moveNb].timeremaining.date), "opponenttime")
                                    setClockTime(board.gameStates[board.moveNb].timeremaining.timeleftmillis, "playertime");
                                }                                
                            }           
                        }
                    }
                }
                else{
                    alert("this game is over");
                }

                draw(board, board.moveNb);

            })

            socket.on('sendGameState', (state)=>{ //used to retrieve opponent move in an AJAX manner
                console.log("i've received the state", state);
                board.gameStates.push(state);
                board.moveNb += 1; 
                board.eyeNb = board.moveNb;
                divEyeNb.innerHTML = "&nbsp;"+board.eyeNb;
                divMoveNb.innerHTML = "&nbsp;"+board.moveNb;
                if(variant==3){
                    board.createPrisonerList();
                }
                draw(board, board.moveNb);
                if(isLive){ //if game is ongoing
                    hasMove = false;
                    if(isItMyTurn()){
                        board.generateValidMoves();
                        for(var mIndex in board.moves){ //check if player has at least one move.
                            if(board.moves[mIndex].canMove.length!=0||board.moves[mIndex].canAttack.length!=0){
                                hasMove = true;
                                break;
                            }
                        }
                        if(hasMove==false){ //if no possible moves
                            occupied = board.getSquareOccupancy(board.gameStates[board.moveNb], returnOpponentEye(eye));;
                            mySquares = occupied[0];
                            hisSquares = occupied[1];
                            for(var pieceIndex in board.gameStates[board.moveNb].pieces){ //get king position
                                peice = board.gameStates[board.moveNb].pieces[pieceIndex];
                                if(peice.colour == eye && peice.type=="king"){
                                    kingPosition = peice.positionStr;
                                    break;
                                }
                            }
                            isStale = true;
                            for(var opIndex in board.gameStates[board.moveNb].pieces){ //if one of opponent's piece can attack my king then mate, else stalemate
                                if(isStale == false){
                                    break;
                                }
                                if(board.gameStates[board.moveNb].pieces[opIndex].colour == returnOpponentEye(eye) && board.gameStates[board.moveNb].pieces[opIndex].alive){ 
                                    newPieceMoves = board.getPieceMoves(board.gameStates[board.moveNb].pieces[opIndex], mySquares, hisSquares); 
                                    for(var moveIndex in newPieceMoves.canAttack){ //if any move attacks the king position then the original move is deemed invalid
                                        if(newPieceMoves.canAttack[moveIndex] == kingPosition){
                                            isStale = false;
                                            break;
                                        }
                                    }
                                }
                            }
                            if(isStale){
                                socket.emit('gameover', {gid:gid,type:"stalemate",winnercolour:"grey"});
                                pauseTimer(histimer);
                                alert("stalemate");
                            }else{
                                socket.emit('gameover', {gid:gid,type:"mate",winner:returnOpponentEye(eye)});
                                pauseTimer(histimer);
                                alert("mate");
                            }

                        }else{ //if game is still ongoing and moves are possible then
                            if(board.moveNb==1){
                                mytimer = startTimer(getFutureDate(time*60000 - getDateDiff(board.gameStates[board.moveNb].timeremaining.date)), "playertime")
                            }else if(board.moveNb==2){
                                pauseTimer(histimer);
                                setClockTime(board.gameStates[board.moveNb].timeremaining.timeleftmillis, "opponenttime");
                                mytimer = startTimer(getFutureDate(time*60000 - getDateDiff(board.gameStates[board.moveNb].timeremaining.date)), "playertime")
                            }else{
                                pauseTimer(histimer);
                                setClockTime(board.gameStates[board.moveNb].timeremaining.timeleftmillis, "opponenttime");
                                mytimer = startTimer(getFutureDate(board.gameStates[board.moveNb-1].timeremaining.timeleftmillis) - getDateDiff(board.gameStates[board.moveNb].timeremaining.date), "playertime")
                            }
                        }
                    }
                }
                else{
                    alert("this game is already marked as over");
                }
            })

            socket.on('gameover', (type)=>{ //used to catch events where game is over
                pauseTimer(histimer);
                alert(type);
            })

            if(eye == "white" || eye == "black"){ //adds listeners to board and sideboards (for shogi) only if user is player of the game 
                canvas.addEventListener('mousedown', (event)=>{boardEventListener(board, event)});
                if(variant==3){
                    canvasCptTwo.addEventListener('mousedown', (event)=>{sbEventListener(board, "two", event)});
                    canvasCptOne.addEventListener('mousedown', (event)=>{sbEventListener(board, "one", event)});
                }
            }

            divEyeNb.innerHTML = "&nbsp;"+board.eyeNb;
            divMoveNb.innerHTML = "&nbsp;"+board.moveNb;

            document.addEventListener('keydown', function(e) { //used to navigate through gamestates and change point of view
                if(board.focus.piece != null){
                    board.focus.piece = null;
                }
                switch (e.keyCode) {
                    //navigate through game states
                    case 37:
                        if(board.eyeNb>0){
                            board.eyeNb -= 1;
                        }
                        draw(board, board.eyeNb);
                        break;
                    case 38:
                        if(board.eyeNb<board.moveNb){
                            board.eyeNb += 1;
                        }
                        draw(board, board.eyeNb);
                        break;
                    case 39:
                        if(board.eyeNb<board.moveNb){
                            board.eyeNb += 1;
                        }
                        draw(board, board.eyeNb);
                        break;
                    case 40:
                        if(board.eyeNb>0){
                            board.eyeNb -= 1;
                        }
                        draw(board, board.eyeNb);
                        break;
                    //change point of view
                    case 66:
                        eyeView = "black";
                        if(eye=="white"){
                            opponentDiv.style.marginTop = Math.round(board.cheight-195).toString()+"px"; 
                            playerDiv.style.marginTop = "-255px";
                        }else{
                            opponentDiv.style.marginTop = "-255px"; 
                            playerDiv.style.marginTop = Math.round(board.cheight-195).toString()+"px"; 
                        }
                        draw(board, board.eyeNb);
                        break;
                    case 87:
                        eyeView = "white";
                        if(variant==3){
                            opponentSb.style.marginTop = "-200px";
                            opponentSb.style.marginLeft = "-355px";
                            playerSb.style.marginTop = "100px";
                            playerSb.style.marginLeft = "255px";
                        }
                        if(eye=="white"){
                            opponentDiv.style.marginTop = "-255px"; 
                            playerDiv.style.marginTop = Math.round(board.cheight-195).toString()+"px";                             
                        }else{
                            opponentDiv.style.marginTop = Math.round(board.cheight-195).toString()+"px";
                            playerDiv.style.marginTop = "-255px"                             
                        }
                        draw(board, board.eyeNb);
                        break;
                }
                divEyeNb.innerHTML = "&nbsp;"+board.eyeNb;
                divMoveNb.innerHTML = "&nbsp;"+board.moveNb;
            });

        });
    });
});   




   