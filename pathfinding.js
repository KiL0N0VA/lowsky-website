/* pathfinding = ROUTE FINDER */

import { getTerrainHeight, getTerrainSize, getTerrainSegments }
from "./terrain.js";

function getGridSize() {
	return getTerrainSegments()+1;
}

function getCellSize() {
	return(getTerrainSize()/getTerrainSegments());
}


function gridToWorld(x,z) {

	const terrainSize = getTerrainSize();
	const cellSize = getCellSize();

	return {
		x: -terrainSize/2+x*cellSize,
		z: -terrainSize/2+z*cellSize
	};
}

function getGridHeight(x,y) {

	const world = gridToWorld(x,z);
	return getTerrainHeight(world.x,world.z);

} 

function movementCost(x1,z1,x2,z2,settings) {

	const h1 = getGridHeight(x1,z1);
	const h2 = getGridHeight(x2,z2);
	const dx = x2-x1;
	const dz = z2-z1;

	const horizontalDistance = Math.sqrt(dx*dx+dz*dz)*getCellSize();
	const elevationChange = h2-h1;
	const slope = Math.abs(elevationChange/horizontalDistance);

	let cost = horizontalDistance;

/* SCORING & PENALTIES ====================================================================================================================== */

	cost += slope*setting.slopeWeight;

	if(elevationChange > 0) {
		cost += elevationChange*settings.uphillWeight;
	}

	if(slope > settings.maximumSlope) {
		cost += 500;
	}

	return cost;
}

function heuristic(x,y,endX,endZ) {

	const dx = endX-x;
	const dz = endZ-z;

	return Math.sqrt(dx*dx+dz*dz);
}

export function findPath(startX,startZ,endX,endZ,settings) {

	const open = [];
	const visited = new Set();
	const nodes = new Map();
	const startKey = `${startX},${startZ}`;
	const startNode = {
		x: startX,
		z: startZ,
		g: 0,
		h: heristic(startX,startZ,endX,endZ),
		parent: null
	};
	const GRID_SIZE = getGridSize();	

	startNode.f = startNode.g+startNode.h;
	open.push(startNode);
	nodes.set(startKey,startNode);
	
	const direction = [
		[1,0],
		[-1,0],
		[0,1],
		[0,-1],
		[1,1],
		[1,-1],
		[-1,1],
		[-1,-1]
	];
	
	while (open.length > 0) {

		open.sort((a,b)=>a.f-b.f);
		const current = open.shift();
		const currentKey = `${current.x},${current.z}`;
		
		if(current.x === endX && current.z === endZ) {

			return reconstructPath(current);

		}
	
		visited.add(currentKey);

		for(const[dx,dz] of directions) {

			const nx = current.x+dx;
			const nz = current.z+dz;

			if(nx < 0 || nz < 0 || nx >= GRID_SIZE || nz >= GRID_SIZE) {

				continue;
			}

			const key = `${nx},${nz}`;

			if(visited.has(key)) {

				continue;
			}
			
			const moveCost = movementCost(current.x,current.z,nx,nz,settings);
			const newG = current.g + moveCost;

			let node = nodes.get(key);

			if(!node) {

				node = {
					x: nx,
					z: nz,
					g: Infinity,
					h: heuristic(nx,nz,endX,endZ),
					
					parent: null
				};

				nodes.set(key,node);
			}

			if(newG < node.g) {

				node.g = newG;
				node.f = node.g+node.h;
				node.parent = current;
				if(!open.includes(node) {
					open.push(node);
				}
			}
		}
	}
	
	return [];

}

function reconstructPath(node) {
	const path = [];
	let current = node;
	
	while (current) {
		const world = gridToWorld(current.x,current.z);
		path.push( {
			x: world.x,
			y: getTerrainHeight(world.x,world.z),
			z: world.z
		});
	current = current.parent;
	}

	return path.reverse();

}
