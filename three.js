/* AUTOMATED-GROUND NAVIGATION */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const MAPBOX_TOKEN = "YOUR_MAPBOX_PUBLIC_ACCESS_TOKEN";
const terrainConfig = {
	latitude: 51.1784,
	longitude: -115.5708,
	areaKM: 10,
	detail: 128,
	verticalScale: 1.0,
	displaySize: 100
};

/* =========== INPUT PARAMETER CONTROLS ======================================================================================================== */

function readTerrainControls(){

	terrainConfig.latitude=parseFloat(document.getElementById("latitude").value);
	terrainConfig.longitude=parseFloat(document.getElementById("longitude").value);
	terrainConfig.areaKM=parseFloat(document.getElementById("area").value);
	terrainConfig.detail=parseInt(document.getElementById("detail").value);
	terrainConfig.verticalScale=parseFloat(document.getElementById("verticalScale").value);
}

/* =========== GEOGRAPHIC BOUNDS ======================================================================================================== */
/* one degree latitude ~= to 111.32 km */
/* longitude changes with latitude ~= 111.32*cos(phi) */
/* REAL WORLD (λ,φ,h) becomes DIGITAL WORLD (x,y,z) */

function calculateBounds(latitude,longitude,areaKM){
	const halfArea = areaKM/2;
	const latDEG = halfArea / 111.32; 
	const lonDEG = halfArea/(111.32*Math.cos(THREE.MathUtils.degToRad(latitude)));
	
	return {north: latitude + latDEG,south: latitude - latDEG,east: longitude + lonDEG,west: longitude - lonDEG
	};
}

/* =========== MAPBOX CONVERSION ======================================================================================================== */
/* Mapbox terrain is divided into XYZ map tiles */

function lonToTileX(lon, zoom){
	
	return Math.floor(((lon+180)/360)*Math.pow(2,zoom));
}
function latToTileY(lat, zoom){
	const latRad = THREE.MathUtils.degToRad(lat);

	return Math.floor((1-Math.log(Math.tan(latRad)+1/Math.cos(latRad))/Math.PI)/2*Math.pow(2,zoom));
}
function lonToTileXFloat(lon,zoom){

	return ((lon+180)/360*Math.pow(2,zoom));
}
function latToTileYFloat(lat,zoom){
	const latRad=THREE.MathUtils.degToRad(lat);
	
	return ((1-Math.log(Math.tan(latRad)+1/Math.cos(latRad))/Math.PI)/2*Math.pow(2,zoom));
}


/* =========== DEM TILE RETRIEVAL  ======================================================================================================= */

async function loadDEMTile(zoom,tileX,tileY){
	
	const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/`+`${zoom}/${tileX}/${tileY}.pngraw`+`?access_token=${MAPBOX_TOKEN}`;
	const image = new Image();
	image.crossOrigin = "anonymous";
	
	return new Promise((resolve,reject)=>{
		const canvas = document.createElement("canvas");
		canvas.width = image.width;
		canvas.height = image.height;
		const context = canvas.getContext("2d",{willReadFrequently:true});
		context.drawImage(image,0,0);
		const imageData = context.getImageData(0,0,image.width,image.height);

		resolve({width: image.width,height: image.height,pixels: imageData.data});
	};
	
	image.onerror = reject;
	image.src = url;
	}
);
}

function decodeElevation(r,g,b){

	return (-10000+(r*256*256+g*256+b)*0.1);
}

function getPixelElevation(dem,x,y){

	const index = (y*dem.width+x)*4;
	const r = dem.pixels[index];
	const g = dem.pixels[index+1];
	const b = dem.pixels[index+2];

	return decodeElevation(r,g,b);
}

const container = document.getElementById("terrain-container");
const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(38,container.clientWidth / container.clientHeight,0.1,1000);

camera.position.set(0,-95,70);
camera.lookAt(0,0,5);

/* =========== RENDERER  ======================================================================================================= */

const renderer = new THREE.WebGLRenderer({
	antialias: true,
	alpha: false
});

renderer.setPixelRatio(
	Math.min(window.devicePixelRatio, 2)
);
renderer.setSize(
	container.clientWidth,
	container.clientHeight
);
container.appendChild(renderer.domElement);

/* =========== DEM TERRAIN GEN ================================================================================================= */

function createTerrainFromDEM(elevationGrid,detail,displaySize,verticalScale,areaKM){

	const geometry = new THREE.PlaneGeometry(displaySize,displaySize,detail-1,detail-1);
	const positions = geometry.attributes.position;
	let minElevation = Infinity;
	let maxElevation = Infinity;

	for(const elevation of elevationGrid){
		minElevation = Math.min(minElevation,elevation);
		maxElevation = Math.max(maxElevation,elevation);
	}
	const metresPerSceneUnit = (terrainConfig.areaKM*1000)/terrainConfig.displaySize;
	const sceneElevation = (elevation-minElevation)/metresPerSceneUnit*verticalScale;

	for(let i=0;i<positions.count;i++){
		const elevation = elevationGrid[i];
		const relativeElevation = elevation - minElevation;
		positions.setZ(i,relativeElevation*verticalScale);
	}
	positions.needsUpdate=true;
	geometry.computeVertexNormals();

	return {geometry,minElevation,maxElevation};
}


document
	.getElementById("generateTerrain")
	.addEventListener("click",generateTerrain);

async function generateTerrain(){

	readTerrainControls();
	const bounds = calculateBounds(terrainConfig.latitude,terrainConfig.longitude,terrainConfig.areaKM);

	console.log("Terrain config:",terrainConfig);
	console.log("Geographic bounds:",bounds);
	const zoom = 14;
	const tileX = lonToTileX(terrainConfig.longitude,zoom);
	const tileY = latToTileY(terrainConfig.latitude,zoom);
	console.log(`Loading DEM tile: ${zoom}/${tileX}/${tileY}`);
	const dem = await loadDEMTile(zoom,tileX,tileY);
	console.log("DEM loaded:",dem.width,"x",dem.height);
}


/* =========== ANIMATION ======================================================================================================= */


function animate(){
	requestAnimationFrame(animate);
	// Slow movement
	renderer.render(scene,camera);
}

animate();

/* =========== RESPONSIVE RESIZING ================================================================================================ */

window.addEventListener("resize",()=>{
		const width = container.clientWidth;
		const height = container.clientHeight;
		camera.aspect = width/height;
		camera.updateProjectionMatrix();
		renderer.setSize(width,height);
	}
);

