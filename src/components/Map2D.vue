<template>
  <div class="map2d-container">
    <div class="controls-panel">
      <div class="panel-header">
        <h3>2D 投影参数控制</h3>
        <div class="header-actions">
          <button class="toggle-btn" :class="{ active: currentVariant === 'conformal' }" @click="setVariant('conformal')">等角投影</button>
          <button class="toggle-btn" :class="{ active: currentVariant === 'equalArea' }" @click="setVariant('equalArea')">等面积投影</button>
        </div>
      </div>
      
      <div class="sliders-grid">
        <div class="param-item">
          <label>经度 (Longitude)</label>
          <input type="range" min="-180" max="180" v-model.number="centerMeridian" @input="onManualUpdate" />
          <input type="number" class="value-input" v-model.number="centerMeridian" @change="onManualUpdate" />
          <span class="unit">°</span>
        </div>
        
        <div class="param-item">
          <label>纬度 (Latitude)</label>
          <input type="range" min="-85" max="85" v-model.number="centerLatitude" @input="onManualUpdate" />
          <input type="number" class="value-input" v-model.number="centerLatitude" @change="onManualUpdate" />
          <span class="unit">°</span>
        </div>

        <div class="param-item">
          <label>不变形线纬度 (Secant Lat)</label>
          <input type="range" min="0" max="80" v-model.number="secantLat" @input="onParamsUpdate" />
          <input type="number" class="value-input" v-model.number="secantLat" @change="onParamsUpdate" />
          <span class="unit">°</span>
        </div>

        <div class="param-item">
          <label>全局缩放 (Scale)</label>
          <input type="range" min="50" max="800" v-model.number="scale" @input="updateLocalMap" />
          <input type="number" class="value-input scale-i" v-model.number="scale" @change="updateLocalMap" />
        </div>
      </div>
    </div>
    
    <div class="svg-wrapper" ref="wrapperRef">
      <svg ref="svgRef" width="100%" height="600"></svg>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const props = defineProps({
  globeRotation: {
    type: Object,
    default: () => ({ lon: 0, lat: 0 })
  },
  projectionType: {
    type: String,
    default: 'cylinder'
  }
});

const emit = defineEmits(['update:rotation', 'update:params']);

const centerMeridian = ref(0);
const centerLatitude = ref(0);
const scale = ref(150);

const currentVariant = ref('conformal');
const secantLat = ref(0);

let isInternalChange = false;

watch(() => props.globeRotation, (newVal) => {
  if (!isInternalChange) {
    centerMeridian.value = Math.round(newVal.lon);
    centerLatitude.value = Math.round(newVal.lat);
    updateLocalMap();
  }
}, { deep: true });

watch(() => props.projectionType, () => {
  updateLocalMap();
});

const onManualUpdate = () => {
  isInternalChange = true;
  updateLocalMap();
  emit('update:rotation', { lon: centerMeridian.value, lat: centerLatitude.value });
  setTimeout(() => { isInternalChange = false; }, 100);
};

const onParamsUpdate = () => {
  updateLocalMap();
  emit('update:params', { variant: currentVariant.value, secantLat: secantLat.value });
};

const setVariant = (variant) => {
  currentVariant.value = variant;
  
  if (props.projectionType === 'cylinder') {
    secantLat.value = (variant === 'conformal') ? 0 : 30;
  } else if (props.projectionType === 'azimuthal') {
    secantLat.value = (variant === 'conformal') ? 0 : 30;
  }
  
  onParamsUpdate();
};

const svgRef = ref(null);
let geoData = null;

const loadData = async () => {
  const res = await fetch('https://unpkg.com/world-atlas@2.0.2/land-110m.json');
  const data = await res.json();
  geoData = topojson.feature(data, data.objects.land);
  updateLocalMap();
};

// Custom projection formulas
const cylindricalEqualAreaRaw = (lambda, phi) => {
  const cosSec = Math.cos(secantLat.value * Math.PI / 180);
  return [lambda * cosSec, Math.sin(phi) / cosSec];
};

const updateLocalMap = () => {
  if (!geoData || !svgRef.value) return;
  
  const svg = d3.select(svgRef.value);
  const width = svg.node().clientWidth || 1000;
  const height = svg.node().clientHeight || 600;

  svg.selectAll('*').remove();

  svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', '#f4f6f8');

  let projection;

  if (props.projectionType === 'cylinder') {
    if (currentVariant.value === 'conformal') {
      projection = d3.geoMercator();
    } else {
      projection = d3.geoProjection(cylindricalEqualAreaRaw);
    }
  } else if (props.projectionType === 'azimuthal') {
    if (currentVariant.value === 'conformal') {
      projection = d3.geoStereographic();
    } else {
      projection = d3.geoAzimuthalEqualArea();
    }
  } else {
    projection = d3.geoMercator();
  }

  projection.rotate([-centerMeridian.value, -centerLatitude.value, 0])
    .translate([width / 2, height / 2])
    .scale(scale.value);

  const pathGenerator = d3.geoPath().projection(projection);

  svg.append('g')
    .selectAll('path')
    .data(geoData.features)
    .join('path')
    .attr('d', pathGenerator)
    .attr('fill', '#ffffff')
    .attr('stroke', '#333333')
    .attr('stroke-width', 1.0);

  const graticule = d3.geoGraticule();
  svg.append('path')
    .datum(graticule)
    .attr('class', 'graticule')
    .attr('d', pathGenerator)
    .attr('fill', 'none')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 0.5);

  // Draw secant / standard parallels in red
  if (props.projectionType === 'cylinder' || props.projectionType === 'azimuthal') {
    const lats = [secantLat.value, -secantLat.value];
    const secantLines = {
      type: "FeatureCollection",
      features: lats.map(lat => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: d3.range(-180, 181, 2).map(lon => [lon, lat])
        }
      }))
    };

    // For azimuthal, secant is a circle distance. D3 doesn't have native "secant azimuthal".
    // We just highlight the standard parallel based on distance from center.
    // In azimuthal, standard lat usually refers to distance from center. Let's just draw the radius circle.
    if (props.projectionType === 'azimuthal') {
       // Just draw a circle around center
       const circle = d3.geoCircle().center([centerMeridian.value, centerLatitude.value]).radius(90 - secantLat.value)();
       svg.append('path')
        .datum(circle)
        .attr('d', pathGenerator)
        .attr('fill', 'none')
        .attr('stroke', '#d92d20')
        .attr('stroke-width', 2.0);
    } else {
       svg.append('path')
        .datum(secantLines)
        .attr('d', pathGenerator)
        .attr('fill', 'none')
        .attr('stroke', '#d92d20')
        .attr('stroke-width', 2.0);
    }
  }
};

onMounted(() => {
  loadData();
  window.addEventListener('resize', updateLocalMap);
});
</script>

<style scoped>
.map2d-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.controls-panel {
  background: #fbfbfb;
  color: #333;
  padding: 20px 30px;
  border-bottom: 1px solid #eee;
}

.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px;
}

.panel-header h3 {
  margin: 0; font-size: 1.4rem; font-weight: 600; color: #222;
}

.header-actions {
  display: flex; gap: 10px;
}

.toggle-btn {
  background: white; border: 1px solid #ccc; color: #555;
  padding: 6px 16px; border-radius: 4px; cursor: pointer;
  font-size: 1rem; font-weight: 500; transition: all 0.2s;
}

.toggle-btn.active {
  background: #111; color: white; border-color: #111;
}

.sliders-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 40px;
}

.param-item {
  display: flex;
  align-items: center;
  background: #ffffff;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid #eaeaea;
}

.param-item label {
  width: 140px;
  font-size: 1.05rem;
  color: #555;
  font-weight: 500;
}

.param-item input[type="range"] {
  flex: 1;
  margin: 0 15px;
  accent-color: #333; 
  height: 4px;
}

.value-input {
  width: 60px;
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #111;
  font-family: monospace;
  font-size: 1.1rem;
  padding: 4px;
  text-align: center;
  outline: none;
}
.value-input.scale-i { width: 70px; }

.value-input:focus { border-color: #999; }

input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }

.unit {
  font-size: 1.1rem; color: #888; margin-left: 6px;
}

.svg-wrapper { background: #f4f6f8; flex: 1; display: flex; min-height: 600px; }
</style>
