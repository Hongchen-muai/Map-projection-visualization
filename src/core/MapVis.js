import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as topojson from 'topojson-client';
import gsap from 'gsap';

export class MapVis {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    // this.scene.fog = new THREE.FogExp2(0xFAFAFA, 0.02); // matches light theme

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 40);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;

    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);

    this.params = {
      morphProgress: 0.0,
      projectionType: 0.0, // 0: Equirectangular, 1: Mercator, 2: Mollweide
      standardParallel: 0.0,
      centralMeridian: 0.0,
      pointSize: 2.0
    };

    this.initShader();
    this.bindEvents();
    
    this.animate = this.animate.bind(this);
    this.animate();
  }

  initShader() {
    this.uniforms = {
      u_morphProgress: { value: this.params.morphProgress },
      u_projectionType: { value: this.params.projectionType },
      u_radius: { value: 10.0 },
      u_color: { value: new THREE.Color('#1A73E8') },
      u_pointSize: { value: this.params.pointSize * window.devicePixelRatio },
      u_time: { value: 0 }
    };

    const vertexShader = `
      uniform float u_morphProgress;
      uniform float u_projectionType;
      uniform float u_radius;
      uniform float u_pointSize;
      uniform float u_time;
      
      // position.x = lon (radians), position.y = lat (radians)
      
      #define PI 3.14159265359
      
      void main() {
        float lon = position.x;
        float lat = position.y;
        
        // 1. 3D Sphere Position
        vec3 pos3D;
        pos3D.x = u_radius * cos(lat) * cos(lon);
        pos3D.y = u_radius * sin(lat);
        pos3D.z = u_radius * cos(lat) * sin(lon);
        
        // 2. 2D Projection Position
        vec3 pos2D = vec3(0.0);
        
        if (u_projectionType < 0.5) {
          // Equirectangular
          pos2D.x = u_radius * lon;
          pos2D.y = u_radius * lat;
        } else if (u_projectionType < 1.5) {
          // Mercator
          pos2D.x = u_radius * lon;
          // Clamp latitude to avoid infinity
          float clampedLat = clamp(lat, -1.48, 1.48);
          pos2D.y = u_radius * log(tan(PI / 4.0 + clampedLat / 2.0));
        } else {
          // Mollweide (approximation for shader simplicity or sinusoidal)
          // Let's do Sinusoidal for simplicity as 2
          pos2D.x = u_radius * lon * cos(lat);
          pos2D.y = u_radius * lat;
        }
        
        // 3. Interpolate
        vec3 finalPos = mix(pos3D, pos2D, u_morphProgress);
        
        vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = u_pointSize * (20.0 / -mvPosition.z);
      }
    `;

    const fragmentShader = `
      uniform vec3 u_color;
      void main() {
        // simple point circle
        vec2 xy = gl_PointCoord.xy - vec2(0.5);
        float ll = length(xy);
        if(ll > 0.5) discard;
        
        // Anti-aliased circle
        float alpha = smoothstep(0.5, 0.4, ll) * 0.8;
        gl_FragColor = vec4(u_color, alpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      depthWrite: false
    });
    
    // Line material for borders
    this.lineMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShader,
      fragmentShader: `
        uniform vec3 u_color;
        void main() {
          gl_FragColor = vec4(u_color, 0.3);
        }
      `,
      transparent: true,
      depthWrite: false
    });
  }

  async loadData() {
    try {
      const response = await fetch('/world-110m.json');
      const topology = await response.json();
      const geojson = topojson.feature(topology, topology.objects.countries);
      this.createGeometry(geojson);
    } catch (e) {
      console.error("Failed to load map data", e);
    }
  }

  createGeometry(geojson) {
    const points = [];
    const lineIndices = [];
    let currentIndex = 0;
    
    const addPoint = (lon, lat) => {
      points.push(lon * Math.PI / 180, lat * Math.PI / 180, 0);
      return currentIndex++;
    };

    geojson.features.forEach(feature => {
      const geometry = feature.geometry;
      if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach(ring => {
          let firstIdx = -1;
          let prevIdx = -1;
          ring.forEach((coord, i) => {
            const idx = addPoint(coord[0], coord[1]);
            if (i === 0) firstIdx = idx;
            if (prevIdx !== -1) {
              lineIndices.push(prevIdx, idx);
            }
            prevIdx = idx;
          });
        });
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(polygon => {
          polygon.forEach(ring => {
            let firstIdx = -1;
            let prevIdx = -1;
            ring.forEach((coord, i) => {
              const idx = addPoint(coord[0], coord[1]);
              if (i === 0) firstIdx = idx;
              if (prevIdx !== -1) {
                lineIndices.push(prevIdx, idx);
              }
              prevIdx = idx;
            });
          });
        });
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    
    // We can render as points and lines
    this.pointCloud = new THREE.Points(geometry, this.material);
    this.mapGroup.add(this.pointCloud);
    
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', geometry.getAttribute('position'));
    lineGeom.setIndex(lineIndices);
    this.lineMesh = new THREE.LineSegments(lineGeom, this.lineMaterial);
    this.mapGroup.add(this.lineMesh);
    
    // Add Graticule (Grid)
    this.createGraticule();
    
    // Add Tissot's Indicatrix
    this.createTissotCircles();
  }
  
  createTissotCircles() {
    const points = [];
    const radius = 3; // radius in degrees
    const segments = 32;
    
    // Create circles at 30 degree intervals
    for(let lat = -60; lat <= 60; lat += 30) {
      for(let lon = -180; lon < 180; lon += 30) {
        // Build a circle polygon
        for(let i = 0; i < segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          // Approximate spherical circle by adding to lat/lon
          const dLon = (radius / Math.cos(lat * Math.PI / 180)) * Math.cos(theta);
          const dLat = radius * Math.sin(theta);
          
          points.push((lon + dLon) * Math.PI / 180, (lat + dLat) * Math.PI / 180, 0);
        }
      }
    }
    
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    
    const mat = this.material.clone();
    mat.uniforms.u_color.value = new THREE.Color('#db2777'); // Pinkish red for Tissot circles
    
    // We can render them as points or lines. Let's do small points to form the circle outline.
    const tissot = new THREE.Points(geom, mat);
    this.tissotGroup = tissot;
    this.mapGroup.add(tissot);
  }

  toggleTissot(visible) {
    if (this.tissotGroup) {
      this.tissotGroup.visible = visible;
    }
  }
  
  createGraticule() {
    const points = [];
    const indices = [];
    let idx = 0;
    
    // Meridians
    for(let lon = -180; lon <= 180; lon += 30) {
      let prev = -1;
      for(let lat = -90; lat <= 90; lat += 5) {
        points.push(lon * Math.PI / 180, lat * Math.PI / 180, 0);
        let current = idx++;
        if(prev !== -1) indices.push(prev, current);
        prev = current;
      }
    }
    
    // Parallels
    for(let lat = -90; lat <= 90; lat += 30) {
      let prev = -1;
      for(let lon = -180; lon <= 180; lon += 5) {
        points.push(lon * Math.PI / 180, lat * Math.PI / 180, 0);
        let current = idx++;
        if(prev !== -1) indices.push(prev, current);
        prev = current;
      }
    }
    
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geom.setIndex(indices);
    
    const mat = this.lineMaterial.clone();
    mat.uniforms.u_color.value = new THREE.Color('#cbd5e1'); // lighter color for grid
    
    const graticule = new THREE.LineSegments(geom, mat);
    this.mapGroup.add(graticule);
  }

  setMorph(value) {
    gsap.to(this.uniforms.u_morphProgress, {
      value: value,
      duration: 1.5,
      ease: 'power3.inOut'
    });
    // Adjust camera based on morph
    const targetZ = value > 0.5 ? 60 : 40;
    gsap.to(this.camera.position, {
      z: targetZ,
      duration: 1.5,
      ease: 'power3.inOut'
    });
  }

  setProjection(type) {
    gsap.to(this.uniforms.u_projectionType, {
      value: type,
      duration: 1.2,
      ease: 'power2.inOut'
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.controls.update();
    
    this.uniforms.u_time.value += 0.01;
    
    // Slow rotation when in 3D mode
    if (this.uniforms.u_morphProgress.value < 0.1) {
      this.mapGroup.rotation.y += 0.002;
    } else {
      // smooth reset rotation
      this.mapGroup.rotation.y = THREE.MathUtils.lerp(this.mapGroup.rotation.y, 0, 0.05);
      this.mapGroup.rotation.x = THREE.MathUtils.lerp(this.mapGroup.rotation.x, 0, 0.05);
    }
    
    this.renderer.render(this.scene, this.camera);
  }
}
