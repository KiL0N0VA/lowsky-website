const compassNav   = document.getElementById("compassNav");
const compassTrack = document.getElementById("compassTrack");


/* =====================================================================
   CONFIGURATION
   ===================================================================== */

const COMPASS_CONFIG = {

    /*
        Maximum movement speed.

        Increase = faster
        Decrease = slower

        Units: pixels / second
    */

    maxSpeed: 340,


    /*
        Minimum scrolling speed once the cursor
        has deliberately moved away from the MHM.
    */

    minSpeed: 50,


    /*
        How quickly velocity responds to cursor movement.

        Higher = more immediate
        Lower = smoother / heavier feeling
    */

    acceleration: 7,


    /*
        Number of dots between each LOWSKY bearing.

        With 6 letters:

        360° / 6 = 60° between letters.

        5 dots therefore visually represent:

        10°
        20°
        30°
        40°
        50°
    */

    dotsBetweenLetters: 5,


    /*
        Maximum letter magnification beneath MHM.

        1.00 = normal
        1.18 = 18% larger
    */

    magnification: 1.18,


    /*
        Distance from MHM over which magnification occurs.
        Units: pixels
    */

    magnificationRadius: 100,


    /*
        Width around the exact center that acts
        as the neutral cursor region.
    */

    mhmDeadZone: 22,


    /*
        Amount of track duplication.

        Higher values provide more buffer for
        infinite wrapping on very wide monitors.
    */

    repetitions: 9,


    /*
        Set false if you ever want the cursor direction inverted.
    */

    naturalDirection: true
};


/* =====================================================================
   NAVIGATION DATA
   ===================================================================== */

const bearings = [

    {
        letter: "L",
        name: "Landing",
        href: "index.html"
    },

    {
        letter: "O",
        name: "Operations",
        href: "operations.html"
    },

    {
        letter: "W",
        name: "Wardens",
        href: "wardens.html"
    },

    {
        letter: "S",
        name: "Simulation",
        href: "simulation.html"
    },

    {
        letter: "K",
        name: "Kernels",
        href: "kernels.html"
    },

    {
        letter: "Y",
        name: "Yottabytes",
        href: "yottabytes.html"
    }

];


/* =====================================================================
   STATE
   ===================================================================== */

let position = 0;

let velocity = 0;
let targetVelocity = 0;

let lastTime = performance.now();

let cycleWidth = 0;

let activeBearing = null;


/*
    Used for stopping behavior.

    Once movement begins, the compass is not allowed
    to stop until a DIFFERENT letter becomes selected.
*/

let movementStarted = false;

let startingLetter = null;

let requestStop = false;

let travelDirection = 0;


/* =====================================================================
   BUILD COMPASS
   ===================================================================== */

function buildCompass() {

    compassTrack.innerHTML = "";

    for (
        let repeat = 0;
        repeat < COMPASS_CONFIG.repetitions;
        repeat++
    ) {

        bearings.forEach((bearing) => {

            const group =
                document.createElement("div");

            group.className =
                "compass-bearing-group";


            /* ---------------- BEARING ---------------- */

            const letter =
                document.createElement("a");

            letter.className =
                "compass-bearing";

            letter.textContent =
                bearing.letter;

            letter.href =
                bearing.href;

            letter.dataset.letter =
                bearing.letter;

            letter.dataset.name =
                bearing.name;

            letter.setAttribute(
                "aria-label",
                bearing.name
            );

            group.appendChild(letter);


            /* ---------------- DEGREE DOTS ---------------- */

            const degreeDots =
                document.createElement("div");

            degreeDots.className =
                "degree-dots";


            for (
                let i = 1;
                i <= COMPASS_CONFIG.dotsBetweenLetters;
                i++
            ) {

                const dot =
                    document.createElement("span");

                dot.className =
                    "degree-dot";


                /*
                    Slightly emphasize the center
                    graduation.
                */

                if (
                    i ===
                    Math.ceil(
                        COMPASS_CONFIG.dotsBetweenLetters / 2
                    )
                ) {

                    dot.classList.add("major");

                }


                degreeDots.appendChild(dot);

            }


            group.appendChild(degreeDots);

            compassTrack.appendChild(group);

        });

    }

}


/* =====================================================================
   INITIAL POSITION
   ===================================================================== */

function initializeCompass() {

    const groups =
        compassTrack.querySelectorAll(
            ".compass-bearing-group"
        );


    /*
        Width of one entire:

        L O W S K Y

        revolution.
    */

    let measuredWidth = 0;

    for (
        let i = 0;
        i < bearings.length;
        i++
    ) {

        measuredWidth +=
            groups[i].getBoundingClientRect().width;

    }

    cycleWidth = measuredWidth;


    /*
        Start in the middle duplicated revolution.
    */

    const middleRepeat =
        Math.floor(
            COMPASS_CONFIG.repetitions / 2
        );


    position =
        -(cycleWidth * middleRepeat);


    /*
        Move first L underneath the MHM.
    */

    requestAnimationFrame(() => {

        const middleIndex =
            middleRepeat * bearings.length;

        const bearingElements =
            compassTrack.querySelectorAll(
                ".compass-bearing"
            );

        const target =
            bearingElements[middleIndex];

        centerBearingImmediately(target);

    });

}


/* =====================================================================
   CENTER A BEARING
   ===================================================================== */

function centerBearingImmediately(element) {

    if (!element) return;

    const navRect =
        compassNav.getBoundingClientRect();

    const elementRect =
        element.getBoundingClientRect();


    const navCenter =
        navRect.left +
        navRect.width / 2;

    const elementCenter =
        elementRect.left +
        elementRect.width / 2;


    position +=
        navCenter - elementCenter;


    updateTransform();

}


/* =====================================================================
   CURSOR CONTROL
   ===================================================================== */

compassNav.addEventListener(
    "pointermove",
    (event) => {

        const rect =
            compassNav.getBoundingClientRect();

        const center =
            rect.left + rect.width / 2;

        const cursorOffset =
            event.clientX - center;

        const halfWidth =
            rect.width / 2;


        /*
            Normalized cursor position:

            -1 = extreme left
             0 = MHM
            +1 = extreme right
        */

        let normalized =
            cursorOffset / halfWidth;


        /*
            MHM neutral area.

            Entering this zone requests a stop,
            but the compass will continue moving
            until the next LOWSKY letter reaches
            the marker.
        */

        if (
            Math.abs(cursorOffset) <
            COMPASS_CONFIG.mhmDeadZone
        ) {

            requestStop = true;

            return;

        }


        requestStop = false;


        let direction =
            Math.sign(normalized);


        if (!COMPASS_CONFIG.naturalDirection) {

            direction *= -1;

        }


        travelDirection =
            direction;


        /*
            Start tracking which letter was active
            when motion began.
        */

        if (!movementStarted) {

            movementStarted = true;

            startingLetter =
                getCenteredBearing()?.dataset.letter
                ?? null;

        }


        const intensity =
            Math.min(
                Math.abs(normalized),
                1
            );


        const speed =
            COMPASS_CONFIG.minSpeed +

            (
                COMPASS_CONFIG.maxSpeed -
                COMPASS_CONFIG.minSpeed
            )

            * intensity;


        /*
            Left cursor  = track travels left
            Right cursor = track travels right
        */

        targetVelocity =
            direction * speed;

    }
);


/* =====================================================================
   POINTER LEAVES COMPASS
   ===================================================================== */

compassNav.addEventListener(
    "pointerleave",
    () => {

        /*
            Do NOT stop immediately.

            Request a controlled stop at
            the next bearing.
        */

        requestStop = true;

    }
);


/* =====================================================================
   FIND BEARING NEAREST MHM
   ===================================================================== */

function getCenteredBearing() {

    const navRect =
        compassNav.getBoundingClientRect();

    const center =
        navRect.left +
        navRect.width / 2;


    const elements =
        compassTrack.querySelectorAll(
            ".compass-bearing"
        );


    let closest = null;
    let closestDistance = Infinity;


    elements.forEach((element) => {

        const rect =
            element.getBoundingClientRect();

        const elementCenter =
            rect.left +
            rect.width / 2;

        const distance =
            Math.abs(
                elementCenter - center
            );


        if (distance < closestDistance) {

            closestDistance =
                distance;

            closest =
                element;

        }

    });


    return closest;

}


/* =====================================================================
   MAGNIFYING HEADING MARKER EFFECT
   ===================================================================== */

function updateMagnification() {

    const navRect =
        compassNav.getBoundingClientRect();

    const center =
        navRect.left +
        navRect.width / 2;


    const elements =
        compassTrack.querySelectorAll(
            ".compass-bearing"
        );


    let closest = null;
    let closestDistance = Infinity;


    elements.forEach((element) => {

        const rect =
            element.getBoundingClientRect();

        const elementCenter =
            rect.left +
            rect.width / 2;

        const distance =
            Math.abs(
                elementCenter - center
            );


        /*
            1 at exact center.
            0 outside magnification radius.
        */

        const proximity =
            Math.max(
                0,
                1 -
                distance /
                COMPASS_CONFIG.magnificationRadius
            );


        const scale =
            1 +

            (
                COMPASS_CONFIG.magnification - 1
            )

            * proximity;


        element.style.setProperty(
            "--magnification",
            scale
        );


        if (distance < closestDistance) {

            closestDistance =
                distance;

            closest =
                element;

        }

    });


    /*
        Highlight the currently selected heading.
    */

    if (closest !== activeBearing) {

        if (activeBearing) {

            activeBearing.classList.remove(
                "is-active"
            );

        }


        activeBearing =
            closest;


        if (activeBearing) {

            activeBearing.classList.add(
                "is-active"
            );


            /*
                Useful hook for other site effects.
            */

            compassNav.dispatchEvent(
                new CustomEvent(
                    "bearingchange",
                    {
                        detail: {
                            letter:
                                activeBearing.dataset.letter,

                            name:
                                activeBearing.dataset.name
                        }
                    }
                )
            );

        }

    }

}


/* =====================================================================
   SNAP TO NEAREST BEARING
   ===================================================================== */

function snapToBearing(element) {

    if (!element) return false;


    const navRect =
        compassNav.getBoundingClientRect();

    const center =
        navRect.left +
        navRect.width / 2;


    const rect =
        element.getBoundingClientRect();

    const elementCenter =
        rect.left +
        rect.width / 2;


    const difference =
        center - elementCenter;


    /*
        Smooth magnetic attraction to MHM.
    */

    position +=
        difference * 0.18;


    /*
        Finished snapping.
    */

    if (Math.abs(difference) < 0.35) {

        position += difference;

        velocity = 0;
        targetVelocity = 0;

        movementStarted = false;
        requestStop = false;

        updateTransform();

        return true;

    }


    return false;

}


/* =====================================================================
   CONTROLLED STOP LOGIC
   ===================================================================== */

function handleRequestedStop() {

    if (
        !requestStop ||
        !movementStarted
    ) {

        return false;

    }


    const centered =
        getCenteredBearing();


    if (!centered) return false;


    /*
        The compass is not allowed to stop
        on the same bearing from which it started.

        It must reach at least one NEW bearing.
    */

    if (
        centered.dataset.letter ===
        startingLetter
    ) {

        /*
            Maintain enough velocity to continue
            toward the next letter.
        */

        targetVelocity =
            travelDirection *
            COMPASS_CONFIG.minSpeed;

        return false;

    }


    /*
        A new bearing has reached the MHM.

        Stop normal scrolling and magnetically
        snap it to center.
    */

    targetVelocity = 0;

    velocity *= 0.76;


    if (
        Math.abs(velocity) < 18
    ) {

        velocity = 0;

        return snapToBearing(centered);

    }


    return false;

}


/* =====================================================================
   INFINITE WRAPPING
   ===================================================================== */

function wrapCompass() {

    if (!cycleWidth) return;


    /*
        Keep the user near the middle duplicate
        so the illusion remains infinite.
    */

    const totalCenter =
        cycleWidth *
        Math.floor(
            COMPASS_CONFIG.repetitions / 2
        );


    if (
        position <
        -(totalCenter + cycleWidth)
    ) {

        position += cycleWidth;

    }


    if (
        position >
        -(totalCenter - cycleWidth)
    ) {

        position -= cycleWidth;

    }

}


/* =====================================================================
   APPLY TRANSFORM
   ===================================================================== */

function updateTransform() {

    compassTrack.style.transform =
        `translate3d(${position}px, -50%, 0)`;

}


/* =====================================================================
   ANIMATION ENGINE
   ===================================================================== */

function animate(currentTime) {

    const delta =
        Math.min(
            (currentTime - lastTime) / 1000,
            0.05
        );


    lastTime =
        currentTime;


    const stopping =
        handleRequestedStop();


    if (!stopping) {

        /*
            Smooth acceleration toward target velocity.
        */

        const interpolation =
            1 -
            Math.exp(
                -COMPASS_CONFIG.acceleration *
                delta
            );


        velocity +=
            (
                targetVelocity -
                velocity
            )

            * interpolation;


        position +=
            velocity * delta;

    }


    wrapCompass();

    updateTransform();

    updateMagnification();


    requestAnimationFrame(animate);

}


/* =====================================================================
   RESIZE
   ===================================================================== */

window.addEventListener(
    "resize",
    () => {

        initializeCompass();

    }
);


/* =====================================================================
   START
   ===================================================================== */

buildCompass();

requestAnimationFrame(() => {

    initializeCompass();

    requestAnimationFrame(animate);

});