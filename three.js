/* ========================================================================== */
/* AUTOMATED-GROUND NAVIGATION                                                */
/* THREE.JS TERRAIN RENDERING ENGINE                                          */
/* ========================================================================== */

/*
	three.js

	PURPOSE:

	This file does NOT generate terrain.

	It receives terrain data from terrain.js and handles:

		1. Three.js scene
		2. Camera
		3. WebGL renderer
		4. Terrain geometry
		5. Terrain material
		6. Scene placement
		7. Animation
		8. Responsive resizing


	DATA FLOW:

	terrain.js
	    ↓
	elevationGrid
	    ↓
	three.js
	    ↓
	PlaneGeometry
	    ↓
	WebGL
*/


import * as THREE from
	"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";


import {
	terrainConfig,
	generateTerrainData
}
from "./terrain.js";


/* ========================================================================== */
/* HTML CONTAINER                                                             */
/* ========================================================================== */

const container =
	document.getElementById(
		"terrain-container"
	);


if (!container) {

	throw new Error(
		'Missing HTML element: id="terrain-container".'
	);
}


/* ========================================================================== */
/* THREE.JS SCENE                                                             */
/* ========================================================================== */

const scene =
	new THREE.Scene();


scene.background =
	new THREE.Color(
		0x101416
	);


/* ========================================================================== */
/* CAMERA                                                                     */
/* ========================================================================== */

const camera =
	new THREE.PerspectiveCamera(

		40,

		Math.max(
			container.clientWidth,
			1
		)
		/
		Math.max(
			container.clientHeight,
			1
		),

		0.1,

		2000
	);


/*
	Temporary initial position.

	frameTerrain() will reposition the camera once
	the actual terrain geometry exists.
*/

camera.position.set(
	0,
	-100,
	70
);


camera.lookAt(
	0,
	0,
	0
);


/* ========================================================================== */
/* WEBGL RENDERER                                                             */
/* ========================================================================== */

const renderer =
	new THREE.WebGLRenderer({

		antialias: true,

		alpha: false
	});


renderer.setPixelRatio(

	Math.min(
		window.devicePixelRatio || 1,
		2
	)
);


renderer.setSize(

	Math.max(
		container.clientWidth,
		1
	),

	Math.max(
		container.clientHeight,
		1
	)
);


container.appendChild(
	renderer.domElement
);


/* ========================================================================== */
/* TERRAIN OBJECT STATE                                                       */
/* ========================================================================== */

let terrainMesh = null;

let terrainUnderlay = null;


/* ========================================================================== */
/* CREATE TERRAIN GEOMETRY                                                    */
/* ========================================================================== */

/*
	terrainData must contain:

	{
		elevationGrid,
		detail,
		areaKm,
		elevationGridMax
	}


	The elevation grid contains elevations in metres.

	The horizontal terrain dimensions are derived from areaKm.

	Example:

		areaKm = 100 km²

		side length:

			sqrt(100) = 10 km

			= 10,000 metres


	If displaySize = 100 scene units:

		10,000 m / 100 units
		=
		100 metres per scene unit.
*/


function createTerrainGeometry(
	terrainData
) {

	const elevationGrid =
		terrainData.elevationGrid;


	const detail =
		terrainData.detail;


	const areaKm =
		terrainData.areaKm;


	const displaySize =
		terrainConfig.displaySize;


	const verticalScale =
		terrainConfig.verticalScale;


	/* ---------------------------------------------------------------------- */
	/* Validate terrain data                                                  */
	/* ---------------------------------------------------------------------- */

	if (
		!elevationGrid ||
		elevationGrid.length !==
			detail * detail
	) {

		throw new Error(

			"Invalid terrain elevation grid. " +

			`Expected ${detail * detail} samples, ` +

			`received ${elevationGrid?.length ?? 0}.`
		);
	}


	/* ---------------------------------------------------------------------- */
	/* Convert total area into side length                                    */
	/* ---------------------------------------------------------------------- */

	const terrainSideKm =
		Math.sqrt(
			areaKm
		);


	const terrainSideMetres =
		terrainSideKm *
		1000;


	const metresPerSceneUnit =

		terrainSideMetres

		/

		displaySize;


	/* ---------------------------------------------------------------------- */
	/* Create XY plane                                                        */
	/* ---------------------------------------------------------------------- */

	const geometry =
		new THREE.PlaneGeometry(

			displaySize,

			displaySize,

			detail - 1,

			detail - 1
		);


	const positions =
		geometry.attributes.position;


	/* ---------------------------------------------------------------------- */
	/* Apply elevations                                                       */
	/* ---------------------------------------------------------------------- */

	for (
		let row = 0;
		row < detail;
		row++
	) {

		for (
			let column = 0;
			column < detail;
			column++
		) {

			const index =
				row *
				detail +
				column;


			const elevationMetres =
				elevationGrid[
					index
				];


			const sceneElevation =

				(
					elevationMetres

					/

					metresPerSceneUnit
				)

				*

				verticalScale;


			positions.setZ(
				index,
				sceneElevation
			);
		}
	}


	positions.needsUpdate =
		true;


	geometry.computeVertexNormals();

	geometry.computeBoundingBox();

	geometry.computeBoundingSphere();


	return geometry;
}


/* ========================================================================== */
/* TERRAIN WIREFRAME MATERIAL                                                 */
/* ========================================================================== */

function createTerrainMaterial() {

	return new THREE.MeshBasicMaterial({

		color:
			0xb5b52a,

		wireframe:
			true,

		transparent:
			true,

		opacity:
			0.78,

		side:
			THREE.DoubleSide
	});
}


/* ========================================================================== */
/* TERRAIN UNDERLAY MATERIAL                                                  */
/* ========================================================================== */

function createUnderlayMaterial() {

	return new THREE.MeshBasicMaterial({

		color:
			0x080b0c,

		side:
			THREE.DoubleSide
	});
}


/* ========================================================================== */
/* CREATE TERRAIN OBJECTS                                                     */
/* ========================================================================== */

function createTerrainObjects(
	terrainData
) {

	const geometry =
		createTerrainGeometry(
			terrainData
		);


	/* ---------------------------------------------------------------------- */
	/* Solid terrain underlay                                                 */
	/* ---------------------------------------------------------------------- */

	const underlayGeometry =
		geometry.clone();


	const underlayMaterial =
		createUnderlayMaterial();


	terrainUnderlay =
		new THREE.Mesh(

			underlayGeometry,

			underlayMaterial
		);


	/*
		Move underlay very slightly downward to reduce
		z-fighting between solid and wireframe surfaces.
	*/

	terrainUnderlay.position.z =
		-0.015;


	/* ---------------------------------------------------------------------- */
	/* Wireframe                                                              */
	/* ---------------------------------------------------------------------- */

	const terrainMaterial =
		createTerrainMaterial();


	terrainMesh =
		new THREE.Mesh(

			geometry,

			terrainMaterial
		);


	scene.add(
		terrainUnderlay
	);


	scene.add(
		terrainMesh
	);
}


/* ========================================================================== */
/* REMOVE EXISTING TERRAIN                                                    */
/* ========================================================================== */

function removeTerrain() {

	if (terrainMesh) {

		scene.remove(
			terrainMesh
		);


		terrainMesh.geometry.dispose();

		terrainMesh.material.dispose();


		terrainMesh =
			null;
	}


	if (terrainUnderlay) {

		scene.remove(
			terrainUnderlay
		);


		terrainUnderlay.geometry.dispose();

		terrainUnderlay.material.dispose();


		terrainUnderlay =
			null;
	}
}


/* ========================================================================== */
/* CAMERA FRAMING                                                             */
/* ========================================================================== */

function frameTerrain() {

	if (!terrainMesh) {

		return;
	}


	const bounds =
		new THREE.Box3()
			.setFromObject(
				terrainMesh
			);


	const size =
		new THREE.Vector3();


	const center =
		new THREE.Vector3();


	bounds.getSize(
		size
	);


	bounds.getCenter(
		center
	);


	const horizontalSize =
		Math.max(
			size.x,
			size.y
		);


	const verticalSize =
		Math.max(
			size.z,
			1
		);


	/*
		Low oblique perspective.

		This is intentionally closer to your original
		topographic reference than a top-down map.
	*/

	camera.position.set(

		center.x,

		center.y -
			horizontalSize *
			1.05,

		center.z +
			horizontalSize *
			0.58 +
			verticalSize *
			0.35
	);


	camera.lookAt(

		center.x,

		center.y,

		center.z +
			verticalSize *
			0.10
	);


	camera.near =
		0.1;


	camera.far =
		Math.max(

			2000,

			horizontalSize *
			20
		);


	camera.updateProjectionMatrix();
}


/* ========================================================================== */
/* GENERATE AND LOAD TERRAIN                                                  */
/* ========================================================================== */

function loadTerrain() {

	console.log(
		"Generating procedural terrain..."
	);


	/* ---------------------------------------------------------------------- */
	/* Ask terrain.js for terrain DATA                                        */
	/* ---------------------------------------------------------------------- */

	const terrainData =
		generateTerrainData();


	console.log(
		"Terrain data:",
		terrainData
	);


	console.log(

		"Elevation samples:",

		terrainData.elevationGrid.length
	);


	console.log(

		"Terrain detail:",

		`${terrainData.detail} x ${terrainData.detail}`
	);


	console.log(

		"Terrain area:",

		`${terrainData.areaKm} km²`
	);


	/* ---------------------------------------------------------------------- */
	/* Remove previous rendered terrain                                       */
	/* ---------------------------------------------------------------------- */

	removeTerrain();


	/* ---------------------------------------------------------------------- */
	/* Convert data into Three.js objects                                     */
	/* ---------------------------------------------------------------------- */

	createTerrainObjects(
		terrainData
	);


	/* ---------------------------------------------------------------------- */
	/* Position camera                                                        */
	/* ---------------------------------------------------------------------- */

	frameTerrain();


	console.log(
		"Terrain rendered successfully."
	);
}


/* ========================================================================== */
/* ANIMATION                                                                  */
/* ========================================================================== */

function animate() {

	requestAnimationFrame(
		animate
	);


	/*
		Leave terrain stationary for now.

		Later this is where camera movement,
		orbiting, route animation, markers,
		etc. can live.
	*/


	renderer.render(
		scene,
		camera
	);
}


/* ========================================================================== */
/* RESPONSIVE RESIZING                                                        */
/* ========================================================================== */

function resizeRenderer() {

	const width =
		Math.max(
			container.clientWidth,
			1
		);


	const height =
		Math.max(
			container.clientHeight,
			1
		);


	camera.aspect =
		width /
		height;


	camera.updateProjectionMatrix();


	renderer.setSize(
		width,
		height
	);
}


window.addEventListener(
	"resize",
	resizeRenderer
);


/* ========================================================================== */
/* INITIALIZATION                                                             */
/* ========================================================================== */

loadTerrain();

animate();


/* ========================================================================== */
/* OPTIONAL PUBLIC REGENERATION FUNCTION                                      */
/* ========================================================================== */

/*
	This lets another script regenerate the scene later with:

		window.regenerateTerrain();

	For now terrainConfig controls the seed and terrain parameters.
*/

window.regenerateTerrain =
	function () {

		loadTerrain();
	};


/* ========================================================================== */
/* END                                                                        */
/* ========================================================================== */
