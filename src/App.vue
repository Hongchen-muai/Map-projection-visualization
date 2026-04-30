<template>
  <div class="app-container" :class="{ scrolling: isUnfolded || currentTab !== 'show' }" @scroll="handleScroll">
    <header class="top-nav" :class="{ 'is-scrolled': isScrolled }">
      <div class="brand">🌍 地球投影可视化展示平台</div>
      <nav class="tabs">
        <button :class="{ active: currentTab === 'show' }" @click="currentTab = 'show'">展示面板</button>
        <button :class="{ active: currentTab === 'resources' }" @click="currentTab = 'resources'">课程资源</button>
        <button :class="{ active: currentTab === 'support' }" @click="currentTab = 'support'">支持我们</button>
      </nav>
    </header>

    <div v-show="currentTab === 'show'" class="tab-content show-tab">
      <div class="sidebar">
        <h2>📌 投影过程控制</h2>
        <p class="sidebar-tip">支持鼠标左键旋转 / 中键拖拽 / 滚轮缩放</p>

        <div class="menu">
          <div class="menu-group drag-mode-group">
            <h3 class="drag-title">🖱️ 鼠标拖拽模式</h3>
            <div class="drag-buttons">
              <button class="drag-btn" :class="{ active: currentDragMode === 'camera' }" @click="setDragMode('camera')">视角旋转</button>
              <button class="drag-btn" :class="{ active: currentDragMode === 'earth' }" @click="setDragMode('earth')">旋转地球</button>
              <button class="drag-btn" :class="{ active: currentDragMode === 'plane' }" @click="setDragMode('plane')">旋转切割面</button>
            </div>
            <p class="drag-desc" v-if="currentDragMode === 'camera'">仅改变三维观察视角，不影响投影参数。</p>
            <p class="drag-desc" v-if="currentDragMode === 'earth'">保持切割面竖直，旋转地球以改变投影中心。</p>
            <p class="drag-desc" v-if="currentDragMode === 'plane'">保持地球竖直，旋转切割面进行倾斜切割（斜轴投影）。</p>
          </div>

          <div class="menu-group">
            <button class="menu-btn" :class="{ active: currentProjection === 'cylinder' }" @click="setProjectionType('cylinder')">圆柱投影 (Cylindrical)</button>
            <div class="sub-menu" v-show="currentProjection === 'cylinder'">
              <button @click="triggerStep(1)"><span>1.</span> 放置几何面</button>
              <button @click="triggerStep(2)"><span>2.</span> 射线投影发生</button>
              <button @click="triggerStep(3)"><span>3.</span> 展开平面地图</button>
            </div>
          </div>

          <div class="menu-group">
            <button class="menu-btn" :class="{ active: currentProjection === 'azimuthal' }" @click="setProjectionType('azimuthal')">方位/平面投影 (Azimuthal)</button>
            <div class="sub-menu" v-show="currentProjection === 'azimuthal'">
              <button @click="triggerStep(1)"><span>1.</span> 放置相切平面</button>
              <button @click="triggerStep(2)"><span>2.</span> 射线投影发生</button>
              <button @click="triggerStep(3)"><span>3.</span> 正视平面地图</button>
            </div>
          </div>
          
          <button class="menu-btn disabled">圆锥投影 (开发中...)</button>
        </div>
      </div>

      <div class="main-content" :class="{ 'is-unfolded': isUnfolded }">
        <div class="content-wrapper">
          
          <div class="intro-text">
            <h2>{{ projectionTitle }}</h2>
            <p>{{ projectionDesc }}</p>
            <p class="sub-desc">在割投影模式下，红色线条表示不变形线（标准纬线）。在三维展示中该处的平面与球体相交，展开为二维地图后，此处的比例尺保持精确真实。</p>
          </div>

          <div class="top-scene">
            <div class="window-frame">
              <Scene3D ref="scene3d" />
            </div>
          </div>

          <div class="bottom-map" v-if="isUnfolded">
            <div class="window-frame map2d-frame">
              <!-- RECEIVE 2-way binding event -->
              <Map2D :globeRotation="globeRotation" :projectionType="currentProjection" @update:rotation="handleRotationFromMap" @update:params="handleParamsChange" />
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- 占位页 -->
    <div v-if="currentTab === 'resources'" class="tab-content other-tab">
      <div class="placeholder-box">
        <h2>📁 资源与课程资料</h2>
        <p>相关教案与资料正在整理，敬请期待...</p>
      </div>
    </div>

    <div v-if="currentTab === 'support'" class="tab-content other-tab">
      <div class="support-box">
        <h2>💖 支持我们</h2>
        <p>如果您觉得这个平台对您的教学或学习有帮助，欢迎扫码支持我们的服务器运维费用，感谢您的肯定！</p>
        <div class="qrcode-wrapper">
          <img src="/wechat-pay.jpg" alt="微信赞赏码" class="wechat-qr" />
        </div>
      </div>
    </div>

    <footer class="app-footer" v-if="currentTab !== 'show' || isUnfolded">
      <div class="footer-content">
        <span>创作者：张云山</span>
        <span class="divider">|</span>
        <span>邮箱：1022364689@qq.com</span>
        <span class="divider">|</span>
        <span>机构：湖南师范大学地理科学学院</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import Scene3D from './components/Scene3D.vue';
import Map2D from './components/Map2D.vue';
import { setRotationCallback, setGlobeRotation, updateProjectionMode, setDragMode as setThreeDragMode } from './core/threeApp.js';

const scene3d = ref(null);
const isUnfolded = ref(false);
const currentTab = ref('show');
const isScrolled = ref(false);
const currentDragMode = ref('camera');

const setDragMode = (mode) => {
  currentDragMode.value = mode;
  setThreeDragMode(mode);
};

const globeRotation = ref({ lon: 0, lat: 0 }); 
const currentProjection = ref('cylinder');
const currentVariant = ref('conformal');
const secantLat = ref(0);

const projectionTitle = computed(() => {
  if (currentProjection.value === 'cylinder') {
    return currentVariant.value === 'conformal' ? '墨卡托投影 (Mercator / 等角圆柱)' : '等面积圆柱投影 (Cylindrical Equal-Area)';
  } else if (currentProjection.value === 'azimuthal') {
    return currentVariant.value === 'conformal' ? '球极平面投影 (Stereographic)' : '方位等面积投影 (Azimuthal Equal-Area)';
  }
  return '';
});

const projectionDesc = computed(() => {
  if (currentProjection.value === 'cylinder') {
    if (currentVariant.value === 'conformal') {
      return '墨卡托投影是一种等角正圆柱投影，由荷兰地图学家墨卡托于1569年创立。它的设计初衷是为了航海：在这类地图上，任何两点间的直线都能与所有的经线保持相同的交角，非常适合航海定向。变形特点是：高纬度地区面积被极大夸大。';
    } else {
      return '等面积圆柱投影保持了地图上各部分面积的真实比例。为了补偿高纬度地区因经线平行而产生的横向拉伸，它在纵向上对高纬度进行了压缩，导致高纬度形状变得扁平。';
    }
  } else if (currentProjection.value === 'azimuthal') {
    if (currentVariant.value === 'conformal') {
      return '球极平面投影（Stereographic Projection）将球面点投影到切平面上，投影中心位于切点的对跖点。它是等角投影，保持局部形状不变，常用于极地地图和星图。';
    } else {
      return '方位等面积投影（Azimuthal Equal-Area）保持了面积的真实性。从投影中心向外，径向比例尺不断缩小以补偿面积膨胀，适合展示半球或大范围区域的面积分布。';
    }
  }
  return '';
});

const handleScroll = (e) => {
  isScrolled.value = e.target.scrollTop > 50;
};

onMounted(() => {
  setRotationCallback((rot) => {
    globeRotation.value = rot;
  });
  updateProjectionMode(currentProjection.value, currentVariant.value, secantLat.value);
});

const handleRotationFromMap = (newRot) => {
  globeRotation.value = newRot;
  setGlobeRotation(newRot.lon, newRot.lat);
};

const handleParamsChange = (params) => {
  currentVariant.value = params.variant;
  secantLat.value = params.secantLat;
  updateProjectionMode(currentProjection.value, currentVariant.value, secantLat.value);
};

const setProjectionType = (type) => {
  currentProjection.value = type;
  isUnfolded.value = false;
  updateProjectionMode(currentProjection.value, currentVariant.value, secantLat.value);
};

const triggerStep = (step) => {
  if (scene3d.value) {
    scene3d.value.runStep(step);
  }
  
  if (step === 3) {
    setTimeout(() => {
      isUnfolded.value = true;
    }, 2800);
  } else {
    isUnfolded.value = false;
  }
};
</script>

<style>
/* 强制美化全局默认样式 - 极简白风格 */
body, html {
  margin: 0 !important; padding: 0 !important;
  width: 100%; height: 100%;
  background-color: #ffffff !important; color: #333333;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  letter-spacing: 0.5px;
}

.app-container {
  width: 100vw; height: 100vh;
  display: flex; flex-direction: column;
  overflow: hidden;
  background: #ffffff;
}

.app-container.scrolling { overflow: auto; }

/* 顶部导航 */
.top-nav {
  height: 70px;
  background: #1a1a1a;
  color: #ffffff;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 50px;
  z-index: 1000;
  border-bottom: 1px solid #eaeaea;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  transition: background-color 0.4s, color 0.4s;
}

.top-nav.is-scrolled {
  background: rgba(255, 255, 255, 0.95);
  color: #333333;
  backdrop-filter: blur(5px);
  border-bottom: 1px solid #e0e0e0;
}

.top-nav .brand {
  font-size: 1.8rem; font-weight: 700; letter-spacing: 1px;
}

.tabs { display: flex; gap: 20px; }
.tabs button {
  background: transparent; border: none; color: inherit;
  font-size: 1.2rem; font-weight: 500; cursor: pointer;
  padding: 8px 16px; border-radius: 4px; transition: all 0.2s;
  opacity: 0.8;
}
.tabs button.active, .tabs button:hover {
  opacity: 1; background: rgba(128, 128, 128, 0.1);
}

.tab-content { flex: 1; position: relative; display: flex; }

/* 左侧边栏 - Opencode 极简风格 */
.sidebar {
  width: 320px; background: #fbfbfb; 
  border-right: 1px solid #e5e5e5;     
  padding: 30px 0; display: flex; flex-direction: column; z-index: 10;       
  height: calc(100vh - 70px);
  position: sticky; top: 70px;
  box-sizing: border-box;
}

.sidebar h2 { font-size: 1.4rem; padding: 0 30px; margin-top: 0; margin-bottom: 0.5rem; color: #222; font-weight: 600; }
.sidebar-tip { font-size: 1rem; padding: 0 30px; color: #666; margin-bottom: 2rem; }

.drag-mode-group { margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
.drag-title { font-size: 1.1rem; color: #111; margin: 0 0 10px 30px; font-weight: 600; }
.drag-buttons { display: flex; gap: 5px; padding: 0 30px; margin-bottom: 8px;}
.drag-btn { flex: 1; padding: 8px 0; background: #fff; border: 1px solid #ddd; border-radius: 4px; color: #555; cursor: pointer; font-size: 0.95rem; transition: all 0.2s; }
.drag-btn.active { background: #111; color: white; border-color: #111; font-weight: 600;}
.drag-desc { font-size: 0.9rem; color: #888; padding: 0 30px; margin: 0; line-height: 1.4; }

.menu { width: 100%; }

.menu-group { margin-bottom: 5px; }

.menu-btn {
  width: 100%; padding: 12px 30px;
  background: transparent; border: none;
  font-size: 1.15rem; font-weight: 600; color: #444;
  cursor: pointer; transition: all 0.2s ease;
  text-align: left; border-left: 4px solid transparent;
}

.menu-btn:hover:not(.disabled) {
  background: #f0f0f0; color: #111;
}

.menu-btn.active {
  background: #f0f0f0; color: #000;
  border-left: 4px solid #000;
}

.menu-btn.disabled { opacity: 0.4; cursor: not-allowed; }

.sub-menu { padding: 5px 0; background: #ffffff; border-top: 1px solid #eee; border-bottom: 1px solid #eee;}

.sub-menu button {
  display: block; width: 100%; padding: 10px 30px 10px 45px;
  background: transparent; border: none;
  cursor: pointer; font-size: 1.05rem; text-align: left;
  transition: all 0.2s; color: #555;
}
.sub-menu button span { color: #888; font-weight: normal; margin-right: 6px; }
.sub-menu button:hover { color: #000; background: #fafafa; }

/* 右侧主画面与间距 */
.main-content {
  flex: 1; display: flex; justify-content: center;
  padding: 40px; background: #ffffff;
}
.content-wrapper { width: 100%; max-width: 1200px; display: flex; flex-direction: column; gap: 30px; }

.intro-text {
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}
.intro-text h2 { margin-top: 0; font-size: 2.2rem; color: #111; margin-bottom: 15px; font-weight: 600;}
.intro-text p { font-size: 1.15rem; line-height: 1.8; color: #444; margin-bottom: 10px; }
.intro-text .sub-desc { font-size: 1rem; color: #d92d20; background: #fef3f2; padding: 10px 15px; border-radius: 4px; border-left: 3px solid #d92d20; display: inline-block; margin-top: 10px;}

.top-scene { width: 100%; height: 65vh; min-height: 500px; transition: all 0.8s ease; }
.main-content.is-unfolded .top-scene { height: 45vh; min-height: 400px; }

.window-frame {
  width: 100%; height: 100%;
  border: 1px solid #ddd;
  border-radius: 4px; overflow: hidden; background: #fafafa;
  display: flex; align-items: stretch; justify-content: stretch;
}

.bottom-map { width: 100%; animation: fadeIn 0.8s ease forwards; }
.map2d-frame { height: auto; min-height: 650px; background: #ffffff; flex-direction: column;}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 非展示页的主容器样式 */
.other-tab {
  justify-content: center; align-items: flex-start;
  padding-top: 80px;
  min-height: calc(100vh - 70px - 60px); 
}
.placeholder-box, .support-box {
  background: white; padding: 40px; border: 1px solid #eee; border-radius: 8px;
  text-align: center; max-width: 600px;
}
.support-box h2 { font-size: 2rem; margin-top: 0; color: #111; font-weight: 600; }
.support-box p { font-size: 1.15rem; color: #555; line-height: 1.6; margin-bottom: 30px; }

.wechat-qr { max-width: 100%; width: 280px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

.app-footer {
  background: #fbfbfb; color: #666;
  padding: 20px 0; text-align: center; border-top: 1px solid #eee;
  font-size: 1rem; margin-top: auto;
}
.app-footer .divider { margin: 0 15px; color: #ccc; }
</style>
