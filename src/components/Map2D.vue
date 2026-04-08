<template>
  <div class="map2d-container">
    <div class="controls-panel">
      <div class="panel-header">
        <h3>💡 2D 投影参数 (支持双向联动与精确修改)</h3>
        <span class="badge">双向实时同步开启</span>
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
          <label>旋转角 (Roll)</label>
          <input type="range" min="-180" max="180" v-model.number="roll" @input="updateLocalMap" />
          <input type="number" class="value-input" v-model.number="roll" @change="updateLocalMap" />
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
  }
});

const emit = defineEmits(['update:rotation']);

const centerMeridian = ref(0);
const centerLatitude = ref(0);
const roll = ref(0);
const scale = ref(150);

let isInternalChange = false;

// Listen to Earth 3D changing
watch(() => props.globeRotation, (newVal) => {
  if (!isInternalChange) {
    centerMeridian.value = Math.round(newVal.lon);
    centerLatitude.value = Math.round(newVal.lat);
    updateLocalMap();
  }
}, { deep: true });

// Trigger changes back to Earth 3D
const onManualUpdate = () => {
  isInternalChange = true;
  updateLocalMap();
  emit('update:rotation', { lon: centerMeridian.value, lat: centerLatitude.value });
  setTimeout(() => { isInternalChange = false; }, 100);
};

const svgRef = ref(null);
const wrapperRef = ref(null);
let geoData = null;

const loadData = async () => {
  const res = await fetch('https://unpkg.com/world-atlas@2.0.2/land-110m.json');
  const data = await res.json();
  geoData = topojson.feature(data, data.objects.land);
  updateLocalMap();
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
    .attr('fill', '#f0f7ff');

  const projection = d3.geoMercator()
    .rotate([-centerMeridian.value, -centerLatitude.value, roll.value])
    .translate([width / 2, height / 2])
    .scale(scale.value);

  const pathGenerator = d3.geoPath().projection(projection);

  svg.append('g')
    .selectAll('path')
    .data(geoData.features)
    .join('path')
    .attr('d', pathGenerator)
    .attr('fill', '#fdfbf7')
    .attr('stroke', '#1e293b')
    .attr('stroke-width', 1.2);

  const graticule = d3.geoGraticule();
  svg.append('path')
    .datum(graticule)
    .attr('class', 'graticule')
    .attr('d', pathGenerator)
    .attr('fill', 'none')
    .attr('stroke', '#94a3b8')
    .attr('stroke-width', 0.6)
    .attr('stroke-dasharray', '4,4');
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
  background: linear-gradient(to right, #1e293b, #334155);
  color: white;
  padding: 25px 40px;
  border-bottom: 3px solid #e2e8f0;
}

.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 25px;
}

.panel-header h3 {
  margin: 0; font-size: 1.8rem; font-weight: 700; color: #f8fafc;
  letter-spacing: 1px;
}

.badge {
  background: #10b981; color: white;
  padding: 6px 14px; border-radius: 20px;
  font-size: 1.2rem; font-weight: bold;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 6px rgba(16,185,129,0.4);
}

.sliders-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px 60px;
}

.param-item {
  display: flex;
  align-items: center;
  background: rgba(0,0,0,0.25);
  padding: 15px 20px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.05);
}

.param-item label {
  width: 160px;
  font-size: 1.4rem;
  color: #cbd5e1;
  font-weight: 600;
}

.param-item input[type="range"] {
  flex: 1;
  margin: 0 20px;
  accent-color: #3b82f6; 
  height: 6px;
}

/* Clickable input styling */
.value-input {
  width: 70px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px;
  color: #6ee7b7;
  font-family: 'Courier New', Courier, monospace;
  font-weight: bold;
  font-size: 1.5rem;
  padding: 6px 4px;
  text-align: center;
  outline: none;
  transition: all 0.3s;
}
.value-input.scale-i { width: 85px; }

.value-input:focus {
  background: rgba(255,255,255,0.2);
  border-color: #6ee7b7;
  box-shadow: 0 0 8px rgba(110,231,183,0.5);
}

/* Hide arrows for number inputs */
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
input[type=number] { -moz-appearance: textfield; }

.unit {
  font-size: 1.4rem;
  color: #94a3b8;
  margin-left: 6px;
  font-weight: bold;
}

.svg-wrapper {
  background: #ffffff;
  flex: 1;
  display: flex;
  min-height: 600px;
}
</style>
