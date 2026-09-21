
"use strict";

// =====================================
// NEON SKIN MODULE
// =====================================

(function(){

    // Keep the skin preview synchronized with the live Neon board.
    const NEON_COLORS = {
        board: "#182638",
        outline: "#6B4F78",
        escape: "#6B4F78",
        black: "#080b12",
        red: "#ff1744",
        blackOutline: "#00f6ff",
        redOutline: "#ffea00"
    };

    const skinOptions =
        document.getElementById("skinOptions");

    if(!skinOptions) return;

    const card = document.createElement("button");

    card.className = "skinCard";
    card.id = "neonSkinButton";

    card.innerHTML = `

        <div class="skinPreview neonPreview">
            <div id="neonMiniBoard"></div>
        </div>

        <span class="skinName">
            Neon
        </span>

        <span class="skinSelected"
              id="neonSelected">
            SELECT SKIN
        </span>

    `;

    skinOptions.appendChild(card);


    // =================================
    // SKIN SELECTION
    // =================================

    // =================================
    // SVG PREVIEW
    // =================================

    function drawneonPreview(){

        const NS =
            "http://www.w3.org/2000/svg";

        const container =
            document.getElementById(
                "neonMiniBoard"
            );

        if(!container) return;

        const svg =
            document.createElementNS(NS,"svg");

        svg.setAttribute(
            "viewBox",
            "0 0 180 180"
        );

        svg.setAttribute(
            "class",
            "neonMiniSVG"
        );


        function element(type,attributes){

            const el =
                document.createElementNS(NS,type);

            for(const key in attributes){

                el.setAttribute(
                    key,
                    attributes[key]
                );

            }

            return el;

        }


        // Same hex geometry as the game
        function hexPoints(cx,cy,size){

            const points=[];

            for(let i=0;i<6;i++){

                const angle =
                    (30+i*60)*Math.PI/180;

                points.push(

                    (cx+size*Math.cos(angle)).toFixed(2)+","+
                    (cy+size*Math.sin(angle)).toFixed(2)

                );

            }

            return points.join(" ");

        }


        const centerX = 90;
        const centerY = 90;
        const size = 22.5;

        const distanceX =
            Math.sqrt(3)*size;

        const distanceY =
            size*1.5;


        // Center and six neighboring hexes
        const hexes = [

            [centerX,centerY],

            [centerX+distanceX,centerY],

            [centerX+distanceX/2,centerY+distanceY],

            [centerX-distanceX/2,centerY+distanceY],

            [centerX-distanceX,centerY],

            [centerX-distanceX/2,centerY-distanceY],

            [centerX+distanceX/2,centerY-distanceY]

        ];


        hexes.forEach(([x, y], index) => {

    const escape = index === 5;

    svg.appendChild(
        element("polygon", {

            points: hexPoints(x, y, size),

            fill: escape
                ? NEON_COLORS.escape
                : NEON_COLORS.board,

            stroke: NEON_COLORS.outline,
            "stroke-width": "1.7"

        })
    );

});


        function drawPiece(
            x,
            y,
            fill,
            border,
            king=false
        ){

            svg.appendChild(

                element("circle",{

                    cx:x+2,
                    cy:y+3,

                    r:10,

                    fill:"#000",
                    opacity:".5"

                })

            );


            svg.appendChild(

                element("circle",{

                    cx:x,
                    cy:y,

                    r:10,

                    fill:fill,

                    stroke:border,

                    "stroke-width":"2"

                })

            );


            if(king){

                svg.appendChild(

                    element("path",{

                        d:
                            "M "+(x-7)+" "+(y+5)+
                            " L "+(x-6)+" "+(y-4)+
                            " L "+(x-2)+" "+y+
                            " L "+x+" "+(y-6)+
                            " L "+(x+3)+" "+y+
                            " L "+(x+7)+" "+(y-4)+
                            " L "+(x+8)+" "+(y+5),

                        fill:"none",

                        stroke:"#000000",

                        "stroke-width":"2"

                    })

                );

            }

        }


// One black piece
drawPiece(

    centerX+distanceX/2,
    centerY-distanceY,

    NEON_COLORS.black,
    NEON_COLORS.blackOutline

);


        // One red piece
        drawPiece(

            centerX+distanceX,
            centerY,

            NEON_COLORS.red,
            NEON_COLORS.redOutline

        );


        // One king
        drawPiece(

            centerX,
            centerY,

            NEON_COLORS.red,
            NEON_COLORS.redOutline,

            true

        );


        container.innerHTML = "";

        container.appendChild(svg);

    }


    const style =
        document.createElement("style");

    style.textContent = `

        .neonPreview{

            width:100%;
            margin:8px auto;

        }

        .neonMiniSVG{

            display:block;

            width:155px;
            height:155px;

            margin:auto;

        }

    `;

    document.head.appendChild(style);


drawneonPreview();

selectSkin(
    localStorage.getItem("hexataflSkin")
    || "classic"
);

})();
