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

        // 1. GRID STRUCTURE & UNIFIED EDGE MATRIX
        // verticalEdges[r][c] defines the interlocking line between column c-1 and column c
        const verticalEdges = Array.from({ length: grid.rows }, () => Array(grid.cols + 1).fill(0));
        for (let r = 0; r < grid.rows; r++) {
            for (let c = 1; c < grid.cols; c++) {
                verticalEdges[r][c] = Math.random() > 0.5 ? 1 : -1;
            }
        }

        // horizontalEdges[r][c] defines the interlocking line between row r-1 and row r
        const horizontalEdges = Array.from({ length: grid.rows + 1 }, () => Array(grid.cols).fill(0));
        for (let r = 1; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                horizontalEdges[r][c] = Math.random() > 0.5 ? 1 : -1;
            }
        }

        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                
                // Track standard edge identities around this grid cell
                const topType = horizontalEdges[r][c];
                const rightType = verticalEdges[r][c + 1];
                const bottomType = horizontalEdges[r + 1][c];
                const leftType = verticalEdges[r][c];

                const piece = new Konva.Shape({
                    x: Math.random() * (cw - pw),
                    y: Math.random() * (ch - ph),
                    width: pw,
                    height: ph,
                    draggable: true,
                    stroke: '#334155',
                    strokeWidth: 1,
                    dragBoundFunc: function(pos) {
                        return {
                            x: Math.max(-10, Math.min(cw - pw + 10, pos.x)),
                            y: Math.max(-10, Math.min(ch - ph + 10, pos.y))
                        };
                    },
                    sceneFunc: function(context, shape) {
                        context.beginPath();
                        context.moveTo(0, 0);

                        // Top Edge (Left to Right) -> Normal is down (Innie points down)
                        if (topType === 0) context.lineTo(pw, 0);
                        else drawBezierTab(context, 0, 0, pw, 0, topType, false);

                        // Right Edge (Top to Bottom) -> Normal is left (Innie points left)
                        if (rightType === 0) context.lineTo(pw, ph);
                        else drawBezierTab(context, pw, 0, pw, ph, rightType, false);

                        // Bottom Edge (Right to Left) -> MUST flip direction flag to match top edge of piece below
                        if (bottomType === 0) context.lineTo(0, ph);
                        else drawBezierTab(context, pw, ph, 0, ph, bottomType, true);

                        // Left Edge (Bottom to Top) -> MUST flip direction flag to match right edge of piece to the left
                        if (leftType === 0) context.lineTo(0, 0);
                        else drawBezierTab(context, 0, ph, 0, 0, leftType, true);

                        context.closePath();
                        context.fillStrokeShape(shape);
                    }
                });

                // FIX: Map source texture using accurate coordinates relative to image source file
                piece.fillPatternImage(puzzleImage);
                piece.fillPatternScale({ x: cw / puzzleImage.width, y: ch / puzzleImage.height });
                
                // Calculate scale ratio to ensure image positions perfectly down to the pixel
                const scaleX = puzzleImage.width / cw;
                const scaleY = puzzleImage.height / ch;
                piece.fillPatternOffset({ x: c * pw * scaleX, y: r * ph * scaleY });

                const tx = c * pw; const ty = r * ph;

                piece.on('dragend', () => {
                    // Snap tolerance check
                    if (Math.abs(piece.x() - tx) < 24 && Math.abs(piece.y() - ty) < 24) {
                        piece.position({ x: tx, y: ty });
                        piece.draggable(false);
                        piece.strokeWidth(0); // Erase internal borders on snap for a solid image feel
                        
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

    // 3. ENHANCED BEZIER INTERLOCK LOGIC WITH DIRECTIONAL REVERSAL CORRECTION
    function drawBezierTab(ctx, x1, y1, x2, y2, direction, isReversed) {
        let dx = x2 - x1;
        let dy = y2 - y1;
        let l = Math.sqrt(dx * dx + dy * dy);
        
        let nx = -dy / l;
        let ny = dx / l;
        
        // If drawing from right-to-left or bottom-to-top, invert normal alignment 
        // so the shared path curves perfectly match the adjacent tracking node
        let finalDirection = isReversed ? -direction : direction;
        let tabScale = l * 0.16 * finalDirection;

        let p1x = x1 + dx * 0.35; let p1y = y1 + dy * 0.35;
        let p2x = x1 + dx * 0.45; let p2y = y1 + dy * 0.45;
        let p3x = x1 + dx * 0.55; let p3y = y1 + dy * 0.55;
        let p4x = x1 + dx * 0.65; let p4y = y1 + dy * 0.65;

        ctx.bezierCurveTo(
            p1x, p1y,
            p1x + nx * tabScale * 0.2, p1y + ny * tabScale * 0.2,
            p2x + nx * tabScale * 0.5, p2y + ny * tabScale * 0.5
        );

        ctx.bezierCurveTo(
            p2x + nx * tabScale * 1.2, p2y + ny * tabScale * 1.2,
            p3x + nx * tabScale * 1.2, p3y + ny * tabScale * 1.2,
            p3x + nx * tabScale * 0.5, p3y + ny * tabScale * 0.5
        );

        ctx.bezierCurveTo(
            p3x + nx * tabScale * 0.2, p3y + ny * tabScale * 0.2,
            p4x, p4y,
            x2, y2
        );
    }

    function checkGameCompletion(pieceLayer) {
        const active = pieceLayer.getChildren(node => node.draggable() === true);
        
        if (active.length === 0) {
            setTimeout(() => {
                const canvasContainer = document.getElementById("canvas-container");
                const messageDisplay = document.getElementById("secret-message-display");
                
                canvasContainer.classList.add("fade-out-canvas");
                messageDisplay.classList.add("reveal-text");

                setTimeout(() => {
                    alert("🎉 Surprise Uncovered! You solved the puzzle completely!");
                }, 1500);
            }, 300);
        }
    }
});