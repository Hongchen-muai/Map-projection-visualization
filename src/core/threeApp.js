import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as topojson from 'topojson-client';

let scene, camera, renderer, controls;
let animationFrameId;

let earthGroup = new THREE.Group();     
let cylinderGroup = new THREE.Group();  
let glassCylinder;                      
let raysGroup = new THREE.Group();      

const R_EARTH = 5;      
let R_CYLINDER = 5.0; 

let currentProjType = 'cylinder';
let currentVariant = 'conformal';
let currentSecantLat = 0;
let cachedLandData = null;
let currentAnimStep = 0;

export let projLon = 0;
export let projLat = 0;
export let currentDragMode = 'camera'; // 'camera', 'earth', 'plane'

export function setDragMode(mode) {
  currentDragMode = mode;
  if (controls) {
    controls.enabled = (mode === 'camera');
  }
}

function rotateLonLat(lon, lat) {
  const lambda = lon * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  const p = new THREE.Vector3(
    Math.cos(phi) * Math.sin(lambda),
    Math.sin(phi),
    Math.cos(phi) * Math.cos(lambda)
  );
  
  const euler = new THREE.Euler(-projLat * Math.PI/180, -projLon * Math.PI/180, 0, 'YXZ');
  p.applyEuler(euler);
  
  const newLat = Math.asin(Math.max(-1, Math.min(1, p.y))) * 180 / Math.PI;
  const newLon = Math.atan2(p.x, p.z) * 180 / Math.PI;
  return { lon: newLon, lat: newLat };
}

export function updateProjectionData() {
  if (cachedLandData) {
    clearGeometry();
    drawGeoJSON(cachedLandData);
    fastForwardToStep(currentAnimStep);
    applyVisualRotation();
  }
}

function applyVisualRotation() {
  // If 'plane' mode, Earth is North-up, Cylinder tilts.
  // If 'earth' mode, Cylinder is upright, Earth tilts.
  const geoRot = new THREE.Euler(-projLat * Math.PI/180, -projLon * Math.PI/180, 0, 'YXZ');
  const q = new THREE.Quaternion().setFromEuler(geoRot);
  const qInv = q.clone().invert();

  if (currentDragMode === 'plane') {
    earthGroup.quaternion.copy(qInv);
    cylinderGroup.quaternion.copy(qInv);
    raysGroup.quaternion.copy(qInv);
    if (glassCylinder) glassCylinder.quaternion.copy(qInv);
  } else {
    earthGroup.quaternion.identity();
    cylinderGroup.quaternion.identity();
    raysGroup.quaternion.identity();
    if (glassCylinder) glassCylinder.quaternion.identity();
  }
}

export function updateProjectionMode(type, variant, secantLat) {
  currentProjType = type;
  currentVariant = variant;
  currentSecantLat = secantLat;

  if (type === 'cylinder') {
    R_CYLINDER = R_EARTH * Math.cos(secantLat * Math.PI / 180);
  } else if (type === 'conic') {
    R_CYLINDER = R_EARTH * Math.cos(secantLat * Math.PI / 180);
  } else {
    R_CYLINDER = R_EARTH; 
  }

  if (glassCylinder) {
    glassCylinder.geometry.dispose();
    if (type === 'cylinder') {
      glassCylinder.geometry = new THREE.CylinderGeometry(R_CYLINDER * 1.01, R_CYLINDER * 1.01, 30, 64, 1, true);
    } else if (type === 'conic') {
      const phi0 = Math.max(0.1, Math.abs(secantLat)) * Math.PI / 180;
      const R_OUTER = R_EARTH * 1.01;
      const y_vertex = R_OUTER / Math.sin(phi0);
      const y_base = -R_OUTER; 
      const h = y_vertex - y_base;
      const r = h * Math.tan(phi0);
      
      glassCylinder.geometry = new THREE.ConeGeometry(r, h, 64, 1, true);
      const yOffset = secantLat >= 0 ? (y_base + h / 2) : -(y_base + h / 2);
      glassCylinder.geometry.translate(0, yOffset, 0);
      if (secantLat < 0) glassCylinder.geometry.rotateX(Math.PI);
    } else {
      let geo = new THREE.PlaneGeometry(30, 30, 8, 8);
      geo.rotateX(-Math.PI / 2);
      const planeZ = R_EARTH * Math.sin(secantLat * Math.PI / 180);
      geo.translate(0, planeZ, 0);
      glassCylinder.geometry = geo;
    }
  }

  if (cachedLandData) {
    clearGeometry();
    drawGeoJSON(cachedLandData);
    fastForwardToStep(currentAnimStep);
    applyVisualRotation();
  }
}

function clearGeometry() {
  while (earthGroup.children.length > 1) { // Keep the sphere
    earthGroup.remove(earthGroup.children[earthGroup.children.length - 1]);
  }
  while (cylinderGroup.children.length > 0) {
    cylinderGroup.remove(cylinderGroup.children[0]);
  }
  while (raysGroup.children.length > 0) {
    raysGroup.remove(raysGroup.children[0]);
  }
  // No longer destroying glassCylinder here, so we can update it dynamically
}

  const createUnfoldMaterial = (colorHex, isInvariant = false) => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uProject: { value: 0.0 },                     
        uUnfold: { value: 0.0 },                      
        uColor: { value: new THREE.Color(colorHex) }, 
        uOpacity: { value: 0.0 }                      
      },
      vertexShader: `
        uniform float uProject;
        uniform float uUnfold;
        attribute vec3 spherePos;
        varying float vAlphaFactor;
        
        void main() {
          vec3 cylPos = position;
          vec3 flatPos;
          
          ${currentProjType === 'cylinder' ? `
            float angle = atan(cylPos.x, cylPos.z);
            float flatX = angle * ${R_CYLINDER.toFixed(2)};
            flatPos = vec3(flatX, cylPos.y, 0.0);
          ` : currentProjType === 'conic' ? `
            float n = sin(${Math.max(0.1, Math.abs(currentSecantLat)) * Math.PI / 180});
            float r_cone = length(vec2(cylPos.x, cylPos.z));
            float rho = r_cone / n;
            float theta = atan(cylPos.x, cylPos.z) * n;
            // Shift the apex up so the map is somewhat centered
            float y_shift = ${R_EARTH.toFixed(2)} / n;
            flatPos = vec3(rho * sin(theta), y_shift - rho * cos(theta), 0.0);
          ` : `
            flatPos = vec3(cylPos.x, cylPos.z, 0.0);
          `}
          
          vec3 stage1Pos = mix(spherePos, cylPos, uProject);
          vec3 finalPos = mix(stage1Pos, flatPos, uUnfold);
          
          // Calculate normal for edge fading based on projection shape
          vec3 normalDir;
          ${currentProjType === 'cylinder' ? `
            normalDir = normalize(vec3(cylPos.x, 0.0, cylPos.z));
          ` : currentProjType === 'conic' ? `
            normalDir = normalize(vec3(cylPos.x, 0.0, cylPos.z)); // Edge fade uses horizontal plane
          ` : `
            normalDir = vec3(0.0, 1.0, 0.0);
          `}
          
          // Only apply edge fading in 3D (uProject > 0.0, uUnfold < 1.0)
          vec3 viewDir = normalize(cameraPosition - (modelMatrix * vec4(stage1Pos, 1.0)).xyz);
          vec3 worldNormal = normalize((modelMatrix * vec4(normalDir, 0.0)).xyz);
          float dotView = dot(worldNormal, viewDir);
          
          // Map dot product from [-0.1, 0.2] to [0.0, 1.0] for smooth edge fade
          float edgeAlpha = smoothstep(-0.1, 0.2, dotView);
          
          // When uProject is 0 (on sphere), use sphere normal for fading
          vec3 sphereNormal = normalize((modelMatrix * vec4(spherePos, 0.0)).xyz);
          float sphereDot = dot(sphereNormal, viewDir);
          float sphereAlpha = smoothstep(-0.1, 0.2, sphereDot);
          
          float currentAlpha = mix(sphereAlpha, edgeAlpha, uProject);
          vAlphaFactor = mix(currentAlpha, 1.0, uUnfold);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlphaFactor;
        void main() {
          gl_FragColor = vec4(uColor, uOpacity * vAlphaFactor);
        }
      `,
      transparent: true,
      depthTest: false, // Turn off depth test to prevent Z-fighting with Earth
      depthWrite: false,
      linewidth: isInvariant ? 2 : 1
    });
  };

export function initScene(container) {
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 5, 25);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  scene.add(earthGroup);
  scene.add(cylinderGroup);
  scene.add(raysGroup);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 15);
  scene.add(dirLight);

  const sphereGeo = new THREE.SphereGeometry(R_EARTH * 0.98, 64, 64);
  const sphereMat = new THREE.MeshPhongMaterial({ 
    color: 0xfdfbf7, 
    transparent: true, 
    opacity: 0.9,
    shininess: 30
  });
  earthGroup.add(new THREE.Mesh(sphereGeo, sphereMat));

  let isDragging = false;
  let prevMouse = { x: 0, y: 0 };

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (currentDragMode === 'camera') return;
    isDragging = true;
    prevMouse = { x: e.clientX, y: e.clientY };
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!isDragging || currentDragMode === 'camera') return;
    const deltaX = e.clientX - prevMouse.x;
    const deltaY = e.clientY - prevMouse.y;
    prevMouse = { x: e.clientX, y: e.clientY };

    projLon -= deltaX * 0.5;
    projLat += deltaY * 0.5;
    projLat = Math.max(-85, Math.min(85, projLat));

    if (projLon > 180) projLon -= 360;
    if (projLon < -180) projLon += 360;

    updateProjectionData(); 
    
    if (onRotationChange) {
      onRotationChange({ lon: projLon, lat: projLat });
    }
  });

  window.addEventListener('pointerup', () => { isDragging = false; });

  loadGeoJSON();

  const resizeObserver = new ResizeObserver(() => onWindowResize(container));
  resizeObserver.observe(container);
  animate();
}

function lonLatToSphere(lon, lat, R) {
  const phi = lat * (Math.PI / 180);
  const lambda = lon * (Math.PI / 180);
  return new THREE.Vector3(
    R * Math.cos(phi) * Math.sin(lambda),
    R * Math.sin(phi),
    R * Math.cos(phi) * Math.cos(lambda)
  );
}

function lonLatToMercatorCylinder(lon, lat, R) {
  const lambda = lon * (Math.PI / 180);
  const phi = lat * (Math.PI / 180);
  const cosSec = Math.cos(currentSecantLat * Math.PI / 180);
  let y = 0;
  
  if (currentVariant === 'conformal') {
    const clampedLat = Math.max(-85, Math.min(85, lat));
    const clampedPhi = clampedLat * (Math.PI / 180);
    y = R_EARTH * cosSec * Math.log(Math.tan(Math.PI / 4 + clampedPhi / 2));
  } else {
    y = R_EARTH * Math.sin(phi) / cosSec;
  }
  return new THREE.Vector3(R * Math.sin(lambda), y, R * Math.cos(lambda));
}

function lonLatToConic(lon, lat, R) {
  const lambda = lon * (Math.PI / 180);
  const phi = lat * (Math.PI / 180);
  const phi0 = Math.max(0.1, Math.abs(currentSecantLat)) * (Math.PI / 180);
  const n = Math.sin(phi0);
  const F = Math.cos(phi0) * Math.pow(Math.tan(Math.PI/4 + phi0/2), n) / n;
  
  let rho;
  if (currentVariant === 'conformal') {
    const clampedLat = Math.max(-85, Math.min(85, lat));
    const clampedPhi = clampedLat * (Math.PI / 180);
    rho = R * F / Math.pow(Math.tan(Math.PI/4 + clampedPhi/2), n);
  } else {
    const C = Math.pow(Math.cos(phi0), 2) + 2 * n * Math.sin(phi0);
    rho = R * Math.sqrt(C - 2 * n * Math.sin(phi)) / n;
  }
  
  const theta = n * lambda;
  // Position on cone:
  // r_cone = rho * sin(phi0)
  // y_cone = rho * cos(phi0)
  const r_cone = rho * Math.sin(phi0);
  const y_cone = R / Math.sin(phi0) - rho * Math.cos(phi0);
  
  return new THREE.Vector3(r_cone * Math.sin(theta), currentSecantLat >= 0 ? y_cone : -y_cone, r_cone * Math.cos(theta));
}
function lonLatToPlane(lon, lat, R) {
  // Simple tangent plane at North Pole for visual representation of planar projection
  const lambda = lon * (Math.PI / 180);
  const phi = lat * (Math.PI / 180);
  let r = 0;
  
  // Cut plane distance
  const planeZ = R_EARTH * Math.sin(currentSecantLat * Math.PI / 180);

  if (currentVariant === 'conformal') {
    // Stereographic
    const clampedLat = Math.max(-85, lat);
    const clampedPhi = clampedLat * (Math.PI / 180);
    r = R_EARTH * Math.tan(Math.PI / 4 - clampedPhi / 2) * 2; 
  } else {
    // Equal Area
    r = R_EARTH * Math.sin(Math.PI / 4 - phi / 2) * 2;
  }
  
  return new THREE.Vector3(r * Math.sin(lambda), planeZ, r * Math.cos(lambda));
}

function loadGeoJSON() {
  fetch('https://unpkg.com/world-atlas@2.0.2/land-110m.json')
    .then(res => res.json())
    .then(data => {
      const land = topojson.feature(data, data.objects.land);
      cachedLandData = land;
      drawGeoJSON(land);
    });
}

function drawGeoJSON(land) {
  drawGraticule();

  land.features.forEach(feature => {
    if (feature.geometry.type === 'Polygon') {
      drawRegion(feature.geometry.coordinates);
    } else if (feature.geometry.type === 'MultiPolygon') {
      feature.geometry.coordinates.forEach(poly => drawRegion(poly));
    }
  });

  // Draw invariant lines (standard parallels)
  if (currentSecantLat > 0) {
    drawInvariantLine(currentSecantLat);
    if (currentProjType === 'cylinder') drawInvariantLine(-currentSecantLat);
  } else if (currentProjType === 'cylinder') {
    drawInvariantLine(0);
  }
}

function drawGraticule() {
  // Latitudes
  for (let lat = -80; lat <= 80; lat += 20) {
    let spherePts = [];
    let cylPts = [];
    for (let rawLon = -180; rawLon <= 180; rawLon += 5) {
      const { lon: rotatedLon, lat: rotatedLat } = rotateLonLat(rawLon, lat);
      spherePts.push(lonLatToSphere(rotatedLon, rotatedLat, R_EARTH));
      
      let targetP;
      if (currentProjType === 'cylinder') targetP = lonLatToMercatorCylinder(rotatedLon, rotatedLat, R_CYLINDER);
      else if (currentProjType === 'conic') targetP = lonLatToConic(rotatedLon, rotatedLat, R_EARTH);
      else targetP = lonLatToPlane(rotatedLon, rotatedLat, R_EARTH);
      cylPts.push(targetP);
    }
    addGraticuleLine(spherePts, cylPts);
  }
  // Longitudes
  for (let lon = -180; lon < 180; lon += 30) {
    let spherePts = [];
    let cylPts = [];
    for (let rawLat = -80; rawLat <= 80; rawLat += 5) {
      const { lon: rotatedLon, lat: rotatedLat } = rotateLonLat(lon, rawLat);
      spherePts.push(lonLatToSphere(rotatedLon, rotatedLat, R_EARTH));
      
      let targetP;
      if (currentProjType === 'cylinder') targetP = lonLatToMercatorCylinder(rotatedLon, rotatedLat, R_CYLINDER);
      else if (currentProjType === 'conic') targetP = lonLatToConic(rotatedLon, rotatedLat, R_EARTH);
      else targetP = lonLatToPlane(rotatedLon, rotatedLat, R_EARTH);
      cylPts.push(targetP);
    }
    addGraticuleLine(spherePts, cylPts);
  }
}

function addGraticuleLine(spherePts, cylPts) {
  const sphereGeo = new THREE.BufferGeometry().setFromPoints(spherePts);
  const sphereMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.2 });
  earthGroup.add(new THREE.Line(sphereGeo, sphereMat));

  const cylGeo = new THREE.BufferGeometry().setFromPoints(cylPts);
  const sphereCoords = new Float32Array(spherePts.length * 3);
  spherePts.forEach((p, i) => {
    sphereCoords[i*3] = p.x; sphereCoords[i*3+1] = p.y; sphereCoords[i*3+2] = p.z;
  });
  cylGeo.setAttribute('spherePos', new THREE.BufferAttribute(sphereCoords, 3));

  const cylMat = createUnfoldMaterial(0x94a3b8, false); 
  const cylLine = new THREE.Line(cylGeo, cylMat);
  cylLine.visible = false;
  cylLine.frustumCulled = false;
  cylLine.userData = { isGraticule: true };
  cylinderGroup.add(cylLine);
}

function drawInvariantLine(lat) {
  let spherePts = [];
  let cylPts = [];
  for (let rawLon = -180; rawLon <= 180; rawLon += 5) {
    const lon = rawLon;
    spherePts.push(lonLatToSphere(lon, lat, R_EARTH));
    
    let targetP;
    if (currentProjType === 'cylinder') targetP = lonLatToMercatorCylinder(lon, lat, R_CYLINDER);
    else if (currentProjType === 'conic') targetP = lonLatToConic(lon, lat, R_EARTH);
    else targetP = lonLatToPlane(lon, lat, R_EARTH);
    cylPts.push(targetP);
  }
  
  const cylGeo = new THREE.BufferGeometry().setFromPoints(cylPts);
  const sphereCoords = new Float32Array(spherePts.length * 3);
  spherePts.forEach((p, i) => {
    sphereCoords[i*3] = p.x; sphereCoords[i*3+1] = p.y; sphereCoords[i*3+2] = p.z;
  });
  cylGeo.setAttribute('spherePos', new THREE.BufferAttribute(sphereCoords, 3));
  
  const cylMat = createUnfoldMaterial(0xd92d20, true);
  const cylLine = new THREE.Line(cylGeo, cylMat);
  cylLine.visible = false;
  cylLine.frustumCulled = false;
  cylLine.userData = { isInvariant: true };
  cylinderGroup.add(cylLine);
}

function drawRegion(coordinates) {
  let spherePoints = [];
  let cylinderPoints = [];

  const flushLines = () => {
    if (spherePoints.length > 1) {
      const sphereGeo = new THREE.BufferGeometry().setFromPoints(spherePoints);
      const sphereMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
      earthGroup.add(new THREE.Line(sphereGeo, sphereMat));

      const cylinderGeo = new THREE.BufferGeometry().setFromPoints(cylinderPoints);
      const sphereCoords = new Float32Array(spherePoints.length * 3);
      spherePoints.forEach((p, i) => {
        sphereCoords[i*3] = p.x; sphereCoords[i*3+1] = p.y; sphereCoords[i*3+2] = p.z;
      });
      cylinderGeo.setAttribute('spherePos', new THREE.BufferAttribute(sphereCoords, 3));

      const cylMat = createUnfoldMaterial(0x475569); 
      const cylLine = new THREE.Line(cylinderGeo, cylMat);
      cylLine.visible = false; 
      cylLine.frustumCulled = false; // FINALLY FIXED RENDER CROPPING IN STEP 2
      cylinderGroup.add(cylLine);

      for (let i = 0; i < spherePoints.length; i += 15) {
        const cylP = cylinderPoints[i];
        const sphP = spherePoints[i];
        
        let rayStart = new THREE.Vector3(0, 0, 0);
        if (currentProjType === 'cylinder' && currentVariant !== 'conformal') {
          rayStart.set(0, sphP.y, 0); 
        }

        const localCylP = cylP.clone().sub(rayStart);
        const localSphP = sphP.clone().sub(rayStart);

        const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), localCylP]);
        const rayMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0 });
        const rayLine = new THREE.Line(rayGeo, rayMat);
        rayLine.position.copy(rayStart);
        
        const initScale = localCylP.length() > 0.01 ? localSphP.length() / localCylP.length() : 1.0;
        rayLine.scale.set(initScale, initScale, initScale);
        rayLine.userData = { initScale: initScale };
        
        rayLine.frustumCulled = false;
        raysGroup.add(rayLine);
      }
    }
    spherePoints = [];
    cylinderPoints = [];
  };

  let prevLon = null;
  coordinates[0].forEach(coord => {
    const rawLon = coord[0];
    const rawLat = coord[1];
    
    // Apply oblique rotation if needed
    const rotated = rotateLonLat(rawLon, rawLat);
    const lon = rotated.lon;
    const lat = rotated.lat;

    const p = lonLatToSphere(lon, lat, R_EARTH);
    
    // For rendering continuous lines across the antimeridian, we just skip drawing if distance is too large
    if (prevLon !== null && Math.abs(lon - prevLon) > 100) {
      flushLines();
    }
    prevLon = lon;

    spherePoints.push(p);
    
    let targetP;
    if (currentProjType === 'cylinder') targetP = lonLatToMercatorCylinder(lon, lat, R_CYLINDER);
    else if (currentProjType === 'conic') targetP = lonLatToConic(lon, lat, R_EARTH);
    else targetP = lonLatToPlane(lon, lat, R_EARTH);
    cylinderPoints.push(targetP);
  });
  flushLines();
}

// MAKE STEPS REPEATABLE AND REVERSIBLE
let lightSourceGroup = null;

function createLightSourceMarkers() {
  if (lightSourceGroup) {
    scene.remove(lightSourceGroup);
    lightSourceGroup = null;
  }
  
  lightSourceGroup = new THREE.Group();
  scene.add(lightSourceGroup);
  
  // Point light source marker (for conic/conformal variants - from sphere center)
  if (currentProjType === 'conic' || currentVariant === 'conformal') {
    const pointGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const pointMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const pointMesh = new THREE.Mesh(pointGeo, pointMat);
    
    if (currentProjType === 'cylinder') {
      // For cylinder, point source is at center of sphere
      pointMesh.position.set(0, 0, 0);
    } else if (currentProjType === 'conic') {
      // For conic, point source is at the cone apex
      const phi0 = Math.max(0.1, Math.abs(currentSecantLat)) * Math.PI / 180;
      const y_vertex = R_EARTH / Math.sin(phi0);
      pointMesh.position.set(0, currentSecantLat >= 0 ? y_vertex : -y_vertex, 0);
    } else if (currentProjType === 'azimuthal') {
      // For azimuthal, point source is at antipodal point
      const planeZ = R_EARTH * Math.sin(currentSecantLat * Math.PI / 180);
      pointMesh.position.set(0, -planeZ, 0);
    }
    lightSourceGroup.add(pointMesh);
  } else if (currentProjType === 'cylinder' && currentVariant === 'equalArea') {
    // Line light source - create a vertical line along Y axis
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -15, 0),
      new THREE.Vector3(0, 15, 0)
    ]);
    const lineMat = new THREE.LineDashedMaterial({ 
      color: 0x000000, 
      dashSize: 0.5, 
      gapSize: 0.3 
    });
    lineMat.computeLineDistances();
    const lineMesh = new THREE.Line(lineGeo, lineMat);
    lightSourceGroup.add(lineMesh);
    
    // Add small spheres to show it's a "bar" of light
    const smallSphereGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const smallSphereMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    [-10, 0, 10].forEach(y => {
      const dot = new THREE.Mesh(smallSphereGeo, smallSphereMat);
      dot.position.set(0, y, 0);
      lightSourceGroup.add(dot);
    });
  } else if (currentProjType === 'azimuthal' && currentVariant === 'equalArea') {
    // For azimuthal equal-area, it's a mathematical projection (not a simple point)
    // Draw a horizontal circle to represent equal-area property
    const ringGeo = new THREE.RingGeometry(0.3, 0.35, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    const planeZ = R_EARTH * Math.sin(currentSecantLat * Math.PI / 180);
    ring.position.set(0, -planeZ, 0);
    lightSourceGroup.add(ring);
  }
}

export function step1_wrapCylinder() {
  currentAnimStep = 1;
  createLightSourceMarkers();
  
  if (!glassCylinder) {
    let geometry;
    if (currentProjType === 'cylinder') {
      geometry = new THREE.CylinderGeometry(R_CYLINDER * 1.01, R_CYLINDER * 1.01, 30, 64, 1, true);
    } else if (currentProjType === 'conic') {
      const phi0 = Math.max(0.1, Math.abs(currentSecantLat)) * Math.PI / 180;
      const R_OUTER = R_EARTH * 1.01;
      const y_vertex = R_OUTER / Math.sin(phi0);
      const y_base = -R_OUTER; 
      const h = y_vertex - y_base;
      const r = h * Math.tan(phi0);
      
      geometry = new THREE.ConeGeometry(r, h, 64, 1, true);
      const yOffset = currentSecantLat >= 0 ? (y_base + h / 2) : -(y_base + h / 2);
      geometry.translate(0, yOffset, 0);
      if (currentSecantLat < 0) geometry.rotateX(Math.PI);
    } else {
      // Plane
      geometry = new THREE.PlaneGeometry(30, 30, 8, 8);
      geometry.rotateX(-Math.PI / 2);
      const planeZ = R_EARTH * Math.sin(currentSecantLat * Math.PI / 180);
      geometry.translate(0, planeZ, 0);
    }
    
    const material = new THREE.MeshPhongMaterial({
      color: 0x94a3b8, transparent: true, opacity: 0, side: THREE.DoubleSide, shininess: 100
    });
    glassCylinder = new THREE.Mesh(geometry, material);
    scene.add(glassCylinder);
  }
  
  // Revert states
  cylinderGroup.children.forEach(child => {
    if (child.material && child.material.uniforms) {
      gsap.to(child.material.uniforms.uUnfold, { value: 0.0, duration: 1.5, ease: "power2.inOut" });
      gsap.to(child.material.uniforms.uProject, { value: 0.0, duration: 1.5, ease: "power2.inOut" });
      gsap.to(child.material.uniforms.uOpacity, { value: 0.0, duration: 1.0 });
    }
  });

  raysGroup.children.forEach(ray => {
    gsap.to(ray.scale, { x: ray.userData.initScale, y: ray.userData.initScale, z: ray.userData.initScale, duration: 1.5 });
    gsap.to(ray.material, { opacity: 0, duration: 1.0 });
  });

  earthGroup.children.forEach(mesh => {
    if (mesh.material) gsap.to(mesh.material, { opacity: 0.9, duration: 1.5 });
  });

  gsap.to(camera.position, { x: 15, y: 10, z: 25, duration: 2, ease: "power2.out" });
  gsap.to(glassCylinder.material, { opacity: 0.15, duration: 1.5 });
}

export function step2_projectRays() {
  currentAnimStep = 2;
  cylinderGroup.children.forEach(child => {
    if (child.material && child.material.uniforms) {
      child.visible = true;
      const isGrat = child.userData && child.userData.isGraticule;
      const targetOp = isGrat ? 0.3 : 1.0;
      gsap.to(child.material.uniforms.uOpacity, { value: targetOp, duration: 0.5 });
      gsap.to(child.material.uniforms.uProject, { value: 1.0, duration: 2.5, ease: "power2.inOut" });
      gsap.to(child.material.uniforms.uUnfold, { value: 0.0, duration: 2.0, ease: "power2.inOut" });
    }
  });

  raysGroup.children.forEach(ray => {
    gsap.to(ray.material, { opacity: 0.4, duration: 0.5 });
    gsap.to(ray.scale, { x: 1, y: 1, z: 1, duration: 2.5, ease: "power2.inOut" });
  });

  earthGroup.children.forEach(mesh => {
    if (mesh.material) gsap.to(mesh.material, { opacity: 0.25, duration: 2.5 });
  });

  if (glassCylinder) gsap.to(glassCylinder.material, { opacity: 0.15, duration: 1.5 });
  gsap.to(camera.position, { x: 15, y: 10, z: 25, duration: 2, ease: "power2.out" });
}

export function step3_unfoldMap() {
  currentAnimStep = 3;
  // glassCylinder opacity remains unchanged to keep the geometry frame visible
  raysGroup.children.forEach(ray => {
    gsap.to(ray.material, { opacity: 0, duration: 1 });
  });

  cylinderGroup.children.forEach(child => {
    if (child.material && child.material.uniforms) {
      gsap.to(child.material.uniforms.uUnfold, { value: 1.0, duration: 3, ease: "power2.inOut" });
      // fade out slowly to reveal purely the 2d map behind/below it
      gsap.to(child.material.uniforms.uOpacity, { value: 0.0, delay: 2.0, duration: 1.5 });
    }
  });
  
  gsap.to(camera.position, { x: 0, y: 0, z: 35, duration: 3, ease: "power2.inOut" });
}

function fastForwardToStep(step) {
  if (step >= 1) {
    if (glassCylinder) glassCylinder.material.opacity = 0.15;
    earthGroup.children.forEach(mesh => {
      if (mesh.material) mesh.material.opacity = (step >= 2) ? 0.25 : 0.9;
    });
  }
  
  if (step >= 2) {
    cylinderGroup.children.forEach(child => {
      if (child.material && child.material.uniforms) {
        child.visible = true;
        const isGrat = child.userData && child.userData.isGraticule;
        child.material.uniforms.uOpacity.value = (step === 3) ? 0.0 : (isGrat ? 0.3 : 1.0);
        child.material.uniforms.uProject.value = 1.0;
        child.material.uniforms.uUnfold.value = (step === 3) ? 1.0 : 0.0;
      }
    });
    raysGroup.children.forEach(ray => {
      ray.material.opacity = (step === 3) ? 0 : 0.4;
      ray.scale.set(1, 1, 1);
    });
  }
}

export let onRotationChange = null;
export function setRotationCallback(cb) { onRotationChange = cb; }

let extUpdating = false;

// EXPOSE ROTATION SETTER FOR TWO-WAY BINDING
export function setGlobeRotation(lon, lat) {
  extUpdating = true;
  projLon = lon;
  projLat = lat;
  updateProjectionData();
  
  requestAnimationFrame(() => { extUpdating = false; });
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  if (controls) {
    controls.update();
  }
  renderer.render(scene, camera);
}

function onWindowResize(container) {
  if (!container) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

export function destroyScene() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (renderer) renderer.dispose();
  if (controls) controls.dispose();
}
