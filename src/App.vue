<template>
  <div class="app-container" :class="{ scrolling: isUnfolded || currentTab !== 'show' }">
    <header class="top-nav">
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
          <div class="menu-group">
            <button class="menu-btn active">① 圆柱投影：墨卡托 (Mercator)</button>
            <div class="sub-menu">
              <button @click="triggerStep(1)"><span>1.</span> 套上投影圆柱</button>
              <button @click="triggerStep(2)"><span>2.</span> 射线投影与畸变生成</button>
              <button @click="triggerStep(3)"><span>3.</span> 展开为平面地图</button>
            </div>
          </div>

          <button class="menu-btn disabled">② 圆锥投影 (开发中...)</button>
          <button class="menu-btn disabled">③ 方位投影 (开发中...)</button>
        </div>
      </div>

      <div class="main-content" :class="{ 'is-unfolded': isUnfolded }">
        <div class="content-wrapper">
          
          <div class="intro-text">
            <h2>墨卡托投影 (Mercator Projection)</h2>
            <p>墨卡托投影是一种等角正圆柱投影，由荷兰地图学家墨卡托于1569年创立。它的设计初衷是为了航海：在这类地图上，任何两点间的直线（等角航线）都能与所有的经线保持相同的交角，极大地方便了中世纪航海海图的使用。</p>
            <p>本展示平台通过三维交互引擎，实时复现了地球投影至相切圆柱体，再平铺为二维地图的完整数学几何转换过程。展开后，您可以拖拽上方地球模型，下方二维图会实时响应经纬网的变化。</p>
          </div>

          <div class="top-scene">
            <div class="window-frame">
              <Scene3D ref="scene3d" />
            </div>
          </div>

          <div class="bottom-map" v-if="isUnfolded">
            <div class="window-frame map2d-frame">
              <!-- RECEIVE 2-way binding event -->
              <Map2D :globeRotation="globeRotation" @update:rotation="handleRotationFromMap" />
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
        <h2>💖 支持本项目的开发</h2>
        <p>如果您觉得这个可视化平台对您的学习或教学有所启发，欢迎打赏支持我们的服务器与后续维护费用。感谢您的肯定！</p>
        <div class="qrcode-wrapper">
          <div style="height: 250px; background:#f1f5f9; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:1.2rem;">二维码区域</div>
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
import { ref, onMounted } from 'vue';
import Scene3D from './components/Scene3D.vue';
import Map2D from './components/Map2D.vue';
import { setRotationCallback, setGlobeRotation } from './core/threeApp.js';

const scene3d = ref(null);
const isUnfolded = ref(false);
const currentTab = ref('show');
const globeRotation = ref({ lon: 0, lat: 0 }); 

onMounted(() => {
  setRotationCallback((rot) => {
    globeRotation.value = rot;
  });
});

// TWO WAY BINDING
const handleRotationFromMap = (newRot) => {
  globeRotation.value = newRot;
  setGlobeRotation(newRot.lon, newRot.lat);
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
    // Allows repeating previous steps by hiding 2D map
    isUnfolded.value = false;
  }
};
</script>

<style>
/* 强制美化全局默认样式 - 增大字体和改善质感 */
body, html {
  margin: 0 !important; padding: 0 !important;
  width: 100%; height: 100%;
  background-color: #f8fafc !important; color: #1e293b;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
  letter-spacing: 0.5px;
}

.app-container {
  width: 100vw; height: 100vh;
  display: flex; flex-direction: column;
  overflow: hidden;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.app-container.scrolling { overflow: auto; }

/* 顶部导航栏 - 高度与字号增加 */
.top-nav {
  height: 90px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: white;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 60px;
  z-index: 1000;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  flex-shrink: 0;
  position: sticky;
  top: 0;
}

.top-nav .brand {
  font-size: 2.2rem; font-weight: 800; letter-spacing: 2px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.tabs { display: flex; gap: 30px; }
.tabs button {
  background: transparent; border: none; color: #cbd5e1;
  font-size: 1.4rem; font-weight: 600; cursor: pointer;
  padding: 10px 24px; border-radius: 8px; transition: all 0.3s;
}
.tabs button.active, .tabs button:hover {
  color: white; background: rgba(255,255,255,0.15);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tab-content { flex: 1; position: relative; display: flex; }

/* 左侧边栏 - 美化与宽敞排版 */
.sidebar {
  width: 480px; background: rgba(255, 255, 255, 0.95); 
  border-right: 1px solid #e0dfdc;     
  padding: 40px; display: flex; flex-direction: column; z-index: 10;       
  height: calc(100vh - 90px);
  position: sticky; top: 90px;
  backdrop-filter: blur(10px);
  box-shadow: 2px 0 20px rgba(0,0,0,0.05);
}

.sidebar h2 { font-size: 2.4rem; margin-top: 0; margin-bottom: 0.8rem; color: #0f172a; }
.sidebar-tip { font-size: 1.3rem; color: #64748b; margin-bottom: 2.5rem; font-weight: 500; }

.menu-btn {
  width: 100%; padding: 22px 24px;
  background: white; border: 2px solid #e2e8f0;
  border-radius: 12px; margin-bottom: 16px;
  font-size: 1.5rem; font-weight: 700; color: #334155;
  cursor: pointer; transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02); text-align: left;
}

.menu-btn:hover:not(.disabled) {
  border-color: #94a3b8; box-shadow: 0 8px 15px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.menu-btn.active {
  background: #f0f9ff; border-color: #3b82f6; color: #1d4ed8;
  border-left: 8px solid #3b82f6;
}

.sub-menu button {
  display: block; width: 92%; margin: 12px auto; padding: 16px 20px;
  background: white; border: 1px solid #cbd5e1; border-radius: 8px;
  cursor: pointer; font-size: 1.3rem; font-weight: 500; text-align: left;
  transition: all 0.2s; color: #475569;
}
.sub-menu button span { color: #3b82f6; font-weight: 800; margin-right: 6px; }
.sub-menu button:hover { background: #f8fafc; border-color: #94a3b8; transform: translateX(4px); }

/* 右侧主画面与间距 */
.main-content {
  flex: 1; display: flex; justify-content: center;
  padding: 50px 30px;
}
.content-wrapper { width: 100%; max-width: 1200px; display: flex; flex-direction: column; gap: 40px; }

.intro-text {
  background: #ffffff; padding: 35px 50px;
  border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.06);
  border-left: 8px solid #3b82f6;
}
.intro-text h2 { margin-top: 0; font-size: 2.5rem; color: #1e293b; margin-bottom: 20px; }
.intro-text p { font-size: 1.4rem; line-height: 2.0; color: #475569; margin-bottom: 15px; }

.top-scene { width: 100%; height: 60vh; min-height: 550px; transition: all 1s ease; }
.main-content.is-unfolded .top-scene { height: 50vh; min-height: 450px; }

.window-frame {
  width: 100%; height: 100%;
  border: 4px solid #fde047;
  box-shadow: 0 15px 35px rgba(0,0,0,0.15);
  border-radius: 16px; overflow: hidden; background: #fff;
  display: flex; align-items: stretch; justify-content: stretch;
}

.bottom-map { width: 100%; animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.map2d-frame { height: auto; min-height: 650px; background: #ffffff; flex-direction: column;}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 非展示页的主容器样式 */
.other-tab {
  justify-content: center; align-items: flex-start;
  padding-top: 100px;
  min-height: calc(100vh - 90px - 80px); 
}
.placeholder-box, .support-box {
  background: white; padding: 50px 70px; border-radius: 16px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.08); text-align: center; max-width: 700px;
}
.support-box h2 { font-size: 2.4rem; margin-top: 0; }
.support-box p { font-size: 1.4rem; color: #64748b; line-height: 1.8; margin-bottom: 40px; }

.app-footer {
  background: #0f172a; color: #94a3b8;
  padding: 30px 0; text-align: center;
  font-size: 1.2rem; margin-top: auto;
}
.app-footer .divider { margin: 0 20px; color: #475569; }
</style>
