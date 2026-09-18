/* three.js = THREE.JS RENDERING ENGINE */


/* =========== IMPORTS ======================================================================================================================== */

import * as THREE from
	"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import {
	configureTerrain,
	getTerrainHeight,
	getTerrainSize,
	getTerrainSegments
} from "./terrain.js";

import {
	findPath
} from "./pathfinding.js";

import {
	createNavigationPath,
	updateNavigationArrow
} from "./navigation.js";


/* =========== GLOBAL VARIABLES =============================================================================================================== */

const container =
	document.getElementById("terrain-container");

if (!container) {

	throw new Error(
		'THREE.JS ERROR: HTML element with id="terrain-container" was not found.'
	);

}


let scene;
let camera;
let renderer;
let clock;

let terrainMesh = null;
let navigation = null;

let currentConfig = null;


/* =========== INITIALIZE THREE.JS ============================================================================================================ */

function initializeThree() {

	/* SCENE */

	scene =
		new THREE.Scene();

	scene.background =
		new THREE.Color(0x000000);


	/* CAMERA */

	camera =
		new THREE.PerspectiveCamera(
			48,
			container.clientWidth / container.clientHeight,
			0.1,
			2000
		);

	camera.position.set(
		0,
		55,
		95
	);

	camera.lookAt(
		0,
		0,
		0
	);


	/* RENDERER */

	renderer =
		new THREE.WebGLRenderer({
			antialias: true
		});

	renderer.setPixelRatio(
		Math.min(
			window.devicePixelRatio,
			2
		)
	);

	renderer.setSize(
		container.clientWidth,
		container.clientHeight
	);

	container.appendChild(
		renderer.domElement
	);


	/* CLOCK */

	clock =
		new THREE.Clock();


	/* WINDOW RESIZE */

	window.addEventListener(
		"resize",
		resizeRenderer
	);

}


/* =========== READ HTML INPUTS =============================================================================================================== */

function readTerrainControls() {

	const latitudeInput =
		document.getElementById("latitude");

	const longitudeInput =
		document.getElementById("longitude");

	const areaInput =
		document.getElementById("areaKM");

	const resolutionInput =
		document.getElementById("terrainResolution");

	const startXInput =
		document.getElementById("startX");

	const startZInput =
		document.getElementById("startZ");

	const endXInput =
		document.getElementById("endX");

	const endZInput =
		document.getElementById("endZ");

	const slopeWeightInput =
		document.getElementById("slopeWeight");

	const uphillWeightInput =
		document.getElementById("uphillWeight");

	const maximumSlopeInput =
		document.getElementById("maximumSlope");


	return {

		latitude:
			latitudeInput
				? parseFloat(latitudeInput.value)
				: 51.1784,

		longitude:
			longitudeInput
				? parseFloat(longitudeInput.value)
				: -115.5708,

		areaKM:
			areaInput
				? parseFloat(areaInput.value)
				: 10,

		terrainResolution:
			resolutionInput
				? parseInt(resolutionInput.value, 10)
				: 100,

		verticalScale:
			1.0,


		start: {

			x:
				startXInput
					? parseInt(startXInput.value, 10)
					: 50,

			z:
				startZInput
					? parseInt(startZInput.value, 10)
					: 92

		},


		end: {

			x:
				endXInput
					? parseInt(endXInput.value, 10)
					: 58,

			z:
				endZInput
					? parseInt(endZInput.value, 10)
					: 8

		},


		pathfinding: {

			slopeWeight:
				slopeWeightInput
					? parseFloat(slopeWeightInput.value)
					: 18,

			uphillWeight:
				uphillWeightInput
					? parseFloat(uphillWeightInput.value)
					: 1.8,

			maximumSlope:
				maximumSlopeInput
					? parseFloat(maximumSlopeInput.value)
					: 0.55

		}

	};

}


/* =========== VALIDATE CONFIGURATION ========================================================================================================= */

function validateConfig(config) {

	if (!Number.isFinite(config.latitude)) {

		throw new Error(
			"Latitude must be a valid number."
		);

	}


	if (!Number.isFinite(config.longitude)) {

		throw new Error(
			"Longitude must be a valid number."
		);

	}


	if (
		!Number.isFinite(config.areaKM) ||
		config.areaKM <= 0
	) {

		throw new Error(
			"Area must be greater than zero."
		);

	}


	if (
		!Number.isInteger(config.terrainResolution) ||
		config.terrainResolution < 2
	) {

		throw new Error(
			"Terrain resolution must be an integer greater than 1."
		);

	}


	if (
		!Number.isInteger(config.start.x) ||
		!Number.isInteger(config.start.z) ||
		!Number.isInteger(config.end.x) ||
		!Number.isInteger(config.end.z)
	) {

		throw new Error(
			"Start and end coordinates must be integers."
		);

	}

}


/* =========== BUILD TERRAIN GEOMETRY ========================================================================================================= */

function buildTerrain(config) {

	/* SEND CONFIGURATION TO terrain.js */

	configureTerrain(config);


	/* RETRIEVE CONFIGURED TERRAIN VALUES */

	const TERRAIN_SIZE =
		getTerrainSize();

	const TERRAIN_SEG =
		getTerrainSegments();


	/* CREATE PLANE */

	const terrainGeometry =
		new THREE.PlaneGeometry(
			TERRAIN_SIZE,
			TERRAIN_SIZE,
			TERRAIN_SEG,
			TERRAIN_SEG
		);


	/* CONVERT XY PLANE TO XZ GROUND PLANE */

	terrainGeometry.rotateX(
		-Math.PI / 2
	);


	/* GET VERTEX POSITIONS */

	const position =
		terrainGeometry.attributes.position;


	/* APPLY TOPOGRAPHIC HEIGHT */

	for (
		let i = 0;
		i < position.count;
		i++
	) {

		const x =
			position.getX(i);

		const z =
			position.getZ(i);

		const y =
			getTerrainHeight(
				x,
				z
			);

		position.setY(
			i,
			y
		);

	}


	position.needsUpdate =
		true;


	terrainGeometry.computeVertexNormals();


	return terrainGeometry;

}


/* =========== CREATE TERRAIN MESH ============================================================================================================ */

function createTerrainMesh(config) {

	/* REMOVE OLD TERRAIN */

	if (terrainMesh) {

		scene.remove(
			terrainMesh
		);

		terrainMesh.geometry.dispose();

		terrainMesh.material.dispose();

		terrainMesh =
			null;

	}


	/* BUILD NEW GEOMETRY */

	const terrainGeometry =
		buildTerrain(config);


	/* WIREFRAME MATERIAL */

	const terrainMaterial =
		new THREE.MeshBasicMaterial({

			color:
				0xBFC5CC,

			wireframe:
				true,

			transparent:
				true,

			opacity:
				0.55

		});


	/* CREATE MESH */

	terrainMesh =
		new THREE.Mesh(
			terrainGeometry,
			terrainMaterial
		);


	scene.add(
		terrainMesh
	);

}


/* =========== REMOVE OLD NAVIGATION ========================================================================================================== */

function removeNavigation() {

	if (!navigation) {

		return;

	}


	if (navigation.line) {

		scene.remove(
			navigation.line
		);

		if (navigation.line.geometry) {

			navigation.line.geometry.dispose();

		}

		if (navigation.line.material) {

			navigation.line.material.dispose();

		}

	}


	if (navigation.arrow) {

		scene.remove(
			navigation.arrow
		);

		if (navigation.arrow.geometry) {

			navigation.arrow.geometry.dispose();

		}

		if (navigation.arrow.material) {

			navigation.arrow.material.dispose();

		}

	}


	navigation =
		null;

}


/* =========== GENERATE NAVIGATION ============================================================================================================ */

function generateNavigation() {

	try {

		/* READ WEBPAGE */

		const config =
			readTerrainControls();


		/* VALIDATE */

		validateConfig(
			config
		);


		currentConfig =
			config;


		/* REMOVE OLD NAVIGATION */

		removeNavigation();


		/* CREATE TERRAIN */

		createTerrainMesh(
			config
		);


		/* FIND LEAST-COST PATH */

		const path =
			findPath(
				config.start.x,
				config.start.z,
				config.end.x,
				config.end.z,
				config.pathfinding
			);


		/* CHECK RESULT */

		if (
			!Array.isArray(path) ||
			path.length < 2
		) {

			console.warn(
				"No valid navigation path was found."
			);

			return;

		}


		/* CREATE GOLD PATH + ARROW */

		navigation =
			createNavigationPath(
				scene,
				path
			);


		/* RESET ANIMATION TIMER */

		clock.start();


		console.log(
			"Terrain generated."
		);

		console.log(
			"Navigation path:",
			path
		);

	}

	catch (error) {

		console.error(
			"TERRAIN GENERATION ERROR:",
			error
		);

	}

}


/* =========== GENERATE BUTTON ================================================================================================================= */

function connectGenerateButton() {

	const generateButton =
		document.getElementById(
			"generateTerrain"
		);


	if (!generateButton) {

		console.warn(
			'No element with id="generateTerrain" was found. Terrain will generate automatically.'
		);

		return false;

	}


	generateButton.addEventListener(
		"click",
		generateNavigation
	);


	return true;

}


/* =========== CAMERA POSITION ================================================================================================================= */

function positionCamera() {

	const TERRAIN_SIZE =
		getTerrainSize();


	camera.position.set(
		TERRAIN_SIZE * 0.15,
		TERRAIN_SIZE * 0.55,
		TERRAIN_SIZE * 0.80
	);


	camera.lookAt(
		0,
		0,
		0
	);

}


/* =========== RESIZE ========================================================================================================================= */

function resizeRenderer() {

	const width =
		container.clientWidth;

	const height =
		container.clientHeight;


	if (
		width <= 0 ||
		height <= 0
	) {

		return;

	}


	camera.aspect =
		width / height;


	camera.updateProjectionMatrix();


	renderer.setSize(
		width,
		height
	);

}


/* =========== ANIMATION LOOP ================================================================================================================= */

function animate() {

	requestAnimationFrame(
		animate
	);


	/* UPDATE NAVIGATION ARROW */

	if (navigation) {

		const elapsedTime =
			clock.getElapsedTime();


		updateNavigationArrow(
			navigation,
			elapsedTime
		);

	}


	/* RENDER */

	renderer.render(
		scene,
		camera
	);

}


/* =========== START APPLICATION ============================================================================================================== */

function startApplication() {

	/* INITIALIZE THREE.JS */

	initializeThree();


	/* CONNECT HTML BUTTON */

	const buttonConnected =
		connectGenerateButton();


	/* GENERATE INITIAL TERRAIN */

	generateNavigation();


	/* POSITION CAMERA AFTER TERRAIN CONFIGURATION */

	positionCamera();


	/* BEGIN RENDER LOOP */

	animate();


	if (buttonConnected) {

		console.log(
			"Terrain navigation system ready."
		);

	}

}


/* =========== RUN ============================================================================================================================ */

startApplication();
