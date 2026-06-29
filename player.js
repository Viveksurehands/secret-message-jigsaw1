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
        
        const imageObj = new Image();
        imageObj.src = decodedData.img;
        imageObj.onload = function() {
            initializePuzzleCanvas(imageObj, decodedData.msg, decodedData.count || 12);
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

    function initializePuzzleCanvas(puzzleImage, secretMessage, pieceCount) {
        const cw = 600; const ch = 450;
        
        const stage = new Konva.Stage({ container: 'canvas-container', width: cw, height: ch });
        
        // Layer 1: Background Secure Text Canvas Node
        const bgLayer = new Konva.Layer();
        const secretText = new Konva.Text({
            text: secretMessage,
            fontSize: 28,
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            fill: '#38bdf8',
            width: cw - 60,
            align: 'center',
            x: 30,
            y: ch / 2 - 40
        });
        bgLayer.add(secretText);
        stage.add(bgLayer);

        // Layer 2: Blackout Blur Mask Layer blocking early text leaks
        const maskLayer = new Konva.Layer();
        const blurMask = new Konva.Rect({
            x: 0, y: 0, width: cw, height: ch,
            fill: '#0f172a',
            opacity: 0.98
        });
        maskLayer.add(blurMask);
        stage.add(maskLayer);

        // Layer 3: Main Piece Gameplay interaction plane
        const pieceLayer = new Konva.Layer();
        stage.add(pieceLayer);

        const grid = calculateGrid(pieceCount);
        const pw = cw / grid.cols; const ph = ch / grid.rows;

        // Establish relative interlocking tab-blank grid profiles
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
                    stroke: '#475569',
                    strokeWidth: 1,
                    // Vector-path implementation drawing interlocking puzzle tabs
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
                        piece.strokeWidth(0); 
                        
                        piece.moveToBottom();
                        pieceLayer.draw();

                        // Punch an exact window out of the blur mask overlay right beneath the locked piece coordinates
                        revealMaskBlock(maskLayer, tx, ty, pw, ph);
                        
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
        const size = l * 0.15 * direction; 

        const p1x = x1 + dx * 0.35; const p1y = y1 + dy * 0.35;
        const p2x = p1x + nx * size; const p2y = p1y + ny * size;
        const p3x = x1 + dx * 0.45; const p3y = y1 + dy * 0.45;
        const p4x = p3x + nx * size * 1.5; const p4y = p3y + ny * size * 1.5;
        const p5x = x1 + dx * 0.55; const p5y = y1 + dy * 0.55;
        const p6x = p5x + nx * size * 1.5; const p6y = p5y + ny * size * 1.5;
        const p7x = x1 + dx * 0.65; const p7y = y1 + dy * 0.65;
        const p8x = p7x + nx * size; const p8y = p7y + ny * size;

        ctx.lineTo(p1x, p1y);
        ctx.bezierCurveTo(p2x, p2y, p3x, p3y, p4x, p4y);
        ctx.bezierCurveTo(p4x + (dx*0.05), p4y + (dy*0.05), p6x - (dx*0.05), p6y - (dy*0.05), p5x + nx * size * 1.8, p5y + ny * size * 1.8);
        ctx.bezierCurveTo(p6x, p6y, p7x, p7y, p8x, p8y);
        ctx.lineTo(x2, y2);
    }

    function revealMaskBlock(maskLayer, x, y, w, h) {
        const cutout = new Konva.Rect({
            x: x - 2, y: y - 2, width: w + 4, height: h + 4,
            fill: '#000000',
            globalCompositeOperation: 'destination-out'
        });
        maskLayer.add(cutout);
        maskLayer.draw();
    }

    function checkGameCompletion(layer) {
        const active = layer.getChildren(node => node.draggable() === true);
        if (active.length === 0) {
            setTimeout(() => {
                alert("🎉 Surprise Uncovered! You solved the puzzle completely!");
            }, 300);
        }
    }
});