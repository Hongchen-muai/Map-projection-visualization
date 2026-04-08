#  地图投影可视化展示平台 (Map Projection Visualizer)

> **本项目是一个基于 Vue 3 + Three.js + D3.js 构建的地理数学交互式教学可视化平台。**  
> 核心目标是将抽象的地图投影（如墨卡托圆柱投影、圆锥投影等）过程，通过流畅的 3D 几何展开动画与 2D 平面地图实时互动展示出来。

---

##  1. 快速启动 (Quick Start)

**环境要求**：Node.js (建议 v16+ 环境)

```bash
# 1. 安装项目依赖
npm install

# 2. 启动本地开发服务器
npm run dev

# 3. 编译打包用于生产环境部署
npm run build
```

---

##  2. 项目目录结构架构说明

为了保证高可维护性，项目严格遵守**“数据、UI、算法引擎”**相分离的架构模式。

```text
map-projection-visualizer/
├── public/                 # 静态资源目录（如图标、离线 JSON 数据等，部署时保持原样）
├── src/                    #  核心源代码目录
│   ├── App.vue             # 【全局总控司令塔】负责整体 UI 架构、路由栏、左右分栏，以及 3D 和 2D 组件的参数双向通信。
│   ├── main.js             # Vue 应用启动入口。
│   ├── style.css           # 全局样式基础重置。
│   ├── components/         #  UI 视图组件库
│   │   ├── Map2D.vue       # D3.js 驱动的 2D 互动地图，包括下方的输入框、滑块与各种双向绑定数据同步面板。
│   │   └── Scene3D.vue     # Vue 包装层，负责将底层的 3D WebGL 画布安全嵌入网页，并转发界面点击指令。
│   └── core/               #  核心算法与渲染引擎（与前端框架完全解耦）
│       └── threeApp.js     # 整个项目的“灵魂核心”，包含地球生成、空间坐标转换数学公式、WebGL 投影着色器(Shaders)、以及 GSAP 动画序列。
├── package.json            # 项目依赖清单 (Vue, Three, D3, GSAP, Topojson)
├── vite.config.js          # Vite 打包构建配置
└── README.md               # 您当前正在阅读的项目协作文档
```

---

##  3. 核心机制：状态与双向联动通信流

本项目的亮点在于 **3D 物理模型** 与 **2D 地图投影** 的实时互动。为防止数据冲突（无限死循环），系统维护唯一的全局状态，链路如下：

*   **唯一真理来源**：`App.vue` 中的 `globeRotation = ref({ lon: 0, lat: 0 })`。
*   **通信方向**：
    1. **【3D 驱动 2D】**：用户鼠标拖拽 3D 地球 -> `threeApp.js` 触发摄像机角度变化 -> 调用 `onRotationChange` 回调 -> `App.vue` 更新 `globeRotation` -> `Map2D.vue` 收到 Props 变动 -> D3 重绘平面图。
    2. **【2D 驱动 3D】**：用户拖拽 `Map2D.vue` 下方滑块或输入数值 -> `Map2D.vue` 发出 `emit('update:rotation')` 事件 -> `App.vue` 更新数据 -> 直接调用 `setGlobeRotation()` API 让 3D 摄像机飞往指定角度。

---

##  4. 团队协同开发规范 (物理标尺与数据源)

团队成员在新增投影或模型时，请严格遵守以下物理空间尺度与数据规范：

### 4.1 全局地形数据引用
为了保证 3D 勾线和 2D 填充的是同一张地图：
*   统一采用轻量级源：`https://unpkg.com/world-atlas@2.0.2/land-110m.json`
*   格式统一为 **TopoJSON**。

### 4.2 三维空间尺度规范 (核心)
在 `threeApp.js` 中扩写其它投影几何体时，切勿使用魔术数字，请调用基础常量：
*   **地球半径 (R_EARTH)**：规定为常量 **5.0**。
*   **承载面容差比例**：包裹地球的圆柱、圆锥半径应为 **半径 * 1.01**，防止渲染时出现 Z-Fighting (表面闪烁碰撞)。

### 4.3 标准坐标系转换数学模板
由经纬度推导三维球面空间坐标的方法是通用的，所有成员必须基于此函数衍生：
```javascript
function lonLatToSphere(lon, lat, R) {
  const phi = lat * (Math.PI / 180);
  const lambda = lon * (Math.PI / 180);
  return new THREE.Vector3(
    R * Math.cos(phi) * Math.sin(lambda), // X轴
    R * Math.sin(phi),                    // Y轴 (上)
    R * Math.cos(phi) * Math.cos(lambda)  // Z轴 (深)
  );
}
```

---

##  5. 实战扩展：如何新增一种地图投影 (以圆锥投影为例)

任何小组成员需要负责开发新投影，请按以下 **三个核心步骤** 注入代码：

### STEP 1：底层增加数学算法与 3D 效果 (`src/core/threeApp.js`)
1. 编写经纬度投影到你所需几何体表面的数学函数：
   ```javascript
   // 例：计算经纬度在相切圆锥表面的映射位置
   function lonLatToConic(lon, lat, R) { ... return new THREE.Vector3(...) }
   ```
2. 利用 `THREE.ConeGeometry` 创建圆锥玻璃体外罩，编写配合展开动画的自定义 Shader。
3. 对外导出动画控制宏函数（如：`step1_wrapConic`, `step2_projectConic`, `step3_unfoldConic`）。

### STEP 2：更新 2D 视图控制层 (`src/components/Map2D.vue`)
在绘制平面地图的 D3.js 逻辑中加入条件判断。目前使用的是墨卡托投影：
```javascript
// 若当前处于圆锥模式，切换为 D3 内置算法
const projection = d3.geoConicConformal() // 兰勃特等角圆锥投影等
  .rotate([-centerMeridian.value, -centerLatitude.value, roll.value])
  .scale(scale.value);
```

### STEP 3：关联 UI 层级 (`src/App.vue`)
在左侧边栏 (`<div class="sidebar">`) 中，解除相应的 `disabled` 状态，为新投影绑定步骤按钮：
```html
<button class="menu-btn">② 圆锥投影：兰勃特</button>
<div class="sub-menu">
  <button @click="triggerConicStep(1)">1. 放置切圆锥</button>
  <button @click="triggerConicStep(2)">2. 射线投影分布</button>
  <button @click="triggerConicStep(3)">3. 展开为平面面</button>
</div>
```

---

##  6. 团队注意事项
1. **防止内存泄漏 (Memory Leaks)**：Vue 组件 (`Scene3D.vue`) 在被卸载或销毁时，必须调用 `threeApp.js` 提供的 `destroyScene()`，清除 WebGL 的 `renderer.dispose()` 和 `requestAnimationFrame`，否则频繁切换页面会导致系统卡顿甚至崩溃。
2. **样式解耦**：组件内的特有样式必须增加 `scoped` 标签 (`<style scoped>`) 防止污染全局；全局排版的样式统一在 `App.vue` 底部或 `style.css` 中写。
3. **环境清理**：开发期间由于权限限制可能生成的 `.cjs`, `.bak` 等注入验证脚本均属于废料，请勿将它们提交至 Git 远端仓库代码中。

---

## 👥 7. 团队任务分工与开发要求 (Team Assignments)

目前**项目的基础架构、墨卡托圆柱投影逻辑、UI 主排版层以及 2D/3D 双向联动核心库（张云山完成）**已经搭建完毕。
为了保证最终效果的 UI 一致性、风格统一性和代码健壮性，请**杜明阳**和**张驰**两位成员在接手开发时，严格遵循以下任务划分与共同纪律。

### 🚨 共同开发纪律（必须遵守）
1. **组件与 UI 复用**：无需重新写 UI 框架。请直接复用现有的 `<div class="window-frame">`、侧边栏菜单样式和参数面板 (`.controls-panel`) 样式，保持渐变色、字体大小和边框阴影等完全一致。
2. **不变的常量与数据**：
   - 必须使用同一个地理数据源 `land-110m.json`。
   - 3D 地球半径 `R_EARTH` 必须固定为 **5.0**。地球材质和光照参数禁止随意大改，保持现有视觉质感。
3. **实现双向绑定**：你们添加的投影地图参数，**必须**同墨卡托一样，支持在 2D 地图拖动滑块/输入数值时，通过 `emit('update:rotation')` 反作用于 3D 地球，让地球实时转动到对应的视角。
4. **状态切换机制（需共同完善）**：在 `App.vue` 中新增一个全局状态（如 `currentProjectionType` ），方便在 2D 和 3D 组件中通过 `if/else` 或 `switch` 判断当前应该渲染墨卡托、圆锥还是方位投影，切勿将代码写死冲突。

---

### 👨‍💻 任务分配 1：圆锥投影 (Conic Projection)
**负责人**：杜明阳

*   **开发目标**：实现地球表面投射到相切或相割的圆锥面上，并展开为扇形平面地图（建议实现兰勃特等角圆锥投影 `Lambert Conformal Conic` 或阿尔伯斯等面积投影 `Albers`）。
*   **3D 视觉要求**：
    *   需要引入圆锥体 `THREE.ConeGeometry`。
    *   演示 3 步动画：1. 戴上圆锥纸帽；2. 射线从球心投射至圆锥；3. 圆锥沿母线剪开，平铺为扇形。
*   **需要暴露的自交互 4+ 参数（需做UI控制）**：
    1.  **中心经度 (Center Longitude)**：控制圆锥的旋转对齐，改变平展后扇形的朝向，需反向绑定控制 3D 摄像机偏航。
    2.  **原点纬度 (Latitude of Origin)**：控制圆锥顶点在哪条纬线上，改变其覆盖的半球（北半球/南半球正轴）。
    3.  **标准纬线 1 & 2 (Standard Parallels)**：**（圆锥独有核心参数）** 控制圆锥是相切（两个参数相同）还是相割（两个参数不同），直接影响投影变形度（D3 中使用 `.parallels([lat1, lat2])`）。
    4.  **全局缩放 (Scale)**：控制平面图的缩放。
*   **技术提示**：结合以上参数可实现**正轴圆锥**和**斜轴/横轴圆锥**的演示切换。2D 面板中使用 `d3.geoConicConformal()`。

---

### 👨‍💻 任务分配 2：方位投影 (Azimuthal Projection)
**负责人**：张驰

*   **开发目标**：实现地球表面投射到一个切平面上（建议实现正射投影 `Orthographic` 或 球极平面投影 `Stereographic`）。
*   **3D 视觉要求**：
    *   无需圆柱或圆锥，需要引入切平面 `THREE.PlaneGeometry`，该平面应始终与观察点或地球上某一点相切。
    *   演示 3 步动画：1. 放置切平面到特定经纬度；2. 射线直接垂直于平面/从极点发射进行投影；3. 切平面贴近屏幕（因为已经是平的，无需展开步骤）。
*   **需要暴露的自交互 4 参数（需做UI控制）**：
    1.  **中心经度 (Center Longitude)**：相切点的经度位置。需反向绑定 3D 摄像机和地球旋转角。
    2.  **中心纬度 (Center Latitude)**：**（方位投影区分类型的核心）**：
        - 设为 90° / -90° 时，展示 **极地正轴方位投影**（多用于联合国会徽、极地考察图）。
        - 设为 0° 时，展示 **赤道横轴方位投影**（多用于东西半球图）。
        - 设为其他值时，展示 **斜轴方位投影**。
    3.  **旋转角 (Roll)**：控制平面的自转扭幅。
    4.  **全局缩放 (Scale)**：控制图形大小。
*   **技术提示**：2D 页面建议使用 `d3.geoOrthographic()` 或 `d3.geoStereographic()`，通过 `.rotate([-lon, -lat, roll])` 结合这些参数完美联动。

> 预祝小组作业完成顺利！🌍
