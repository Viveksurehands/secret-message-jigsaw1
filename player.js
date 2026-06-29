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
        document.getElementById("secret-reveal-layer").innerText = decodedData.msg;

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
        const layer = new Konva.Layer();
        stage.add(layer);

        const grid = calculateGrid(pieceCount);
        const pw = cw / grid.cols; const ph = ch / grid.rows;

        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                const piece = new Konva.Shape({
                    x: Math.random() * (cw - pw),
                    y: Math.random() * (ch - ph),
                    width: pw, height: ph,
                    draggable: true,
                    sceneFunc: function(context, shape) {
                        context.beginPath(); context.rect(0, 0, pw, ph); context.closePath();
                        context.fillStrokeShape(shape);
                    },
                    stroke: '#475569', strokeWidth: 1
                });

                piece.fillPatternImage(puzzleImage);
                piece.fillPatternScale({ x: cw / puzzleImage.width, y: ch / puzzleImage.height });
                piece.fillPatternOffset({ x: c * (puzzleImage.width / grid.cols), y: r * (puzzleImage.height / grid.rows) });

                const tx = c * pw; const ty = r * ph;

                piece.on('dragend', () => {
                    if (Math.abs(piece.x() - tx) < 25 && Math.abs(piece.y() - ty) < 25) {
                        piece.position({ x: tx, y: ty });
                        piece.draggable(false);
                        piece.strokeWidth(0); 
                        layer.draw();
                        checkGameCompletion(layer);
                    }
                });
                layer.add(piece);
            }
        }
        layer.draw();
    }

    function checkGameCompletion(layer) {
        const active = layer.getChildren(node => node.draggable() === true);
        if (active.length === 0) {
            alert("🎉 Surprise Uncovered! You completed the puzzle!");
        }
    }
});