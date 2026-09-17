/* ========================================================================== */
/* AUTOMATED-GROUND NAVIGATION                                                */
/* PROCEDURAL TOPOGRAPHIC TERRAIN GENERATOR                                   */
/* ========================================================================== */

/* ========================================================================== */
/* TERRAIN CONFIGURATION                                                      */
/* ========================================================================== */

export const terrainConfig = {

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

function validateConfiguration() {

	const config =
		terrainConfig;


	if (
		!Number.isFinite(config.elevationGrid) ||
		config.elevationGrid < LIMITS.minElevationGrid ||
		config.elevationGrid > LIMITS.maxElevationGrid
	) {

		throw new Error(
			`elevationGrid must be between ${LIMITS.minElevationGrid} and ${LIMITS.maxElevationGrid} metres.`
		);
	}


	if (
		!Number.isInteger(config.detail) ||
		config.detail < LIMITS.minDetail ||
		config.detail > LIMITS.maxDetail
	) {

		throw new Error(
			`detail must be an integer between ${LIMITS.minDetail} and ${LIMITS.maxDetail}.`
		);
	}


	if (
		!Number.isFinite(config.areaKm) ||
		config.areaKm < LIMITS.minAreaKm ||
		config.areaKm > LIMITS.maxAreaKm
	) {

		throw new Error(
			`areaKm must be between ${LIMITS.minAreaKm} and ${LIMITS.maxAreaKm} km².`
		);
	}


	if (
		!Number.isInteger(config.numberMountains) ||
		config.numberMountains < LIMITS.minMountains ||
		config.numberMountains > LIMITS.maxMountains
	) {

		throw new Error(
			`numberMountains must be between ${LIMITS.minMountains} and ${LIMITS.maxMountains}.`
		);
	}


	if (
		!Number.isInteger(config.numberValleys) ||
		config.numberValleys < LIMITS.minValleys ||
		config.numberValleys > LIMITS.maxValleys
	) {

		throw new Error(
			`numberValleys must be between ${LIMITS.minValleys} and ${LIMITS.maxValleys}.`
		);
	}


	if (
		!Number.isInteger(config.randomSeed)
	) {

		throw new Error(
			"randomSeed must be an integer."
		);
	}


	if (
		!Number.isFinite(config.displaySize) ||
		config.displaySize <= 0
	) {

		throw new Error(
			"displaySize must be greater than zero."
		);
	}


	if (
		!Number.isFinite(config.verticalScale) ||
		config.verticalScale <= 0
	) {

		throw new Error(
			"verticalScale must be greater than zero."
		);
	}
}


/* ========================================================================== */
/* SEEDED RANDOM NUMBER GENERATOR                                             */
/* ========================================================================== */

function createRandomGenerator(seed) {

	let state =
		seed >>> 0;


	return function () {

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


/* ========================================================================== */
/* TERRAIN GENERATION STATE                                                   */
/* ========================================================================== */

let random =
	createRandomGenerator(
		terrainConfig.randomSeed
	);


const terrainFeatures =
	[];


let terrainSideKm =
	0;


let terrainSideMetres =
	0;


let halfTerrainMetres =
	0;


/* ========================================================================== */
/* INITIALIZE GENERATION STATE                                                */
/* ========================================================================== */

function initializeGenerationState() {

	random =
		createRandomGenerator(
			terrainConfig.randomSeed
		);


	terrainFeatures.length =
		0;


	terrainSideKm =
		Math.sqrt(
			terrainConfig.areaKm
		);


	terrainSideMetres =
		terrainSideKm *
		1000;


	halfTerrainMetres =
		terrainSideMetres /
		2;
}


/* ========================================================================== */
/* RANDOM RANGE                                                               */
/* ========================================================================== */

function randomRange(
	min,
	max
) {

	return (
		min +
		random() *
		(max - min)
	);
}


/* ========================================================================== */
/* DISTANCE BETWEEN FEATURES                                                  */
/* ========================================================================== */

function distanceBetween(
	x1,
	y1,
	x2,
	y2
) {

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
	minimumSeparation,
	referenceFeature = null
) {

	const edgeMargin =
		terrainSideMetres *
		0.10;


	const usableHalfWidth =
		halfTerrainMetres -
		edgeMargin;


	const maximumAttempts =
		150;


	for (
		let attempt = 0;
		attempt < maximumAttempts;
		attempt++
	) {

		let x;

		let y;


		if (
			referenceFeature !== null &&
			attempt < 100
		) {

			const angle =
				randomRange(
					0,
					Math.PI * 2
				);


			const distance =
				randomRange(

					terrainSideMetres *
					0.12,

					terrainSideMetres *
					0.30
				);


			x =
				referenceFeature.x +

				Math.cos(angle) *
				distance;


			y =
				referenceFeature.y +

				Math.sin(angle) *
				distance;
		}

		else {

			x =
				randomRange(
					-usableHalfWidth,
					usableHalfWidth
				);


			y =
				randomRange(
					-usableHalfWidth,
					usableHalfWidth
				);
		}


		if (
			x < -usableHalfWidth ||
			x > usableHalfWidth ||
			y < -usableHalfWidth ||
			y > usableHalfWidth
		) {

			continue;
		}


		let valid =
			true;


		for (
			const feature
			of terrainFeatures
		) {

			const distance =
				distanceBetween(

					x,
					y,

					feature.x,
					feature.y
				);


			if (
				distance <
				minimumSeparation
			) {

				valid =
					false;

				break;
			}
		}


		if (valid) {

			return {
				x,
				y
			};
		}
	}


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

function generateMountains() {

	const minimumSeparation =
		terrainSideMetres *
		0.12;


	for (
		let i = 0;
		i < terrainConfig.numberMountains;
		i++
	) {

		const position =
			findFeaturePosition(
				minimumSeparation
			);


		const height =
			randomRange(

				terrainConfig.elevationGrid *
				0.40,

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

function generateValleys() {

	const minimumSeparation =
		terrainSideMetres *
		0.08;


	const mountains =
		terrainFeatures.filter(
			feature =>
				feature.type ===
				"mountain"
		);


	for (
		let i = 0;
		i < terrainConfig.numberValleys;
		i++
	) {

		let referenceMountain =
			null;


		if (
			mountains.length > 0
		) {

			referenceMountain =
				mountains[
					Math.floor(
						random() *
						mountains.length
					)
				];
		}


		const position =
			findFeaturePosition(

				minimumSeparation,

				referenceMountain
			);


		const depth =
			randomRange(

				terrainConfig.elevationGrid *
					0.15,

				terrainConfig.elevationGrid *
					0.50
			);


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
					0.06,

				terrainSideMetres *
					0.20
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

function gaussianFeature(
	x,
	y,
	feature
) {

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

function regionalTerrain(
	x,
	y
) {

	const scale =
		terrainSideMetres;


	const normalizedX =
		x /
		scale;


	const normalizedY =
		y /
		scale;


	const wave1 =

		Math.sin(
			normalizedX *
			Math.PI *
			2.1
		)

		*

		Math.cos(
			normalizedY *
			Math.PI *
			1.7
		);


	const wave2 =

		Math.sin(

			(
				normalizedX +

				normalizedY *
				0.65
			)

			*

			Math.PI *
			3.2
		);


	const wave3 =

		Math.cos(

			(
				normalizedX *
					0.45 -

				normalizedY
			)

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
) {

	const scale =
		terrainSideMetres;


	const normalizedX =
		x /
		scale;


	const normalizedY =
		y /
		scale;


	const variation1 =

		Math.sin(

			normalizedX *
			Math.PI *
			11.0

			+

			normalizedY *
			Math.PI *
			4.0
		);


	const variation2 =

		Math.cos(

			normalizedX *
			Math.PI *
			6.5

			-

			normalizedY *
			Math.PI *
			9.0
		);


	const variation3 =

		Math.sin(

			(
				normalizedX *
					0.35 +

				normalizedY *
					0.85
			)

			*

			Math.PI *
			15.0
		);


	return (

		variation1 *
			terrainConfig.elevationGrid *
			0.012

		+

		variation2 *
			terrainConfig.elevationGrid *
			0.012

		+

		variation3 *
			terrainConfig.elevationGrid *
			0.006
	);
}


/* ========================================================================== */
/* CALCULATE TERRAIN ELEVATION                                                */
/* ========================================================================== */

function terrainElevation(
	x,
	y
) {

	let elevation =
		0;


	elevation +=
		regionalTerrain(
			x,
			y
		);


	for (
		const feature
		of terrainFeatures
	) {

		elevation +=
			gaussianFeature(
				x,
				y,
				feature
			);
	}


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

function generateTerrainFeatures() {

	terrainFeatures.length =
		0;


	generateMountains();


	generateValleys();
}


/* ========================================================================== */
/* GENERATE ELEVATION GRID                                                    */
/* ========================================================================== */

function generateElevationGrid() {

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


	for (
		let row = 0;
		row < detail;
		row++
	) {

		const normalizedY =
			row /
			(detail - 1);


		const y =

			halfTerrainMetres

			-

			normalizedY *
			terrainSideMetres;


		for (
			let column = 0;
			column < detail;
			column++
		) {

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


	const rawRelief =
		maximumElevation -
		minimumElevation;


	if (
		!Number.isFinite(rawRelief) ||
		rawRelief <= 0
	) {

		elevationGrid.fill(
			0
		);


		return {

			grid:
				elevationGrid,

			minimumRawElevation:
				minimumElevation,

			maximumRawElevation:
				maximumElevation,

			relief:
				0
		};
	}


	/* ====================================================================== */
	/* NORMALIZE FINAL TERRAIN                                                */
	/* ====================================================================== */

	for (
		let i = 0;
		i < elevationGrid.length;
		i++
	) {

		elevationGrid[i] =

			(
				elevationGrid[i] -
				minimumElevation
			)

			/

			rawRelief

			*

			terrainConfig.elevationGrid;
	}


	return {

		grid:
			elevationGrid,

		minimumRawElevation:
			minimumElevation,

		maximumRawElevation:
			maximumElevation,

		relief:
			terrainConfig.elevationGrid
	};
}


/* ========================================================================== */
/* COPY TERRAIN FEATURES                                                      */
/* ========================================================================== */

function copyTerrainFeatures() {

	return terrainFeatures.map(

		feature => ({

			type:
				feature.type,

			x:
				feature.x,

			y:
				feature.y,

			height:
				feature.height,

			sigmaX:
				feature.sigmaX,

			sigmaY:
				feature.sigmaY,

			rotation:
				feature.rotation
		})
	);
}


/* ========================================================================== */
/* PUBLIC TERRAIN GENERATOR                                                   */
/* ========================================================================== */

export function generateTerrainData() {

	validateConfiguration();


	initializeGenerationState();


	generateTerrainFeatures();


	const elevationData =
		generateElevationGrid();


	const features =
		copyTerrainFeatures();


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


	console.log(
		"Terrain detail:",
		`${terrainConfig.detail} x ${terrainConfig.detail}`
	);


	console.log(
		"Mountains:",
		terrainConfig.numberMountains
	);


	console.log(
		"Valleys:",
		terrainConfig.numberValleys
	);


	console.log(
		"Elevation range:",
		`0 - ${terrainConfig.elevationGrid} m`
	);


	console.table(

		features.map(

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

				zMetres:
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


	return {

		elevationGrid:
			elevationData.grid,

		detail:
			terrainConfig.detail,

		areaKm:
			terrainConfig.areaKm,

		elevationGridMax:
			terrainConfig.elevationGrid,

		minimumRawElevation:
			elevationData.minimumRawElevation,

		maximumRawElevation:
			elevationData.maximumRawElevation,

		relief:
			elevationData.relief,

		terrainSideKm,

		terrainSideMetres,

		features
	};
}


/* ========================================================================== */
/* END                                                                        */
/* ========================================================================== */
