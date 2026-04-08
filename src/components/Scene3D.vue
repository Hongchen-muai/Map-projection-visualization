<template>
  <div ref="container" class="scene-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { initScene, destroyScene, step1_wrapCylinder, step2_projectRays, step3_unfoldMap, setGlobeRotation } from '../core/threeApp.js';

const container = ref(null);

onMounted(() => {
  if (container.value) {
    initScene(container.value);
  }
});

onBeforeUnmount(() => {
  destroyScene();
});

defineExpose({
  runStep: (step) => {
    if (step === 1) step1_wrapCylinder();
    if (step === 2) step2_projectRays();
    if (step === 3) step3_unfoldMap();
  },
  setRotation: (lon, lat) => setGlobeRotation(lon, lat)
});
</script>

<style scoped>
.scene-container { width: 100%; height: 100%; }
</style>
