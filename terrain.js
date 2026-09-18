/* terrain.js = TOPOGRAPHIC GENERATION */


/* =========== DEFAULT TERRAIN PARAMETERS ===================================================================================================== */

export const DEFAULT_TERRAIN_SIZE = 120;
export const DEFAULT_TERRAIN_SEG = 100;


/* =========== TERRAIN CONFIGURATION ========================================================================================================== */

let terrainConfig = {

	size: DEFAULT_TERRAIN_SIZE,
	segments: DEFAULT_TERRAIN_SEG,
	latitude: 51.1784,
	longitude: -115.5708,
	areaKM: 10,
	verticalScale: 1.0

};


/* =========== CONFIGURE TERRAIN ============================================================================================================== */

export function configureTerrain(config = {}) {

	if (Number.isFinite(config.terrainSize)) {
		terrainConfig.size = config.terrainSize;
	}

	if (Number.isFinite(config.terrainResolution)) {
		terrainConfig.segments = config.terrainResolution;
	}

	if (Number.isFinite(config.latitude)) {
		terrainConfig.latitude = config.latitude;
	}

	if (Number.isFinite(config.longitude)) {
		terrainConfig.longitude = config.longitude;
	}

	if (Number.isFinite(config.areaKM)) {
		terrainConfig.areaKM = config.areaKM;
	}

	if (Number.isFinite(config.verticalScale)) {
		terrainConfig.verticalScale = config.verticalScale;
	}

}


/* =========== GET TERRAIN CONFIGURATION ====================================================================================================== */

export function getTerrainConfig() {

	return { ...terrainConfig };

}


/* =========== GET TERRAIN SIZE =============================================================================================================== */

export function getTerrainSize() {

	return terrainConfig.size;

}


/* =========== GET TERRAIN SEGMENTS =========================================================================================================== */

export function getTerrainSegments() {

	return terrainConfig.segments;

}


/* =========== TOPOGRAPHIC HEIGHT FUNCTION ==================================================================================================== */

export function getTerrainHeight(x, z) {

	let height = 0;


	/* GENERAL GROUND */

	height +=
		Math.sin(x * 0.055) *
		Math.cos(z * 0.045) *
		9;


	/* HILLS */

	height +=
		Math.sin((x + z) * 0.11) *
		3.5;

	height +=
		Math.cos(x * 0.17) *
		Math.sin(z * 0.13) *
		2.0;


	/* MOUNTAINS */

	height += gaussianMount(
		x,
		z,
		-25,
		-15,
		20,
		22
	);

	height += gaussianMount(
		x,
		z,
		25,
		10,
		17,
		26
	);

	height += gaussianMount(
		x,
		z,
		5,
		35,
		14,
		20
	);


	return height * terrainConfig.verticalScale;

}


/* =========== GAUSSIAN MOUNTAIN ============================================================================================================== */

function gaussianMount(
	x,
	z,
	centerX,
	centerZ,
	radius,
	height
) {

	const dx =
		x - centerX;

	const dz =
		z - centerZ;

	const distanceSquared =
		dx * dx + dz * dz;


	return height *
		Math.exp(
			-distanceSquared /
			(2 * radius * radius)
		);

}
