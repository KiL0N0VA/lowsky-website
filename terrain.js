/* ========================================================================== */
/* AUTOMATED-GROUND NAVIGATION                                                */
/* PROCEDURAL TOPOGRAPHIC TERRAIN GENERATOR                                   */
/* ========================================================================== */

import * as THREE from
	"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";


/* ========================================================================== */
/* USER INPUT VARIABLES                                                       */
/* ========================================================================== */

/*
	elevationGrid:
		Maximum intended terrain relief, in metres.

		Recommended:
		500 - 3000 m

		Hard limit:
		5000 m


	detail:
		Number of elevation samples along X and Y.

		64  = low
		128 = medium
		256 = high

		Hard limit:
		512


	areaKm:
		TOTAL square terrain area in km².

		Example:

			areaKm = 100

		produces:

			10 km x 10 km

		Hard limit:
			1000 km²


	numberMountains:
		0 - 10


	numberValleys:
		0 - 10


	randomSeed:
		Change this number to generate a different terrain.

		Using a seed means the same number always generates
		the same terrain.
*/


const terrainConfig = {

	elevationGrid: 1800,

	detail: 128,

	areaKm: 100,

	numberMountains: 5,

	numberValleys: 3,

	randomSeed: 42731,

	displaySize: 100,

	verticalScale: 1.0
};


/* ========================================================================== */
/* HARD LIMITS                                                                */
/* ========================================================================== */

const LIMITS = {

	minElevationGrid: 100,

	maxElevationGrid: 5000,

	minDetail: 16,

	maxDetail: 512,

	minAreaKm: 1,

	maxAreaKm: 1000,

	minMountains: 0,

	maxMountains: 10,

	minValleys: 0,

	maxValleys: 10
};


/* ========================================================================== */
/* CONFIGURATION VALIDATION                                                   */
/* ========================================================================== */

function validateConfiguration(){

	const config =
		terrainConfig;


	if(
		config.elevationGrid <
			LIMITS.minElevationGrid ||

		config.elevationGrid >
			LIMITS.maxElevationGrid
	){

		throw new Error(

			`elevationGrid must be between ` +

			`${LIMITS.minElevationGrid} and ` +

			`${LIMITS.maxElevationGrid} metres.`
		);
	}


	if(
		!Number.isInteger(
			config.detail
		) ||

		config.detail <
			LIMITS.minDetail ||

		config.detail >
			LIMITS.maxDetail
	){

		throw new Error(

			`detail must be an integer between ` +

			`${LIMITS.minDetail} and ` +

			`${LIMITS.maxDetail}.`
		);
	}


	if(
		config.areaKm <
			LIMITS.minAreaKm ||

		config.areaKm >
			LIMITS.maxAreaKm
	){

		throw new Error(

			`areaKm must be between ` +

			`${LIMITS.minAreaKm} and ` +

			`${LIMITS.maxAreaKm} km².`
		);
	}


	if(
		!Number.isInteger(
			config.numberMountains
		) ||

		config.numberMountains <
			LIMITS.minMountains ||

		config.numberMountains >
			LIMITS.maxMountains
	){

		throw new Error(

			`numberMountains must be between ` +

			`${LIMITS.minMountains} and ` +

			`${LIMITS.maxMountains}.`
		);
	}


	if(
		!Number.isInteger(
			config.numberValleys
		) ||

		config.numberValleys <
			LIMITS.minValleys ||

		config.numberValleys >
			LIMITS.maxValleys
	){

		throw new Error(

			`numberValleys must be between ` +

			`${LIMITS.minValleys} and ` +

			`${LIMITS.maxValleys}.`
		);
	}
}


/* ========================================================================== */
/* SEEDED RANDOM NUMBER GENERATOR                                             */
/* ========================================================================== */

/*
	Using Math.random() would generate a new terrain every refresh.

	A seeded randomizer is more useful because:

		randomSeed = 42731

	will always reproduce the same terrain.

	Change the seed to generate another terrain.
*/


function createRandomGenerator(seed){

	let state =
		seed >>> 0;


	return function(){

		state +=
			0x6D2B79F5;


		let value =
			state;


		value =
			Math.imul(
				value ^
				(value >>> 15),

				value | 1
			);


		value ^=
			value +

			Math.imul(
				value ^
				(value >>> 7),

				value | 61
			);


		return (

			(
				value ^
				(value >>> 14)
			)

			>>> 0

		)

		/

		4294967296;
	};
}


const random =
	createRandomGenerator(
		terrainConfig.randomSeed
	);


/* ========================================================================== */
/* RANDOM RANGE                                                               */
/* ========================================================================== */

function randomRange(
	min,
	max
){

	return (
		min +
		random() *
		(max - min)
	);
}


/* ========================================================================== */
/* TERRAIN DIMENSIONS                                                         */
/* ========================================================================== */

/*
	areaKm represents AREA.

	Therefore:

		sideLength² = area

		sideLength = sqrt(area)
*/


const terrainSideKm =
	Math.sqrt(
		terrainConfig.areaKm
	);


const terrainSideMetres =
	terrainSideKm *
	1000;


const halfTerrainMetres =
	terrainSideMetres /
	2;


console.log(
	"Terrain area:",
	terrainConfig.areaKm,
	"km²"
);


console.log(
	"Terrain dimensions:",
	terrainSideKm.toFixed(2),
	"km x",
	terrainSideKm.toFixed(2),
	"km"
);


/* ========================================================================== */
/* TERRAIN FEATURE DEFINITIONS                                                */
/* ========================================================================== */

/*
	Each terrain feature has:

		x
		y

			Position in real-world metres from terrain centre.

		height

			Positive for mountain.
			Negative for valley.

		sigmaX
		sigmaY

			Controls width/spread.

		rotation

			Rotates elliptical terrain features.

	This gives us something considerably more believable than
	dropping perfectly circular volcanoes across the landscape.
*/


const terrainFeatures =
	[];


/* ========================================================================== */
/* DISTANCE BETWEEN FEATURES                                                  */
/* ========================================================================== */

function distanceBetween(
	x1,
	y1,
	x2,
	y2
){

	const dx =
		x2 - x1;


	const dy =
		y2 - y1;


	return Math.sqrt(
		dx * dx +
		dy * dy
	);
}


/* ========================================================================== */
/* FIND FEASIBLE FEATURE POSITION                                             */
/* ========================================================================== */

function findFeaturePosition(
	minimumSeparation
){

	const edgeMargin =
		terrainSideMetres *
		0.10;


	const usableHalfWidth =
		halfTerrainMetres -
		edgeMargin;


	const maximumAttempts =
		100;


	for(
		let attempt = 0;
		attempt < maximumAttempts;
		attempt++
	){

		const x =
			randomRange(
				-usableHalfWidth,
				usableHalfWidth
			);


		const y =
			randomRange(
				-usableHalfWidth,
				usableHalfWidth
			);


		let valid =
			true;


		for(
			const feature
			of terrainFeatures
		){

			const distance =
				distanceBetween(

					x,
					y,

					feature.x,
					feature.y
				);


			if(
				distance <
				minimumSeparation
			){

				valid =
					false;

				break;
			}
		}


		if(valid){

			return {
				x,
				y
			};
		}
	}


	/*
		If terrain becomes crowded, relax the rule.

		With up to 20 features inside a small map,
		mathematics eventually objects to our urban planning.
	*/


	return {

		x:
			randomRange(
				-usableHalfWidth,
				usableHalfWidth
			),

		y:
			randomRange(
				-usableHalfWidth,
				usableHalfWidth
			)
	};
}


/* ========================================================================== */
/* GENERATE MOUNTAINS                                                         */
/* ========================================================================== */

function generateMountains(){

	const minimumSeparation =
		terrainSideMetres *
		0.12;


	for(
		let i = 0;
		i <
		terrainConfig.numberMountains;
		i++
	){

		const position =
			findFeaturePosition(
				minimumSeparation
			);


		const height =
			randomRange(

				terrainConfig.elevationGrid *
				0.35,

				terrainConfig.elevationGrid
			);


		const sigmaX =
			randomRange(

				terrainSideMetres *
					0.045,

				terrainSideMetres *
					0.16
			);


		const sigmaY =
			randomRange(

				terrainSideMetres *
					0.045,

				terrainSideMetres *
					0.16
			);


		const rotation =
			randomRange(
				0,
				Math.PI
			);


		terrainFeatures.push({

			type:
				"mountain",

			x:
				position.x,

			y:
				position.y,

			height,

			sigmaX,

			sigmaY,

			rotation
		});
	}
}


/* ========================================================================== */
/* GENERATE VALLEYS                                                          */
/* ========================================================================== */

function generateValleys(){

	const minimumSeparation =
		terrainSideMetres *
		0.10;


	for(
		let i = 0;
		i <
		terrainConfig.numberValleys;
		i++
	){

		const position =
			findFeaturePosition(
				minimumSeparation
			);


		const depth =
			randomRange(

				terrainConfig.elevationGrid *
					0.12,

				terrainConfig.elevationGrid *
					0.45
			);


		/*
			Valleys are generally broader than peaks.
		*/

		const sigmaX =
			randomRange(

				terrainSideMetres *
					0.08,

				terrainSideMetres *
					0.22
			);


		const sigmaY =
			randomRange(

				terrainSideMetres *
					0.08,

				terrainSideMetres *
					0.25
			);


		const rotation =
			randomRange(
				0,
				Math.PI
			);


		terrainFeatures.push({

			type:
				"valley",

			x:
				position.x,

			y:
				position.y,

			height:
				-depth,

			sigmaX,

			sigmaY,

			rotation
		});
	}
}


/* ========================================================================== */
/* ROTATED GAUSSIAN TERRAIN FEATURE                                           */
/* ========================================================================== */

/*

	The basic Gaussian surface is:

	             -(x² / 2σx² + y² / 2σy²)
		z = H e


	Positive H:

		mountain


	Negative H:

		valley


	Different sigma values produce elongated terrain.

	Rotation prevents everything from aligning perfectly with
	the world axes.
*/


function gaussianFeature(
	x,
	y,
	feature
){

	const dx =
		x -
		feature.x;


	const dy =
		y -
		feature.y;


	const cosR =
		Math.cos(
			feature.rotation
		);


	const sinR =
		Math.sin(
			feature.rotation
		);


	const rotatedX =

		dx *
		cosR +

		dy *
		sinR;


	const rotatedY =

		-dx *
		sinR +

		dy *
		cosR;


	const exponent =

		-(

			(
				rotatedX *
				rotatedX
			)

			/

			(
				2 *
				feature.sigmaX *
				feature.sigmaX
			)


			+


			(
				rotatedY *
				rotatedY
			)

			/

			(
				2 *
				feature.sigmaY *
				feature.sigmaY
			)

		);


	return (

		feature.height *
		Math.exp(
			exponent
		)
	);
}


/* ========================================================================== */
/* REGIONAL TERRAIN                                                           */
/* ========================================================================== */

/*
	Mountains and valleys alone look synthetic.

	This adds broad low-frequency terrain underneath them.
*/


function regionalTerrain(
	x,
	y
){

	const scale =
		terrainSideMetres;


	const wave1 =

		Math.sin(
			x /
			scale *
			Math.PI *
			2.1
		)

		*

		Math.cos(
			y /
			scale *
			Math.PI *
			1.7
		);


	const wave2 =

		Math.sin(

			(
				x +
				y *
				0.65
			)

			/

			scale

			*

			Math.PI *
			3.2
		);


	const wave3 =

		Math.cos(

			(
				x *
				0.45 -
				y
			)

			/

			scale

			*

			Math.PI *
			2.6
		);


	return (

		wave1 *
			terrainConfig.elevationGrid *
			0.055

		+

		wave2 *
			terrainConfig.elevationGrid *
			0.035

		+

		wave3 *
			terrainConfig.elevationGrid *
			0.025
	);
}


/* ========================================================================== */
/* SMALL-SCALE TERRAIN VARIATION                                              */
/* ========================================================================== */

function localTerrainVariation(
	x,
	y
){

	const scale =
		terrainSideMetres;


	const variation1 =

		Math.sin(

			x /
			scale *
			Math.PI *
			11.0

			+

			y /
			scale *
			Math.PI *
			4.0
		);


	const variation2 =

		Math.cos(

			x /
			scale *
			Math.PI *
			6.5

			-

			y /
			scale *
			Math.PI *
			9.0
		);


	return (

		(
			variation1 +
			variation2
		)

		*

		terrainConfig.elevationGrid *
		0.012
	);
}


/* ========================================================================== */
/* CALCULATE TERRAIN ELEVATION                                                */
/* ========================================================================== */

function terrainElevation(
	x,
	y
){

	let elevation =
		0;


	/* ---------------------------------------------------------------------- */
	/* Broad terrain                                                          */
	/* ---------------------------------------------------------------------- */

	elevation +=
		regionalTerrain(
			x,
			y
		);


	/* ---------------------------------------------------------------------- */
	/* Mountains and valleys                                                  */
	/* ---------------------------------------------------------------------- */

	for(
		const feature
		of terrainFeatures
	){

		elevation +=
			gaussianFeature(
				x,
				y,
				feature
			);
	}


	/* ---------------------------------------------------------------------- */
	/* Fine terrain variation                                                 */
	/* ---------------------------------------------------------------------- */

	elevation +=
		localTerrainVariation(
			x,
			y
		);


	return elevation;
}


/* ========================================================================== */
/* GENERATE FEATURE LOCATIONS                                                 */
/* ========================================================================== */

function generateTerrainFeatures(){

	terrainFeatures.length =
		0;


	generateMountains();

	generateValleys();


	console.table(
		terrainFeatures.map(

			(feature, index) => ({

				id:
					index + 1,

				type:
					feature.type,

				xKm:
					(
						feature.x /
						1000
					).toFixed(2),

				yKm:
					(
						feature.y /
						1000
					).toFixed(2),

				elevationMetres:
					feature.height.toFixed(0),

				widthXKm:
					(
						feature.sigmaX /
						1000
					).toFixed(2),

				widthYKm:
					(
						feature.sigmaY /
						1000
					).toFixed(2)
			}))
		)
	);
}


/* ========================================================================== */
/* GENERATE ELEVATION GRID                                                    */
/* ========================================================================== */

function generateElevationGrid(){

	const detail =
		terrainConfig.detail;


	const elevationGrid =
		new Float32Array(
			detail *
			detail
		);


	let minimumElevation =
		Infinity;


	let maximumElevation =
		-Infinity;


	for(
		let row = 0;
		row < detail;
		row++
	){

		const normalizedY =
			row /
			(detail - 1);


		/*
			row = 0
				North

			row = detail - 1
				South
		*/

		const y =

			halfTerrainMetres

			-

			normalizedY *
			terrainSideMetres;


		for(
			let column = 0;
			column < detail;
			column++
		){

			const normalizedX =
				column /
				(detail - 1);


			const x =

				-halfTerrainMetres

				+

				normalizedX *
				terrainSideMetres;


			const elevation =
				terrainElevation(
					x,
					y
				);


			const index =
				row *
				detail +
				column;


			elevationGrid[
				index
			] =
				elevation;


			minimumElevation =
				Math.min(
					minimumElevation,
					elevation
				);


			maximumElevation =
				Math.max(
					maximumElevation,
					elevation
				);
		}
	}


	/*
		Shift the entire terrain upward so the lowest point
		becomes elevation zero.

		The relative relief is preserved.
	*/


	for(
		let i = 0;
		i < elevationGrid.length;
		i++
	){

		elevationGrid[i] -=
			minimumElevation;
	}


	return {

		grid:
			elevationGrid,

		minimumRawElevation:
			minimumElevation,

		maximumRawElevation:
			maximumElevation,

		relief:
			maximumElevation -
			minimumElevation
	};
}


/* ========================================================================== */
/* THREE.JS SCENE                                                             */
/* ========================================================================== */

const container =
	document.getElementById(
		"terrain-container"
	);


if(!container){

	throw new Error(
		'HTML requires an element with id="terrain-container".'
	);
}


const scene =
	new THREE.Scene();


scene.background =
	new THREE.Color(
		0x000000
	);


/* ========================================================================== */
/* CAMERA                                                                     */
/* ========================================================================== */

const camera =
	new THREE.PerspectiveCamera(

		40,

		container.clientWidth /
		container.clientHeight,

		0.1,

		2000
	);


camera.position.set(

	0,

	-100,

	72
);


camera.lookAt(
	0,
	0,
	0
);


/* ========================================================================== */
/* RENDERER                                                                   */
/* ========================================================================== */

const renderer =
	new THREE.WebGLRenderer({

		antialias:
			true,

		alpha:
			false
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


/* ========================================================================== */
/* CREATE THREE.JS TERRAIN GEOMETRY                                           */
/* ========================================================================== */

function createTerrainGeometry(
	elevationData
){

	const detail =
		terrainConfig.detail;


	const displaySize =
		terrainConfig.displaySize;


	const geometry =
		new THREE.PlaneGeometry(

			displaySize,

			displaySize,

			detail - 1,

			detail - 1
		);


	const positions =
		geometry
			.attributes
			.position;


	/*
		Convert real-world metres to Three.js units.

		This preserves physical proportions when:

			verticalScale = 1.0
	*/


	const metresPerSceneUnit =

		terrainSideMetres

		/

		displaySize;


	for(
		let row = 0;
		row < detail;
		row++
	){

		for(
			let column = 0;
			column < detail;
			column++
		){

			const gridIndex =
				row *
					detail +
				column;


			const elevationMetres =
				elevationData.grid[
					gridIndex
				];


			const elevationSceneUnits =

				elevationMetres

				/

				metresPerSceneUnit

				*

				terrainConfig.verticalScale;


			positions.setZ(

				gridIndex,

				elevationSceneUnits
			);
		}
	}


	positions.needsUpdate =
		true;


	geometry.computeVertexNormals();


	return geometry;
}


/* ========================================================================== */
/* TERRAIN MATERIAL                                                           */
/* ========================================================================== */

function createTerrainMaterial(){

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
/* TERRAIN UNDERLAY                                                           */
/* ========================================================================== */

/*
	A nearly black solid surface underneath the wireframe makes
	the terrain substantially easier to read.

	It does not change terrain geometry.
*/


function createTerrainUnderlay(
	geometry
){

	const material =
		new THREE.MeshBasicMaterial({

			color:
				0x050505,

			side:
				THREE.DoubleSide
		});


	const mesh =
		new THREE.Mesh(

			geometry.clone(),

			material
		);


	mesh.position.z =
		-0.02;


	return mesh;
}


/* ========================================================================== */
/* GENERATE TERRAIN                                                           */
/* ========================================================================== */

validateConfiguration();


generateTerrainFeatures();


const elevationData =
	generateElevationGrid();


console.log(
	"Raw minimum elevation:",
	elevationData.minimumRawElevation.toFixed(1),
	"m"
);


console.log(
	"Raw maximum elevation:",
	elevationData.maximumRawElevation.toFixed(1),
	"m"
);


console.log(
	"Total terrain relief:",
	elevationData.relief.toFixed(1),
	"m"
);


const terrainGeometry =
	createTerrainGeometry(
		elevationData
	);


const terrainMaterial =
	createTerrainMaterial();


const terrain =
	new THREE.Mesh(

	terrainGeometry,

	terrainMaterial
);


scene.add(
	terrain
);


/* ========================================================================== */
/* UNDERLAY                                                                   */
/* ========================================================================== */

const underlay =
	createTerrainUnderlay(
		terrainGeometry
	);


scene.add(
	underlay
);


/* ========================================================================== */
/* CAMERA FRAMING                                                             */
/* ========================================================================== */

function frameTerrain(){

	const box =
		new THREE.Box3();


	box.setFromObject(
		terrain
	);


	const size =
		new THREE.Vector3();


	box.getSize(
		size
	);


	const center =
		new THREE.Vector3();


	box.getCenter(
		center
	);


	const horizontalSize =
		Math.max(
			size.x,
			size.y
		);


	camera.position.set(

		center.x,

		center.y -
			horizontalSize *
			0.95,

		center.z +
			horizontalSize *
			0.72
	);


	camera.lookAt(
		center
	);
}


frameTerrain();


/* ========================================================================== */
/* ANIMATION                                                                  */
/* ========================================================================== */

/*
	Rotation is deliberately extremely slow.

	Remove these two rotation lines if a stationary terrain
	display is preferred.
*/


function animate(){

	requestAnimationFrame(
		animate
	);


	terrain.rotation.z +=
		0.00015;


	underlay.rotation.z =
		terrain.rotation.z;


	renderer.render(
		scene,
		camera
	);
}


animate();


/* ========================================================================== */
/* RESPONSIVE RESIZING                                                        */
/* ========================================================================== */

window.addEventListener(

	"resize",

	() => {


		const width =
			container.clientWidth;


		const height =
			container.clientHeight;


		if(
			width <= 0 ||
			height <= 0
		){

			return;
		}


		camera.aspect =
			width /
			height;


		camera.updateProjectionMatrix();


		renderer.setSize(

			width,

			height
		);
	}
);


/* ========================================================================== */
/* END                                                                        */
/* ========================================================================== */