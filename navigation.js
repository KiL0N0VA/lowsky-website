/* navigation = ROUTE VISUALIZATION */

import * as THREE from
    "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";



export function createNavigationPath(
    scene,
    path
) {


    const points =
        path.map(
            point =>
                new THREE.Vector3(
                    point.x,
                    point.y + 0.4,
                    point.z
                )
        );


    /* smooth path */

    const curve =
        new THREE.CatmullRomCurve3(
            points
        );


    const smoothPoints =
        curve.getPoints(
            500
        );


    const geometry =
        new THREE.BufferGeometry()
        .setFromPoints(
            smoothPoints
        );


    const material =
        new THREE.LineDashedMaterial({

            color: 0xFFD15A,

            dashSize: 1.4,

            gapSize: 0.8,

            linewidth: 1

        });


    const line =
        new THREE.Line(
            geometry,
            material
        );


    line.computeLineDistances();


    scene.add(line);



    /* =====================================================
       NAVIGATION ARROW
       ===================================================== */


    const arrowGeometry =
        new THREE.ConeGeometry(
            1.2,
            3.5,
            3
        );


    arrowGeometry.rotateX(
        Math.PI / 2
    );


    const arrowMaterial =
        new THREE.MeshBasicMaterial({

            color: 0xFFD15A

        });


    const arrow =
        new THREE.Mesh(
            arrowGeometry,
            arrowMaterial
        );


    scene.add(arrow);



    return {

        curve,
	line,
        arrow

    };

}



/* =========================================================
   UPDATE ARROW
   ========================================================= */


export function updateNavigationArrow(
    navigation,
    elapsedTime
) {


    const speed =
        0.025;


    const progress =
        (
            elapsedTime *
            speed
        ) % 1;


    const position =
        navigation.curve
        .getPointAt(
            progress
        );


    const nextPosition =
        navigation.curve
        .getPointAt(
            Math.min(
                progress + 0.002,
                1
            )
        );


    navigation.arrow.position.copy(
        position
    );


    navigation.arrow.position.y +=
        1.2;


    navigation.arrow.lookAt(
        nextPosition
    );

}