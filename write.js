const fs = require('fs');

const map2dContent = \<template>
  <div class="map2d-container">
    <div class="controls-panel">
      <div class="panel-header">
        <h3>二维投影参数控制台</h3>
        <span class="live-badge">● Live Sync</span>
      </div>
      
      <div class="sliders-grid">
        <div class="param-item">
          <div class="param-label">
            <span>中心经度 (Center Meridian)</span>
            <span class="val">{{ centerMeridian.toFixed(1) }}°</span>
          </div>
          <input type="range" min="-180" max="180" step="0.1" v-model.number="centerMeridian" @input="updateMap" />
        </div>
        <div class="param-item">
          <div class="param-label">
            <span>中心纬度 (Pitch/Latitude)</span>
            <span class="val">{{ centerLatitude.toFixed(1) }}°</span>
          </div>
          <input type="range" min="-90" max="90" step="0.1" v-model.number="centerLatitude" @input="updateMap" />
        </div>
        <div class="param-item">
          <div class="param-label">
            <span>滚转角 (Roll)</span>
            <span class="val">{{ roll.toFixed(1) }}°</span>
          </div>
          <input type="range" min="-180" max="180" step="0.1" v-model.number="roll" @input="updateMap" />
        </div>
        <div class="param-item">
          <div class="param-label">
            <span>放大倍率 (Zoom/Scale)</span>
            <span class="val">{{ scale }}</span>
          </div>
          <input type="range" min="50" max="800" step="1" v-model.number="scale" @input="updateMap" />
        </div>
      </div>
    </div>
    <div class="svg-wrapper" ref="wrapperRef">
      <svg ref="svgRef" width="100%" height="100%"></svg>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const props = defineProps({
  globeRotation: {
    type: Object,
    default: () => ({ lon: 0, lat: 0 })
  }
});

const centerMeridian = ref(0);
const centerLatitude = ref(0);
const roll = ref(0);
const scale = ref(150);
const svgRef = ref(null);
const wrapperRef = ref(null);
let geoData = null;

watch(() => props.globeRotation, (newVal) => {
  centerMeridian.value = newVal.lon;
  centerLatitude.value = newVal.lat;
  updateMap();
}, { deep: true });

const loadData = async () => {
  const res = await fetch('https://unpkg.com/world-atlas@2.0.2/land-110m.json');
  const data = await res.json();
  const land = topojson.feature(data, data.objects.land);
  geoData = land.features;
  updateMap();
};

const updateMap = () => {
  if (!geoData || !svgRef.value || !wrapperRef.value) return;
  const svg = d3.select(svgRef.value);
  const width = wrapperRef.value.clientWidth || 800;
  const height = 600; 

  svg.selectAll('*').remove();
  svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#ffffff'); 

  const projection = d3.geoMercator()
    .rotate([-centerMeridian.value, -centerLatitude.value, roll.value])
    .translate([width / 2, height / 2])
    .scale(scale.value);

  const pathGenerator = d3.geoPath().projection(projection);

  svg.append('g').selectAll('path').data(geoData).join('path')
    .attr('d', pathGenerator).attr('fill', '#f8fafc').attr('stroke', '#000000')
    .attr('stroke-width', 0.8).attr('stroke-linejoin', 'round');

  const graticule = d3.geoGraticule();
  svg.append('path').datum(graticule).attr('class', 'graticule')
    .attr('d', pathGenerator).attr('fill', 'none').attr('stroke', '#e2e8f0')
    .attr('stroke-width', 0.5).attr('stroke-dasharray', '2,2');
};

onMounted(() => {
  loadData();
  const resizeObserver = new ResizeObserver(() => updateMap());
  if (wrapperRef.value) resizeObserver.observe(wrapperRef.value);
});
</script>

<style scoped>
.map2d-container { display: flex; flex-direction: column; width: 100%; height: 100%; }
.controls-panel { background: #1e293b; color: #f8fafc; padding: 20px 30px; border-bottom: 2px solid #334155; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.panel-header h3 { margin: 0; font-size: 1.2rem; color: #fde047; }
.live-badge { background: #22c55e; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; animation: pulse 2s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
.sliders-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 40px; }
.param-item { display: flex; flex-direction: column; gap: 8px; }
.param-label { display: flex; justify-content: space-between; font-size: 0.9rem; color: #94a3b8; }
.param-label .val { color: #f8fafc; font-weight: 500; font-variant-numeric: tabular-nums; }
input[type="range"] { width: 100%; height: 6px; background: #334155; border-radius: 4px; outline: none; -webkit-appearance: none; }
input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #fde047; cursor: pointer; transition: transform 0.1s; }
input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.2); }
.svg-wrapper { flex: 1; min-height: 600px; background: #ffffff; overflow: hidden; position: relative; }
</style>
\;

fs.writeFileSync('src/components/Map2D.vue', map2dContent, 'utf8');
