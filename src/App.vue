<template>
  <div class="root-wrapper">
    
    <AuthModal :isVisible="showAuthModal" @close="showAuthModal = false" />

    <!-- 顶部导航栏，固定在顶部，所有页面可?-->
    <header class="top-nav">
      <div class="nav-left">
        <button class="auth-trigger-btn" @click="showAuthModal = true" v-if="!authStore.isAuthenticated">
          Login / Sign Up
        </button>
        <div class="user-profile-btn" v-else>
          <div class="avatar-mini">{{ authStore.userInitial }}</div>
          <span class="username-mini">{{ authStore.username }}</span>
          <button class="logout-btn" @click="authStore.logout()">Logout</button>
        </div>
        <span class="brand-en">Z-Geospatial</span>
      </div>
      <nav class="nav-center">
        <button :class="{ active: currentTab === 'show' }" @click="currentTab = 'show'">
          <span class="nav-text-en">SHOWCASE</span>
          <span class="nav-text-cn">展示</span>
        </button>
        <button :class="{ active: currentTab === 'resources' }" @click="currentTab = 'resources'">
          <span class="nav-text-en">RESOURCES</span>
          <span class="nav-text-cn">资源</span>
        </button>
        <button :class="{ active: currentTab === 'support' }" @click="currentTab = 'support'">
          <span class="nav-text-en">SUPPORT</span>
          <span class="nav-text-cn">支持</span>
        </button>
      </nav>
      <div class="nav-right">
        <button class="contact-btn">
          <span class="nav-text-en-case">Contact</span>
          <span class="nav-text-cn">联系我们</span>
        </button>
      </div>
    </header>

    <div class="app-container">
      <!-- 首屏纽约时报风封面 (Fixed at back) -->
      <div class="hero-section">
        <DynamicBackground />
        <div class="hero-content">
          <h1 class="hero-title-en">Z-Geospatial</h1>
          <h2 class="hero-title-cn">Z - 地 理 空 间</h2>
          <p class="hero-subtitle">
            Precision in Every Dimension. Exploring the intersection of classical<br>cartography and modern spatial intelligence.
          </p>
          <div class="hero-actions">
            <button class="btn-dark" @click="scrollToMain">EXPLORE NOW</button>
            <button class="btn-light" @click="scrollToMain(); currentTab = 'resources'">LEARN MORE</button>
          </div>
        </div>
      </div>

      <!-- 占位符：撑开首屏滚动空间，实现磁吸吸附 -->
      <div class="scroll-spacer"></div>

      <!-- 全局遮罩白幕，彻底解决底部透视问题 -->
      <div class="content-mask">
        <!-- 主布局 (滑上覆盖背景) -->
        <div class="main-layout" id="main-layout" :class="{ 'is-visible': isMainVisible }">
        <div v-show="currentTab === 'show'" class="tab-content show-tab">
        <div class="sidebar">
          <h2>
            <span class="sidebar-en">KNOWLEDGE BASE</span>
            <span class="sidebar-cn">地信知识库</span>
          </h2>
          <p class="sidebar-tip">探索测绘与空间信息科学的核心维度</p>

          <div class="menu">
            <!-- 1. 地图学与投影 (Cartography) -->
            <div class="knowledge-category">
              <button class="menu-btn-tree category-btn" :class="{ active: expandedCategory === 'cartography' }" @click="toggleCategory('cartography')">
                <span class="tree-icon">{{ expandedCategory === 'cartography' ? '-' : '+' }}</span>
                <span class="tree-en">CARTOGRAPHY</span>
                <span class="tree-cn">地图学与投影</span>
              </button>
              
              <div class="category-content" v-show="expandedCategory === 'cartography'">
                <button class="module-btn" :class="{ active: activeModule === 'projections' }" @click="switchModule('projections')">
                  地图投影核心交互展示
                </button>
                
                <!-- 投影专属的控制台 (只有在选中投影展示时才显示) -->
                <div class="projection-controls-wrapper" v-show="activeModule === 'projections'">
                  <div class="menu-group drag-mode-group">
                    <h3 class="drag-title">
                      <span class="drag-title-en">MOUSE MODE</span>
                      <span class="drag-title-cn">鼠标模式</span>
                    </h3>
                    <div class="drag-buttons vertical">
                      <button class="drag-btn-text" :class="{ active: currentDragMode === 'camera' }" @click="setDragMode('camera')">视角旋转</button>
                      <button class="drag-btn-text" :class="{ active: currentDragMode === 'earth' }" @click="setDragMode('earth')">旋转地球</button>
                      <button class="drag-btn-text" :class="{ active: currentDragMode === 'plane' }" @click="setDragMode('plane')">旋转切割面</button>
                    </div>
                  </div>

                  <div class="menu-group">
                    <button class="menu-btn-tree sub-tree-btn" :class="{ active: expandedMenu === 'cylinder' }" @click="toggleMenu('cylinder')">
                      <span class="tree-icon">{{ expandedMenu === 'cylinder' ? '-' : '+' }}</span>
                      <span class="tree-en">CYLINDRICAL</span>
                      <span class="tree-cn">圆柱投影</span>
                    </button>
                    <div class="sub-menu-tree" v-show="expandedMenu === 'cylinder'">
                      <div class="variant-toggles">
                        <button :class="{ active: currentVariant === 'conformal' }" @click="setVariant('conformal')">等角 (墨卡托)</button>
                        <button :class="{ active: currentVariant === 'equalArea' }" @click="setVariant('equalArea')">等面积 (兰勃特)</button>
                      </div>
                      <button class="step-btn" @click="triggerStep(1)"><span class="step-num">1</span> 放置包裹圆柱</button>
                      <button class="step-btn" @click="triggerStep(2)"><span class="step-num">2</span> 射线投影发生</button>
                      <button class="step-btn" @click="triggerStep(3)"><span class="step-num">3</span> 展开为平面图</button>
                    </div>
                  </div>

                  <div class="menu-group">
                    <button class="menu-btn-tree sub-tree-btn" :class="{ active: expandedMenu === 'azimuthal' }" @click="toggleMenu('azimuthal')">
                      <span class="tree-icon">{{ expandedMenu === 'azimuthal' ? '-' : '+' }}</span>
                      <span class="tree-en">AZIMUTHAL</span>
                      <span class="tree-cn">方位投影</span>
                    </button>
                    <div class="sub-menu-tree" v-show="expandedMenu === 'azimuthal'">
                      <div class="variant-toggles">
                        <button :class="{ active: currentVariant === 'conformal' }" @click="setVariant('conformal')">等角 (球极)</button>
                        <button :class="{ active: currentVariant === 'equalArea' }" @click="setVariant('equalArea')">等面积 (方位)</button>
                      </div>
                      <button class="step-btn" @click="triggerStep(1)"><span class="step-num">1</span> 放置几何切面</button>
                      <button class="step-btn" @click="triggerStep(2)"><span class="step-num">2</span> 射线投影发生</button>
                      <button class="step-btn" @click="triggerStep(3)"><span class="step-num">3</span> 正面观察平面</button>
                    </div>
                  </div>

                  <div class="menu-group">
                    <button class="menu-btn-tree sub-tree-btn" :class="{ active: expandedMenu === 'conic' }" @click="toggleMenu('conic')">
                      <span class="tree-icon">{{ expandedMenu === 'conic' ? '-' : '+' }}</span>
                      <span class="tree-en">CONIC</span>
                      <span class="tree-cn">圆锥投影</span>
                    </button>
                    <div class="sub-menu-tree" v-show="expandedMenu === 'conic'">
                      <div class="variant-toggles">
                        <button :class="{ active: currentVariant === 'conformal' }" @click="setVariant('conformal')">等角 (兰勃特)</button>
                        <button :class="{ active: currentVariant === 'equalArea' }" @click="setVariant('equalArea')">等面积 (阿尔伯斯)</button>
                      </div>
                      <button class="step-btn" @click="triggerStep(1)"><span class="step-num">1</span> 放置几何圆锥</button>
                      <button class="step-btn" @click="triggerStep(2)"><span class="step-num">2</span> 射线投影发生</button>
                      <button class="step-btn" @click="triggerStep(3)"><span class="step-num">3</span> 展开扇形地图</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 2. 卫星导航系统 (GNSS) -->
            <div class="knowledge-category">
              <button class="menu-btn-tree category-btn" :class="{ active: expandedCategory === 'gnss' }" @click="toggleCategory('gnss')">
                <span class="tree-icon">{{ expandedCategory === 'gnss' ? '-' : '+' }}</span>
                <span class="tree-en">GNSS & POSITIONING</span>
                <span class="tree-cn">卫星导航系统</span>
              </button>
              <div class="category-content" v-show="expandedCategory === 'gnss'">
                <button class="module-btn" :class="{ active: activeModule === 'gps' }" @click="switchModule('gps')">
                  GPS原理与RTK技术
                </button>
              </div>
            </div>

            <!-- 3. CAD与工程制图 -->
            <div class="knowledge-category">
              <button class="menu-btn-tree category-btn" :class="{ active: expandedCategory === 'cad' }" @click="toggleCategory('cad')">
                <span class="tree-icon">{{ expandedCategory === 'cad' ? '-' : '+' }}</span>
                <span class="tree-en">SPATIAL CAD</span>
                <span class="tree-cn">CAD与工程制图</span>
              </button>
              <div class="category-content" v-show="expandedCategory === 'cad'">
                <button class="module-btn" :class="{ active: activeModule === 'cad' }" @click="switchModule('cad')">
                  空间CAD技术与GIS集成
                </button>
              </div>
            </div>

            <!-- 4. 遥感技术 -->
            <div class="knowledge-category">
              <button class="menu-btn-tree category-btn" :class="{ active: expandedCategory === 'rs' }" @click="toggleCategory('rs')">
                <span class="tree-icon">{{ expandedCategory === 'rs' ? '-' : '+' }}</span>
                <span class="tree-en">REMOTE SENSING</span>
                <span class="tree-cn">遥感图像处理</span>
              </button>
              <div class="category-content" v-show="expandedCategory === 'rs'">
                <button class="module-btn" :class="{ active: activeModule === 'rs' }" @click="switchModule('rs')">
                  微波遥感与合成孔径雷达
                </button>
              </div>
            </div>

            <!-- 5. 空间分析 -->
            <div class="knowledge-category">
              <button class="menu-btn-tree category-btn" :class="{ active: expandedCategory === 'spatial' }" @click="toggleCategory('spatial')">
                <span class="tree-icon">{{ expandedCategory === 'spatial' ? '-' : '+' }}</span>
                <span class="tree-en">SPATIAL ANALYSIS</span>
                <span class="tree-cn">高级空间分析</span>
              </button>
              <div class="category-content" v-show="expandedCategory === 'spatial'">
                <button class="module-btn" :class="{ active: activeModule === 'spatial' }" @click="switchModule('spatial')">
                  缓冲、叠置与拓扑建模
                </button>
              </div>
            </div>

          </div>
        </div>

        <div class="main-content" :class="{ 'is-unfolded': isUnfolded && activeModule === 'projections' }">
          <div class="content-wrapper">
            
            <!-- 模块 1: 地图投影交互展示 -->
            <template v-if="activeModule === 'projections'">
              <div class="intro-text">
                <h2>{{ projectionTitle }}</h2>
                <div class="intro-paragraphs">
                  <p>{{ projectionInfo.principle }}</p>
                  <div class="divider-line"></div>
                  <p>{{ projectionInfo.history }}</p>
                  <div class="divider-line"></div>
                  <p>{{ projectionInfo.usage }}</p>
                </div>
                <p class="sub-desc">注：割投影模式下，红色线条表示不变形线（标准纬线）。此处比例尺保持精确真实。</p>
              </div>

              <div class="top-scene">
                <div class="window-frame">
                  <Scene3D ref="scene3d" />
                </div>
              </div>

            <div class="bottom-map">
              <div class="window-frame map2d-frame">
                <Map2D v-if="isUnfolded" :globeRotation="globeRotation" :projectionType="currentProjection" :variant="currentVariant" @update:rotation="handleRotationFromMap" @update:params="handleParamsChange" />
                <div v-else class="map-placeholder">
                   <p>请在左侧面板完成三维投影步骤，展开后即可查看二维地图效果。</p>
                </div>
              </div>
            </div>
            
            <div class="kb-course-view" style="margin-top: 40px;">
                <CommentSection topicId="projections" @require-login="showAuthModal = true" />
            </div>
            </template>

            <!-- 模块 2+: 知识库图文/视频页面 -->
            <template v-else>
              <div class="kb-course-view">
                <div class="course-header">
                  <h2 class="course-title-cn">{{ currentCourse.titleCn }}</h2>
                  <p class="course-title-en">{{ currentCourse.titleEn }}</p>
                </div>
                
                <div class="video-player-placeholder">
                   <div class="play-icon-circle">
                      <span class="play-icon">▶</span>
                   </div>
                   <div class="video-info-overlay">
                     <span class="video-duration">{{ currentCourse.duration }}</span>
                   </div>
                </div>

                <div class="course-interactions">
                  <div class="course-desc-box">
                    <h3>Course Overview</h3>
                    <p>{{ currentCourse.desc }}</p>
                  </div>
                  
                  <CommentSection :topicId="activeModule" @require-login="showAuthModal = true" />
                </div>
              </div>
            </template>

          </div>
        </div>
      </div>

      <div v-if="currentTab === 'resources'" class="tab-content other-tab">
        <div class="placeholder-box">
          <h2>课程资源</h2>
          <p>相关教案与资料正在整理，敬请期待</p>
        </div>
      </div>

      <div v-if="currentTab === 'support'" class="tab-content other-tab">
        <div class="support-box">
          <h2>支持我们</h2>
          <p>如果您觉得平台有帮助，欢迎支持服务器运维费用。</p>
          <div class="qrcode-wrapper">
            <img src="/wechat-pay.jpg" alt="微信赞赏" class="wechat-qr" />
          </div>
        </div>
      </div>
      </div> <!-- 闭合 main-layout 的 div -->

      <footer class="app-footer">
        <div class="footer-content">
          <span>张云山</span>
          <span class="divider">/</span>
          <span>湖南师范大学地理科学学院</span>
          <span class="divider">/</span>
          <span>1022364689@qq.com</span>
        </div>
      </footer>
      </div> <!-- 闭合 content-mask 的 div -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import Scene3D from './components/Scene3D.vue';
import Map2D from './components/Map2D.vue';
import DynamicBackground from './components/DynamicBackground.vue';
import AuthModal from './components/AuthModal.vue';
import CommentSection from './components/CommentSection.vue';
import { useAuthStore } from './stores/auth.js';
import { setRotationCallback, setGlobeRotation, updateProjectionMode, setDragMode as setThreeDragMode } from './core/threeApp.js';

const authStore = useAuthStore();
const showAuthModal = ref(false);

const scene3d = ref(null);
const isUnfolded = ref(false);
const currentTab = ref('show');
const currentDragMode = ref('camera');
const isMainVisible = ref(false); // 用于控制侧边栏进入动画
const expandedCategory = ref('cartography'); // 'cartography', 'gnss', 'cad', 'rs', 'spatial'
const activeModule = ref('projections'); // 'projections', 'gps', 'cad', 'rs', etc.
const expandedMenu = ref('cylinder');
const currentProjection = ref('cylinder');

const knowledgeCourses = {
  'gps': { titleCn: '全球定位系统与GNSS原理', titleEn: 'PRINCIPLES OF GNSS & GPS', desc: '本课程详细讲解全球定位系统的信号结构、伪距测量方程、载波相位差分（RTK）定位技术，以及BDS北斗系统的最新发展与应用场景。', views: '2.4K', duration: '45:20' },
  'cad': { titleCn: '空间CAD技术与GIS集成', titleEn: 'SPATIAL CAD & GIS INTEGRATION', desc: '探索AutoCAD在地理空间数据处理中的应用。涵盖DWG与Shapefile的数据互操作机制、空间参照系的赋予，以及基于CAD的精细化制图方法。', views: '1.8K', duration: '32:15' },
  'rs': { titleCn: '微波遥感与合成孔径雷达', titleEn: 'MICROWAVE RS & SAR', desc: '深入理解合成孔径雷达（SAR）的成像几何原理、多普勒频移特性，以及InSAR干涉测量在地表形变监测中的前沿应用技术。', views: '3.1K', duration: '58:10' },
  'spatial': { titleCn: '高级空间分析与拓扑建模', titleEn: 'ADVANCED SPATIAL ANALYSIS', desc: '剖析GIS空间分析的核心算法箱：涵盖空间叠加分析、泰森多边形生成、网络分析中的Dijkstra最短路径算法与设施选址模型。', views: '4.5K', duration: '1:12:00' }
};

const currentCourse = computed(() => knowledgeCourses[activeModule.value] || {});

const scrollToMain = () => {
  const layout = document.getElementById('main-layout');
  if (layout) {
    layout.scrollIntoView({ behavior: 'smooth' });
  }
};

const toggleMenu = (type) => {
  if (expandedMenu.value === type) {
    expandedMenu.value = ''; // 仅收起菜单
  } else {
    expandedMenu.value = type;
    setProjectionType(type); // 展开并切换投影
  }
};

const toggleCategory = (category) => {
  if (expandedCategory.value === category) {
    expandedCategory.value = ''; 
  } else {
    expandedCategory.value = category;
  }
};

const switchModule = (moduleName) => {
  activeModule.value = moduleName;
};

const setDragMode = (mode) => {
  currentDragMode.value = mode;
  setThreeDragMode(mode);
};

const globeRotation = ref({ lon: 0, lat: 0 }); 
const currentVariant = ref('conformal');
const secantLat = ref(0);

const projectionTitle = computed(() => {
  if (currentProjection.value === 'cylinder') {
    return currentVariant.value === 'conformal' ? '墨卡托投影 (Mercator)' : '等面积圆柱投影 (Cylindrical Equal-Area)';
  } else if (currentProjection.value === 'azimuthal') {
    return currentVariant.value === 'conformal' ? '球极平面投影 (Stereographic)' : '方位等面积投影 (Azimuthal Equal-Area)';
  } else if (currentProjection.value === 'conic') {
    return currentVariant.value === 'conformal' ? '兰勃特等角圆锥投影 (Lambert Conformal Conic)' : '阿尔伯斯等面积圆锥投影 (Albers Equal-Area Conic)';
  }
  return '';
});

const projectionInfo = computed(() => {
  const infoMap = {
    'cylinder-conformal': {
      principle: '将地球表面投影到圆柱面上。通过数学方法拉伸高纬度地区，保证了局部方向和形状的正确（等角特性）。',
      history: '1569年由荷兰地图学家墨卡托（Gerardus Mercator）创立，是地图学史上的重要里程碑。',
      usage: '由于其图上直线即为等角航线的特性，至今仍是航海图的绝对标准，同时也被广泛应用于现代Web地图服务（如Google Maps）。'
    },
    'cylinder-equalArea': {
      principle: '同样投影于圆柱面，但光线相当于从地轴水平垂直向外射出。严格保证了地图上任意面积的比例与实地一致，但高纬度被严重压扁。',
      history: '1772年由著名数学家约翰·海因里希·兰勃特（Johann Heinrich Lambert）首次提出。',
      usage: '适合用于要求面积对比精确的全球统计地图，以客观反映不同地区的真实大小。'
    },
    'azimuthal-conformal': {
      principle: '将地球投影到一个平坦的切面上，光源设置在切点的对跖点。能保持中心周围区域的形状不发生扭曲。',
      history: '历史悠久，古希腊时期即已存在，常被天文学家托勒密用于绘制星图。',
      usage: '广泛用于展示两极地区，以及在气象学、结晶学中进行方向和角度的精确分析。'
    },
    'azimuthal-equalArea': {
      principle: '投影至平面切板。通过特定数学变换，保证从投影中心向外所有区域的面积比例绝对正确。',
      history: '1772年由兰勃特发明，体现了其在数学与地图学领域的非凡造诣。',
      usage: '常用于绘制单独的大洲地图（如亚洲全图、北极圈地图），能精准反映广袤陆地的真实范围。'
    },
    'conic-conformal': {
      principle: '将圆锥套在地球上进行投影，沿母线展开后呈扇形。在标准纬线附近变形极小，且局部无角度变形。',
      history: '同样由兰勃特于1772年发明，是其一生中最重要的制图学贡献之一。',
      usage: '特别适合中纬度东西向延伸的国家，是中国、美国等国家标准政区图和航空图的首选投影。'
    },
    'conic-equalArea': {
      principle: '采用圆锥包裹地球，在保证全图面积比例真实的前提下，通过调整纬线间距使形变分布相对均匀。',
      history: '1805年由海因里希·克里斯蒂安·阿尔伯斯（Heinrich Christian Albers）提出。',
      usage: '是中国和美国常用的另一种官方投影方式，常用于各类社会经济统计图件，确保各省州面积对比真实可靠。'
    }
  };
  return infoMap[`${currentProjection.value}-${currentVariant.value}`] || infoMap['cylinder-conformal'];
});

const setVariant = (v) => {
  currentVariant.value = v;
  updateProjectionMode(currentProjection.value, currentVariant.value, secantLat.value);
};

onMounted(() => {
  setRotationCallback((rot) => {
    globeRotation.value = rot;
  });
  updateProjectionMode(currentProjection.value, currentVariant.value, secantLat.value);

  // 设置 IntersectionObserver 监听主功能页面滑入，以触发左侧边栏动画
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      isMainVisible.value = true;
    } else {
      isMainVisible.value = false;
    }
  }, { threshold: 0.2 });
  
  const layout = document.getElementById('main-layout');
  if (layout) observer.observe(layout);
  
  onUnmounted(() => {
    if (layout) observer.unobserve(layout);
  });
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
/* 引入谷歌字体：UnifrakturMaguntia用于标题Blackletter, Noto Serif用于优雅的中英混排, Inter用于现代无衬线按钮等 */
@import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Noto+Serif+SC:wght@300;400;500;700&family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');

body, html {
  margin: 0 !important; padding: 0 !important;
  width: 100%; height: 100%;
  background-color: #fbfbfc; 
  color: #222222;
  font-family: "Noto Serif SC", serif;
  -webkit-font-smoothing: antialiased;
}

/* 根容器：隐藏系统默认滚动条 */
.root-wrapper {
  width: 100vw; height: 100vh;
  overflow: hidden; 
  position: relative;
}

/* Scroll Container 磁吸滚动 */
.app-container {
  width: 100%; height: 100vh;
  overflow-y: auto; overflow-x: hidden;
  scroll-snap-type: y proximity; /* 改为 proximity，让滑动更加自由，避免强制 snap 太快 */
  scroll-behavior: smooth;
}

/* 纽约时报风封面 */
.hero-section {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  height: 100vh;
  z-index: 1; 
  background: #fdfdfd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none; /* 让鼠标事件穿透背景 */
}

/* 撑起首屏空间的占位符，接收磁吸并允许点击穿透 */
.scroll-spacer {
  height: 100vh;
  width: 100%;
  scroll-snap-align: start; /* 磁吸点1 */
  pointer-events: none;
}

/* 用来彻底盖住底层封面的纯白幕布 */
.content-mask {
  background: #ffffff;
  position: relative;
  z-index: 5; /* 盖在 hero-section 之上 */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  scroll-snap-align: start; /* 磁吸点2 */
}

.hero-content {
  text-align: center;
  z-index: 10;
  pointer-events: auto; /* 内容允许点击 */
  margin-top: 80px; /* 避开置顶的导航栏 */
}

.hero-title-en {
  font-family: 'UnifrakturMaguntia', cursive;
  font-size: 7.5rem;
  color: #111;
  margin: 0 0 10px 0;
  line-height: 1;
  text-shadow: 2px 2px 8px rgba(0,0,0,0.05);
}

.hero-title-cn {
  font-family: "Noto Serif SC", serif;
  font-size: 3.5rem;
  font-weight: 300;
  margin: 10px 0 20px 0;
  background: linear-gradient(90deg, #1d4ed8, #e81cff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.1em;
}

.hero-subtitle {
  font-family: "Noto Serif SC", serif;
  font-size: 1.25rem;
  color: #444;
  margin: 40px auto 50px auto;
  max-width: 700px;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.hero-actions button {
  padding: 16px 40px;
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-dark {
  background: #000;
  color: #fff;
  border: 1px solid #000;
}
.btn-dark:hover {
  background: #222;
}

.btn-light {
  background: transparent;
  color: #000;
  border: 1px solid #000;
}
.btn-light:hover {
  background: #f5f5f5;
}

/* 主布局 (滑上覆盖背景) */
.main-layout {
  position: relative;
  z-index: 5; 
  background: transparent; 
  display: flex; flex-direction: column;
}

/* 顶部导航：完全对齐纽约时报图片风格 */
.top-nav {
  height: 80px;
  background: rgba(255, 255, 255, 0.95); /* 轻微透明感 */
  backdrop-filter: blur(10px);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 50px;
  z-index: 2000;
  border-bottom: 1px solid #f0f0f0;
  position: absolute;
  top: 0; left: 0; width: 100%;
  box-sizing: border-box;
}

.nav-left { display: flex; align-items: baseline; gap: 20px; }
.auth-trigger-btn { background: transparent; border: none; font-family: 'Inter', sans-serif; font-size: 0.8rem; color: #666; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: color 0.3s; padding: 0;}
.auth-trigger-btn:hover { color: #111; }

.user-profile-btn { display: flex; align-items: center; gap: 10px; }
.avatar-mini { width: 24px; height: 24px; border-radius: 50%; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; font-size: 0.8rem; }
.username-mini { font-family: 'Inter', sans-serif; font-size: 0.85rem; color: #111; font-weight: 500;}
.logout-btn { background: transparent; border: none; font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #999; cursor: pointer; padding: 0; text-decoration: underline; text-decoration-color: transparent; transition: all 0.3s;}
.logout-btn:hover { color: #d92d20; text-decoration-color: #d92d20; }

.nav-left .brand-en {
  font-family: "Noto Serif SC", serif;
  font-size: 1.8rem;
  font-weight: 500;
  color: #111;
}

.nav-center {
  display: flex;
  gap: 40px;
}

.nav-center button, .nav-right button {
  background: transparent; border: none; cursor: pointer;
  display: flex; align-items: baseline; gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s;
}

.nav-text-en {
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  letter-spacing: 1px;
  color: #666;
  text-transform: uppercase;
}

.nav-text-cn {
  font-family: "Noto Serif SC", serif;
  font-size: 1rem;
  color: #666;
}

.nav-center button.active, .nav-center button:hover {
  border-bottom: 1px solid #111;
}
.nav-center button.active .nav-text-en, .nav-center button.active .nav-text-cn,
.nav-center button:hover .nav-text-en, .nav-center button:hover .nav-text-cn {
  color: #111;
}

.nav-right {
  display: flex;
  justify-content: flex-end;
}
.nav-text-en-case {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.05rem;
  color: #111;
}
.nav-right button .nav-text-cn { color: #111; font-size: 0.85rem; }


.tab-content { flex: 1; position: relative; display: flex; padding-top: 80px; /* 为绝对定位的top-nav留出空间 */ }

/* 左侧边栏 - 高级侧滑进入动画 */
.sidebar {
  width: 320px; 
  background: #ffffff; 
  border-right: 1px solid #f0f0f0;     
  padding: 50px 0; display: flex; flex-direction: column; z-index: 10;       
  height: calc(100vh - 80px);
  position: sticky; top: 80px;
  box-sizing: border-box;
  
  /* 初始隐藏并偏移 */
  transform: translateX(-100px);
  opacity: 0;
  /* 极致顺滑的苹果风缓冲曲线 */
  transition: transform 1s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.main-layout.is-visible .sidebar {
  transform: translateX(0);
  opacity: 1;
}

.sidebar h2 { 
  padding: 0 50px; margin-top: 0; margin-bottom: 0.5rem; 
  display: flex; align-items: baseline; gap: 10px;
}
.sidebar-en {
  font-family: 'Inter', sans-serif; font-size: 0.9rem; letter-spacing: 1px; color: #111; font-weight: 500;
}
.sidebar-cn {
  font-family: "Noto Serif SC", serif; font-size: 1.4rem; color: #111; font-weight: 500;
}

.sidebar-tip { font-family: "Noto Serif SC", serif; font-size: 0.85rem; padding: 0 50px; color: #888; margin-bottom: 3rem; }

.drag-mode-group { margin-bottom: 30px; padding-bottom: 30px; border-bottom: 1px solid #f6f6f6; }
.drag-title { 
  margin: 0 0 20px 50px;
  display: flex; align-items: baseline; gap: 8px;
}
.drag-title-en { font-family: 'Inter', sans-serif; font-size: 0.8rem; letter-spacing: 1px; color: #777; text-transform: uppercase;}
.drag-title-cn { font-family: "Noto Serif SC", serif; font-size: 1.1rem; font-weight: 500; color: #555; }

.drag-buttons { padding: 0 50px; margin-bottom: 15px; display: flex;}
.drag-buttons.vertical { flex-direction: column; align-items: flex-start; gap: 12px; }

.drag-btn-text {
  padding: 0; background: transparent; border: none; color: #888; cursor: pointer; font-size: 1.1rem; transition: color 0.2s; font-family: "Noto Serif SC", serif;
}
.drag-btn-text:hover { color: #333; }
.drag-btn-text.active { color: #111; font-weight: 600; }
.drag-desc { font-family: "Noto Serif SC", serif; font-size: 0.95rem; color: #777; padding: 0 50px; margin: 0; line-height: 1.6; }

.menu { width: 100%; }

.menu-group { margin-bottom: 15px; }

.menu-btn-tree {
  width: 100%; text-align: left; padding: 10px 50px;
  background: transparent; border: none; cursor: pointer;
  transition: color 0.2s;
  display: flex; align-items: baseline; gap: 8px;
}
.tree-icon { font-family: monospace; font-size: 1.1rem; color: #999; }
.tree-en { font-family: 'Inter', sans-serif; font-size: 0.85rem; letter-spacing: 1px; color: #888;}
.tree-cn { font-family: "Noto Serif SC", serif; font-size: 1.2rem; color: #555; }

.menu-btn-tree:hover .tree-en, .menu-btn-tree:hover .tree-cn { color: #111; }
.menu-btn-tree.active .tree-en, .menu-btn-tree.active .tree-cn { color: #111; font-weight: 600; }

.sub-menu-tree {
  padding: 15px 0 25px 70px; /* 缩进加大 */
}

.variant-toggles {
  display: flex; gap: 15px; margin-bottom: 20px;
}
.variant-toggles button {
  font-family: "Noto Serif SC", serif;
  background: transparent; border: none; padding: 0; font-size: 1rem; color: #888; cursor: pointer; transition: color 0.2s;
}
.variant-toggles button:hover { color: #333; }
.variant-toggles button.active { color: #111; font-weight: 600; border-bottom: 1px solid #111; padding-bottom: 2px;}

.step-btn {
  display: block; width: 100%; padding: 8px 0;
  background: transparent; border: none;
  cursor: pointer; font-size: 1.05rem; text-align: left;
  transition: color 0.2s; color: #777; font-family: "Noto Serif SC", serif;
}
.step-num { font-family: 'Inter', sans-serif; margin-right: 8px; color: #ccc; }
.step-btn:hover { color: #111; }
.step-btn:hover .step-num { color: #111; }

/* 新增知识库左侧栏样式 */
.knowledge-category {
  margin-bottom: 20px;
}
.category-btn {
  font-size: 1.1rem;
  padding: 12px 40px;
  border-bottom: 1px solid #f6f6f6;
}
.category-content {
  padding: 15px 0 0 50px;
}
.module-btn {
  display: block; width: 100%; text-align: left;
  background: transparent; border: none; padding: 10px 0;
  font-family: "Noto Serif SC", serif; font-size: 1.05rem;
  color: #888; cursor: pointer; transition: all 0.2s;
}
.module-btn:hover, .module-btn.active {
  color: #111; font-weight: 600;
}
.projection-controls-wrapper {
  margin-top: 20px;
  padding: 20px 0 20px 20px;
  border-left: 1px solid #f0f0f0;
}
.sub-tree-btn { padding: 10px 0; }

/* 知识库主界面样式 (视频课程与讨论区) */
.kb-course-view {
  display: flex; flex-direction: column; gap: 40px;
  max-width: 900px; margin: 0 auto; width: 100%;
}
.course-header { text-align: center; }
.course-title-cn { font-size: 2.2rem; color: #111; margin: 0 0 10px 0; font-weight: 500; }
.course-title-en { font-family: 'Inter', sans-serif; font-size: 0.9rem; color: #888; letter-spacing: 2px; margin: 0; }

.video-player-placeholder {
  width: 100%; aspect-ratio: 16 / 9;
  background: #fbfbfc; border: 1px solid #eee;
  display: flex; align-items: center; justify-content: center;
  position: relative; cursor: pointer; transition: border-color 0.3s;
}
.video-player-placeholder:hover { border-color: #ccc; }
.play-icon-circle {
  width: 80px; height: 80px; border-radius: 50%;
  background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.video-player-placeholder:hover .play-icon-circle { transform: scale(1.05); }
.play-icon { font-size: 1.5rem; color: #111; margin-left: 5px; }
.video-info-overlay { position: absolute; bottom: 20px; right: 20px; background: rgba(0,0,0,0.7); color: #fff; padding: 4px 10px; font-family: 'Inter', sans-serif; font-size: 0.8rem; border-radius: 4px; }

.course-interactions { display: grid; grid-template-columns: 1fr; gap: 40px; }
.course-desc-box h3, .comment-section h3 {
  font-family: 'Inter', sans-serif; font-size: 1.1rem; color: #111; margin: 0 0 20px 0;
  padding-bottom: 15px; border-bottom: 1px solid #f0f0f0;
}
.course-desc-box p { font-size: 1.1rem; line-height: 1.8; color: #555; text-align: justify; }

.comment-count { color: #999; font-size: 0.9rem; font-weight: normal; margin-left: 10px; }
.comment-input-box { display: flex; gap: 15px; margin-bottom: 40px; align-items: center; }
.avatar-placeholder { width: 45px; height: 45px; border-radius: 50%; background: #f0f0f0; color: #999; display: flex; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; font-size: 1.2rem; flex-shrink: 0; }
.avatar-placeholder.small { width: 35px; height: 35px; font-size: 1rem; }
.comment-input-box input { flex: 1; border: none; border-bottom: 1px solid #ddd; padding: 10px 5px; font-family: "Noto Serif SC", serif; font-size: 1rem; outline: none; background: transparent; transition: border-color 0.3s; }
.comment-input-box input:focus { border-color: #111; }
.comment-input-box button { background: #111; color: #fff; border: none; padding: 10px 25px; font-family: 'Inter', sans-serif; font-size: 0.8rem; cursor: pointer; letter-spacing: 1px; }

.comment-list { display: flex; flex-direction: column; gap: 30px; }
.comment-item { display: flex; gap: 15px; }
.comment-body { flex: 1; }
.comment-author { font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 500; color: #111; display: block; margin-bottom: 5px; }
.comment-time { color: #999; font-weight: normal; font-size: 0.8rem; margin-left: 10px; }
.comment-body p { font-size: 1rem; color: #444; margin: 0; line-height: 1.6; }

/* 右侧主画面与间距 */
.main-content {
  flex: 1; display: flex; justify-content: center;
  padding: 60px 80px; background: #ffffff;
}
.content-wrapper { width: 100%; max-width: 1000px; display: flex; flex-direction: column; gap: 40px; padding-bottom: 60px;}

/* 文本居中排版与隔断 */
.intro-text {
  text-align: center;
  padding-bottom: 30px;
}
.intro-text h2 { margin-top: 0; font-size: 2.4rem; color: #111; margin-bottom: 30px; font-weight: 400; letter-spacing: 0.05em;}
.intro-paragraphs {
  max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; align-items: center;
}
.intro-text p { font-size: 1.1rem; line-height: 1.8; color: #444; margin: 0; text-align: justify; text-align-last: center;}
.divider-line { width: 40px; height: 1px; background: #eaeaea; margin: 25px 0; }

.intro-text .sub-desc { font-size: 0.85rem; color: #999; margin-top: 30px; font-style: italic; }

.top-scene { width: 100%; height: 65vh; min-height: 500px; transition: all 0.8s ease; }
.main-content.is-unfolded .top-scene { height: 45vh; min-height: 400px; }

.window-frame {
  width: 100%; height: 100%;
  border: 1px solid #f0f0f0;
  background: #fdfdfd;
  display: flex; align-items: stretch; justify-content: stretch;
}

.bottom-map { width: 100%; }
.map2d-frame { height: auto; min-height: 600px; background: #ffffff; flex-direction: column;}
.map-placeholder { flex: 1; display: flex; align-items: center; justify-content: center; background: #fafafa; color: #aaa; font-size: 0.95rem; }

/* 非展示页的主容器样式 */
.other-tab {
  justify-content: center; align-items: flex-start;
  padding-top: 100px;
  min-height: calc(100vh - 80px - 60px); 
}
.placeholder-box, .support-box {
  background: transparent; padding: 40px; 
  text-align: center; max-width: 600px;
}
.support-box h2 { font-size: 1.5rem; margin-top: 0; color: #111; font-weight: 500; }
.support-box p { font-size: 1rem; color: #666; line-height: 1.6; margin-bottom: 40px; }

.wechat-qr { max-width: 100%; width: 220px; border: 1px solid #eee; padding: 10px; background: #fff;}

.app-footer {
  background: #ffffff; color: #999;
  padding: 30px 0; text-align: center; border-top: 1px solid #f6f6f6;
  font-size: 0.85rem; margin-top: auto;
}
.app-footer .divider { margin: 0 15px; color: #eee; }
</style>
