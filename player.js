document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get("p");

    if (!dataParam) {
        alert("No puzzle data found. Returning to creator hub...");
        window.location.href = "index.html";
        return;
    }

    try {
        const decodedData = JSON.parse(decodeURIComponent(escape(atob(dataParam))));
        
        // Put the secret message safely in the underlying HTML display block
        document.getElementById("secret-message-display").innerText = decodedData.msg;

        const imageObj = new Image();
        imageObj.src = decodedData.img;
        imageObj.onload = function() {
            initializePuzzleCanvas(imageObj, decodedData.count || 12);
        };
    } catch (err) {
        alert("Invalid or corrupt challenge link payload structure.");
    }

    function calculateGrid(totalPieces) {
        if (totalPieces <= 12) return { cols: 4, rows: 3 };
        if (totalPieces <= 24) return { cols: 6, rows: 4 };
        if (totalPieces <= 36) return { cols: 6, rows: 6 };
        return { cols: 10, rows: 5 }; 
    }

    function initializePuzzleCanvas(puzzleImage, pieceCount) {
        const cw = 600; const ch = 450;
        
        const stage = new Konva.Stage({ container: 'canvas-container', width: cw, height: ch });
        const pieceLayer = new Konva.Layer();
        stage.add(pieceLayer);

        const grid = calculateGrid(pieceCount);
        const pw = cw / grid.cols; const ph = ch / grid.rows;

        // Build relative interlocking jigsaw tab maps
        const xEdges = Array.from({ length: grid.rows }, () => Array(grid.cols - 1).fill(0).map(() => Math.random() > 0.5 ? 1 : -1));
        const yEdges = Array.from({ length: grid.rows - 1 }, () => Array(grid.cols).fill(0).map(() => Math.random() > 0.5 ? 1 : -1));

        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                
                const top = r === 0 ? 0 : -yEdges[r - 1][c];
                const right = c === grid.cols - 1 ? 0 : xEdges[r][c];
                const bottom = r === grid.rows - 1 ? 0 : yEdges[r][c];
                const left = c === 0 ? 0 : -xEdges[r][c - 1];

                const piece = new Konva.Shape({
                    x: Math.random() * (cw - pw),
                    y: Math.random() * (ch - ph),
                    width: pw,
                    height: ph,
                    draggable: true,
                    stroke: '#1e293b',
                    strokeWidth: 1,
                    sceneFunc: function(context, shape) {
                        context.beginPath();
                        context.moveTo(0, 0);

                        if (top === 0) context.lineTo(pw, 0);
                        else drawJigsawEdge(context, 0, 0, pw, 0, top);

                        if (right === 0) context.lineTo(pw, ph);
                        else drawJigsawEdge(context, pw, 0, pw, ph, right);

                        if (bottom === 0) context.lineTo(0, ph);
                        else drawJigsawEdge(context, pw, ph, 0, ph, bottom);

                        if (left === 0) context.lineTo(0, 0);
                        else drawJigsawEdge(context, 0, ph, 0, 0, left);

                        context.closePath();
                        context.fillStrokeShape(shape);
                    }
                });

                piece.fillPatternImage(puzzleImage);
                piece.fillPatternScale({ x: cw / puzzleImage.width, y: ch / puzzleImage.height });
                piece.fillPatternOffset({ x: c * (puzzleImage.width / grid.cols), y: r * (puzzleImage.height / grid.rows) });

                const tx = c * pw; const ty = r * ph;

                piece.on('dragend', () => {
                    if (Math.abs(piece.x() - tx) < 22 && Math.abs(piece.y() - ty) < 22) {
                        piece.position({ x: tx, y: ty });
                        piece.draggable(false);
                        piece.strokeWidth(0.5); 
                        
                        piece.moveToBottom();
                        pieceLayer.draw();
                        
                        checkGameCompletion(pieceLayer);
                    }
                });
                pieceLayer.add(piece);
            }
        }
        pieceLayer.draw();
    }

    function drawJigsawEdge(ctx, x1, y1, x2, y2, direction) {
        const dx = x2 - x1; const dy = y2 - y1;
        const l = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / l; const ny = dx / l; 
        const size = l * 0.14 * direction; 

        const p1x = x1 + dx * 0.38; const p1y = y1 + dy * 0.38;
        const p2x = p1x + nx * size; const p2y = p1y + ny * size;
        const p3x = x1 + dx * 0.44; const p3y = y1 + dy * 0.44;
        const p4x = p3x + nx * size * 1.4; const p4y = p3y + ny * size * 1.4;
        const p5x = x1 + dx * 0.56; const p5y = y1 + dy * 0.56;
        const p6x = p5x + nx * size * 1.4; const p6y = p5y + ny * size * 1.4;
        const p7x = x1 + dx * 0.62; const p7y = y1 + dy * 0.62;
        const p8x = p7x + nx * size; const p8y = p7y + ny * size;

        ctx.lineTo(p1x, p1y);
        ctx.bezierCurveTo(p2x, p2y, p3x, p3y, p4x, p4y);
        ctx.bezierCurveTo(p4x + (dx*0.03), p4y + (dy*0.03), p6x - (dx*0.03), p6y - (dy*0.03), p5x + nx * size * 1.6, p5y + ny * size * 1.6);
        ctx.bezierCurveTo(p6x, p6y, p7x, p7y, p8x, p8y);
        ctx.lineTo(x2, y2);
    }

    function checkGameCompletion(pieceLayer) {
        const active = pieceLayer.getChildren(node => node.draggable() === true);
        
        if (active.length === 0) {
            setTimeout(() => {
                const canvasContainer = document.getElementById("canvas-container");
                const messageDisplay = document.getElementById("secret-message-display");
                
                // Perfectly synced: Fade out the puzzle overlay, fade in the hidden message text
                canvasContainer.classList.add("fade-out-canvas");
                messageDisplay.classList.add("reveal-text");

                setTimeout(() => {
                    alert("🎉 Surprise Uncovered! You solved the puzzle completely!");
                }, 1500);
            }, 300);
        }
    }
});