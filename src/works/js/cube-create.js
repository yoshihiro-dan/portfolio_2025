import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';

// カスタムシェーダーの定義
const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
precision mediump float;
varying vec2 vUv;

vec3 color1 = vec3(0.9, 0.2, 0.5);
vec3 color2 = vec3(1.0, 0.9, 0.3);
vec3 color3 = vec3(0.3, 0.3, 0.8);
vec3 color4 = vec3(1.0, 1.0, 1.0);

float noise(vec2 uv) {
    return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    float n = noise(vUv * 1.0) * 0.0;
    vec3 color = mix(color1, color2, vUv.y + n);
    color = mix(color, color3, vUv.x - n);
    color = mix(color, color4, 0.2);

    gl_FragColor = vec4(color, 0.6);
}`;

function createShaderMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
}

function createTextTexture(text, width, height) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `${Math.max(20, width / 7)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.premultiplyAlpha = false;
    return texture;
}

function createTextMesh(text, width, height) {
    const material = new THREE.MeshBasicMaterial({
        map: createTextTexture(text, width, height),
        transparent: true,
        alphaTest: 0.1,
        opacity: 1.0
    });

    return new THREE.Mesh(
        new THREE.PlaneGeometry(1, 0.5),
        material
    );
}

function addTextToCube(cube, width, height, text) {
    const textMesh = createTextMesh(text, width, height);
    const positions = [
        { position: { z: 0.51 }, rotation: { y: 0 } },
        { position: { z: -0.51 }, rotation: { y: Math.PI } },
        { position: { y: -0.51 }, rotation: { x: Math.PI / 2 } },
        { position: { y: 0.51 }, rotation: { x: -Math.PI / 2 } },
        { position: { x: 0.51 }, rotation: { y: Math.PI / 2 } },
        { position: { x: -0.51 }, rotation: { y: -Math.PI / 2 } }
    ];

    positions.forEach(({ position, rotation }) => {
        const clone = textMesh.clone();
        Object.assign(clone.position, position);
        Object.assign(clone.rotation, rotation);
        cube.add(clone);
    });
}

// PC or SP 判定
const isPC = () => window.innerWidth >= 768;

// キューブやWebGLのリソースを管理
let animationFrameId;
const cubes = new Map();
const cameras = new Map();
const renderers = new Map();
const scenes = new Map();

// メモリリーク防止のためのリソース解放関数
function disposeWebGL() {
    cancelAnimationFrame(animationFrameId);

    // 初期の webglBoxes 取得
    let webglBoxes = isPC()
    ? document.querySelectorAll('aside .webgl-box')
    : document.querySelectorAll('section .webgl-box');
    cubes.forEach((cube, webglBox) => {
        if (!cube) return;
        cube.traverse(object => {
            if (object instanceof THREE.Mesh) {
                if (object.material.map) {
                    object.material.map.dispose();
                }
                object.material.dispose();
                object.geometry.dispose();
            }
        });
        cube.removeFromParent();
    });

    scenes.forEach(scene => scene.clear());
    renderers.forEach(renderer => renderer.dispose());

    cubes.clear();
    cameras.clear();
    renderers.clear();
    scenes.clear();

    webglBoxes.forEach(webglBox => {
        webglBox.innerHTML = '';
        // **新しい canvas を作成**
        const newCanvas = document.createElement('canvas');
        newCanvas.classList.add('webgl');
        newCanvas.setAttribute('aria-hidden', 'true');
        webglBox.appendChild(newCanvas);
    });
}

// WebGL初期化関数
function initializeWebGL() {
    return new Promise((resolve) => {
        // 初期の webglBoxes 取得
        let webglBoxes = isPC()
        ? document.querySelectorAll('aside .webgl-box')
        : document.querySelectorAll('section .webgl-box');

        webglBoxes.forEach(webglBox => {
            if (cubes.has(webglBox)) return; // 既に存在する場合は処理しない

            const canvas = webglBox.querySelector('canvas.webgl');
            const boxRect = webglBox.getBoundingClientRect();
            const boxSize = Math.min(boxRect.width, boxRect.height);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
            camera.position.z = 1.5;

            const renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: true,
                premultipliedAlpha: true
            });
            renderer.setSize(boxSize, boxSize);

            cameras.set(webglBox, camera);
            renderers.set(webglBox, renderer);
            scenes.set(webglBox, scene);

            const section = webglBox.closest('section');
            const sectionId = section ? section.id : null;
            const currentSectionId = getCurrentSectionId();
            const initialSectionId = sectionId || currentSectionId;

            const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), createShaderMaterial());
            scene.add(cube);
            addTextToCube(cube, boxRect.width, boxRect.height, initialSectionId);

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.enableZoom = false;

            let lastTime = 0;
            function animate() {
                const currentTime = performance.now();
                if (currentTime - lastTime > 1000 / 80) { // フレームレートを制限
                    lastTime = currentTime;
                    cube.rotation.y += 0.01;
                    controls.update();
                    renderer.render(scene, camera);
                }
                requestAnimationFrame(animate);
            }
            animate();

            cubes.set(webglBox, cube);
        });

        resolve();
    });
}

// キューブのテキスト変更アニメーション
let isAnimating = false;
let lastSectionId = '';
function animateCube(newText) {
    if (window.innerWidth < 768 || isAnimating) return;
    isAnimating = true;
    lastSectionId = newText;

    cubes.forEach((cube, webglBox) => {
        const textMeshes = cube.children.filter(child => child instanceof THREE.Mesh);

        gsap.to(cube.position, {
            x: -2,
            duration: 0.15,
            ease: "power2.inOut",
            onComplete: () => {
                textMeshes.forEach(mesh => {
                    const newTexture = createTextTexture(newText, webglBox.clientWidth, webglBox.clientHeight);
                    mesh.material.map = newTexture;
                    mesh.material.needsUpdate = true;
                });

                cube.position.x = 2;
                gsap.to(cube.position, {
                    x: 0,
                    duration: 0.3,
                    ease: "power2.inOut",
                    onComplete: () => isAnimating = false
                });
            }
        });
    });
}

// スクロールイベントハンドラ
let scrollTimeout = null;
function handleScroll() {
    if (window.innerWidth < 768) return; // PCサイズでない場合は処理しない

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        const currentSectionId = getCurrentSectionId();
        if (currentSectionId && currentSectionId !== lastSectionId) {
            animateCube(currentSectionId);
        }
    }, 100);
}

function getCurrentSectionId() {
    const sections = document.querySelectorAll('section');
    for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
            return section.id;
        }
    }
    return null;
}

function initializeCubeText() {
    const currentSectionId = getCurrentSectionId();
    if (currentSectionId) {
        animateCube(currentSectionId);
    }
}

// 初回ロード時のスクロール監視設定
function updateScrollListener() {
    if (window.innerWidth >= 768) {
        window.addEventListener('scroll', handleScroll);
    } else {
        window.removeEventListener('scroll', handleScroll);
    }
}

// ロードアニメーション
window.addEventListener("DOMContentLoaded", () => {
    requestAnimationFrame(() => {
        document.body.classList.add("fade-in");
    });
});

// **ページのロード時**
window.addEventListener("DOMContentLoaded", () => {
    initializeWebGL().then(() => {
        initializeCubeText();
    });
    updateScrollListener();
});

window.addEventListener('resize', updateScrollListener);

// **ページバック時の対応**
window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        disposeWebGL();
        initializeWebGL().then(() => {
            initializeCubeText();
        });
    }
});

// **ページを離れる前にリソース解放**
window.addEventListener("beforeunload", disposeWebGL)

let resizeTimeout = null;
function handleResize() {
    clearTimeout(resizeTimeout);

    // 初期の webglBoxes 取得
    let webglBoxes = isPC()
    ? document.querySelectorAll('aside .webgl-box')
    : document.querySelectorAll('section .webgl-box');
    resizeTimeout = setTimeout(() => {
        webglBoxes.forEach(webglBox => {
            const renderer = renderers.get(webglBox);
            const scene = scenes.get(webglBox);
            const cube = cubes.get(webglBox);

            if (renderer) {
                renderer.dispose();
                renderers.delete(webglBox);
            }

            // **シーン内のメッシュとテクスチャを完全削除**
            if (scene) {
                scene.traverse(object => {
                    if (object instanceof THREE.Mesh) {
                        if (object.material.map) {
                            object.material.map.dispose();
                            object.material.map = null;
                        }
                        object.material.dispose();
                        object.geometry.dispose();
                    }
                });
                scenes.delete(webglBox);
            }

            cubes.delete(webglBox);
            cameras.delete(webglBox);

            // **webglBoxの内容をクリア**
            webglBox.innerHTML = '';

            // **新しい canvas を作成**
            const newCanvas = document.createElement('canvas');
            newCanvas.classList.add('webgl');
            newCanvas.setAttribute('aria-hidden', 'true');
            webglBox.appendChild(newCanvas);
        });

        webglBoxes = isPC()
            ? document.querySelectorAll('aside .webgl-box')
            : document.querySelectorAll('section .webgl-box');

        disposeWebGL();
        initializeWebGL().then(() => {
            initializeCubeText();
        });
    }, 300);
}

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
} else {
    window.addEventListener('resize', handleResize);
}
