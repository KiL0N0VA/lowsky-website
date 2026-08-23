// ==================================================
// INITIALIZATION
// ==================================================

const canvas = document.getElementById("mesh-canvas");
const ctx = canvas.getContext("2d");
const container = document.getElementById("mesh-container");

let w, h, cx, cy;
let angle = 0;
let stars = [];


// ==================================================
// CANVAS RESIZING
// Match canvas resolution to container dimensions
// ==================================================

function resize() {

    w = canvas.width = container.clientWidth;
    h = canvas.height = container.clientHeight;

    cx = w / 2;
    cy = h / 2;

    // Regenerate stars to fit the resized container
    createStars();
}


// Automatically resize whenever mesh-container changes size
const observer = new ResizeObserver(() => {
    resize();
});

observer.observe(container);


// ==================================================
// BACKGROUND STARFIELD
// Decorative dotted space effect
// ==================================================

function createStars() {

    stars = Array.from({ length: 120 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.3
    }));
}


// Initial sizing
resize();


// ==================================================
// MESH GEOMETRY
// Generate points on a spherical surface
// ==================================================

const radius = 160;
const rings = 10;
const segments = 20;

const points = [];

for (let i = 0; i <= rings; i++) {

    const theta = (i / rings) * Math.PI;

    for (let j = 0; j < segments; j++) {

        const phi = (j / segments) * Math.PI * 2;

        points.push({
            x: radius * Math.sin(theta) * Math.cos(phi),
            y: radius * Math.cos(theta),
            z: radius * Math.sin(theta) * Math.sin(phi)
        });
    }
}


// ==================================================
// 3D → 2D PROJECTION
// Rotation + perspective + responsive scaling
// ==================================================

function project(point) {

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    // Automatically fit mesh inside container
    const fitScale = Math.min(w, h) / 400;

    // Rotate around Y axis
    const x =
        (point.x * c - point.z * s) * fitScale;

    const z =
        (point.x * s + point.z * c) * fitScale;

    const y =
        point.y * fitScale;

    // Perspective
    const depth = 450;

    const perspective =
        depth / (depth + z);

    return {
        x: cx + x * perspective,
        y: cy + y * perspective,

        size: Math.max(
            1,
            perspective * 3 * fitScale
        ),

        alpha: Math.min(
            1,
            Math.max(0.15, perspective)
        )
    };
}


// ==================================================
// RENDER LOOP
// Draw stars and rotating mesh each frame
// ==================================================

function draw() {

    ctx.clearRect(0, 0, w, h);


    // ----------------------------------------------
    // BACKGROUND STARS
    // ----------------------------------------------

    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,0.25)";

    stars.forEach(star => {

        ctx.beginPath();

        ctx.arc(
            star.x,
            star.y,
            star.r,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });


    // ----------------------------------------------
    // ROTATING MESH
    // ----------------------------------------------

    points.forEach(point => {

        const p = project(point);

        ctx.globalAlpha = p.alpha;

        ctx.beginPath();

        ctx.fillStyle = "white";

        ctx.arc(
            p.x,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });


    // Reset opacity
    ctx.globalAlpha = 1;


    // Rotation speed
    angle += 0.004;


    requestAnimationFrame(draw);
}


// ==================================================
// START ANIMATION
// ==================================================

draw();
