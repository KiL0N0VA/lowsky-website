// ==================================================
// INITIALIZATION
// ==================================================

const canvas = document.getElementById("mesh-canvas");
const ctx = canvas.getContext("2d");
const container = document.getElementById("mesh-container");
const observer = new ResizeObserver(() => {
    const width = container.clientWidth;
    const height = contatiner.clientHeight;
    renderer.setSize(width,height,false);
    camera.aspect = width/height;
    camera.updateProjectMatrix();
});

observer.observe(container);

let w, h, cx, cy;
let angle = 0;


// ==================================================
// CANVAS RESIZING
// Match canvas resolution to container dimensions
// ==================================================

function resize() {

    w = canvas.width = container.clientWidth;
    h = canvas.height = container.clientHeight;

    cx = w / 2;
    cy = h / 2;
}

window.addEventListener("resize", resize);
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
// BACKGROUND STARFIELD
// Decorative dotted space effect
// ==================================================

const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.5 + 0.3
}));


// ==================================================
// 3D → 2D PROJECTION
// Applies rotation and perspective scaling
// ==================================================

function project(point) {

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    const x = point.x * c - point.z * s;
    const z = point.x * s + point.z * c;

    const depth = 450;
    const scale = depth / (depth + z);

    return {
        x: cx + x * scale,
        y: cy + point.y * scale,
        size: Math.max(1, scale * 3),
        alpha: scale
    };
}


// ==================================================
// RENDER LOOP
// Draw stars and rotating mesh each frame
// ==================================================

function draw() {

    ctx.clearRect(0, 0, w, h);

    // Background dots
    ctx.fillStyle = "rgba(255,255,255,0.25)";

    stars.forEach(star => {

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();

    });

    // Mesh points
    points.forEach(point => {

        const p = project(point);

        ctx.globalAlpha = p.alpha;

        ctx.beginPath();
        ctx.fillStyle = "white";
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

    });

    ctx.globalAlpha = 1;

    angle += 0.004;

    requestAnimationFrame(draw);
}

draw();
