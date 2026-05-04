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
        <div class="param-item" title="改变投影中心经度，等同于地球自转">
          <label>经度 (Longitude)</label>
          <input type="range" min="-180" max="180" v-model.number="centerMeridian" @input="onManualUpdate" />
          <input type="number" class="value-input" v-model.number="centerMeridian" @change="onManualUpdate" />
          <span class="unit">°</span>
        </div>
        
        <div class="param-item" title="改变投影中心纬度，适用于斜轴投影演示">
          <label>纬度 (Latitude)</label>
          <input type="range" min="-85" max="85" v-model.number="centerLatitude" @input="onManualUpdate" />
          <input type="number" class="value-input" v-model.number="centerLatitude" @change="onManualUpdate" />
          <span class="unit">°</span>
        </div>

        <div class="param-item secant-item" title="控制三维包裹体的切割深度，相交处（红线）比例尺恒为1，即没有变形">
          <label>标准纬线 (Secant Lat)</label>
          <input type="range" min="0" max="80" v-model.number="secantLat" @input="onParamsUpdate" />
          <input type="number" class="value-input" v-model.number="secantLat" @change="onParamsUpdate" />
          <span class="unit">°</span>
        </div>

        <div class="param-item" title="调整二维地图的显示比例">
          <label>全局缩放 (Scale)</label>
          <input type="range" min="50" max="800" v-model.number="scale" @input="updateLocalMap" />
          <input type="number" class="value-input scale-i" v-model.number="scale" @change="updateLocalMap" />
        </div>
      </div>
    </div>
    
    <div class="svg-wrapper" ref="wrapperRef">
      <div class="hint-text" v-if="props.projectionType === 'cylinder' && currentVariant === 'equalArea'">
        提示：兰勃特等面积圆柱投影的光线是从地轴垂直水平向外射出的，因此极地附近在高度上被严重压缩以保证面积不变。
      </div>
      <div class="hint-text" v-else-if="props.projectionType === 'cylinder'">
        提示：墨卡托（等角）投影通过数学公式拉伸了高纬度地区，保证了局部方向和形状的正确。
      </div>
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
  } else if (props.projectionType === 'conic') {
    secantLat.value = (variant === 'conformal') ? 30 : 45;
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

  if (svg.select('rect').empty()) {
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#f4f6f8');
  }

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
  } else if (props.projectionType === 'conic') {
    if (currentVariant.value === 'conformal') {
      projection = d3.geoConicConformal().parallels([secantLat.value, secantLat.value]);
    } else {
      projection = d3.geoConicEqualArea().parallels([secantLat.value, secantLat.value]);
    }
  } else {
    projection = d3.geoMercator();
  }

  projection.rotate([-centerMeridian.value, -centerLatitude.value, 0])
    .translate([width / 2, height / 2])
    .scale(scale.value);

  const pathGenerator = d3.geoPath().projection(projection);

  // Group for map features
  let mapG = svg.select('.map-features');
  if (mapG.empty()) {
    mapG = svg.append('g').attr('class', 'map-features');
  }

  const paths = mapG.selectAll('path')
    .data(geoData.features);

  paths.enter()
    .append('path')
    .attr('fill', '#ffffff')
    .attr('stroke', '#333333')
    .attr('stroke-width', 1.0)
    .merge(paths)
    .attr('d', pathGenerator);

  paths.exit().remove();

  let gratPath = svg.select('.graticule');
  if (gratPath.empty()) {
    gratPath = svg.append('path')
      .datum(d3.geoGraticule())
      .attr('class', 'graticule')
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 0.5);
  }
  gratPath.attr('d', pathGenerator);

  // Draw secant / standard parallels in red
  let secantG = svg.select('.secant-features');
  if (secantG.empty()) {
    secantG = svg.append('g').attr('class', 'secant-features');
  } else {
    secantG.selectAll('*').remove(); // Clear previous secant lines
  }

  if (props.projectionType === 'cylinder' || props.projectionType === 'conic' || props.projectionType === 'azimuthal') {
    // Cylinder: two secant lats (symmetric above/below equator)
    // Conic: two secant lats (the standard parallels)
    // Azimuthal: one secant circle (distance from center)
    let renderLats = [];
    if (props.projectionType === 'cylinder') {
      renderLats = [secantLat.value, -secantLat.value];
    } else if (props.projectionType === 'conic') {
      renderLats = [secantLat.value, -secantLat.value];
    } else if (props.projectionType === 'azimuthal') {
      // For azimuthal, secant is a circle at distance = 90 - secantLat degrees from center
      renderLats = [secantLat.value];
    }

    if (props.projectionType === 'azimuthal' && renderLats.length > 0) {
      const circle = d3.geoCircle()
        .center([centerMeridian.value, centerLatitude.value])
        .radius(90 - secantLat.value)();
      secantG.append('path')
        .datum(circle)
        .attr('d', pathGenerator)
        .attr('fill', 'none')
        .attr('stroke', '#d92d20')
        .attr('stroke-width', 2.0);
    } else {
      const secantLines = {
        type: "FeatureCollection",
        features: renderLats.map(lat => ({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: d3.range(-180, 181, 2).map(lon => [lon, lat])
          }
        }))
      };
      secantG.append('path')
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
  position: relative;
}

.param-item:hover::after {
  content: attr(title);
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
}

.secant-item {
  border-color: #ffcccc;
  background: #fffafa;
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

.hint-text {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #555;
  border: 1px solid #eee;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  pointer-events: none;
}

.svg-wrapper {
  border-top: 1px solid #eaeaea;
  background: #f4f6f8;
  position: relative;
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
