import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function hideLoading() {
    const loading = document.querySelector('.loading-area');
    loading.classList.add('hidden');
    setTimeout(() => {
        loading.classList.remove("hidden");
        loading.style.display = 'none';
    }, 500);
}

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene & Camera
let scene, camera, renderer;

function initializeWebGL() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 4;

    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false;

    // Uniforms
    const uniforms = {
        uTime: { value: 0.0 },
        uColor: { value: new THREE.Color(0x4fc3f7) },
        uGlowStrength: { value: 0.5 },
        uTexture: { value: null },
    };

    // ガラス用マテリアル作成
    const glassMaterial = new THREE.MeshStandardMaterial({
        metalness: 0.8,
        roughness: 0.5,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
    });

    // ホログラムマテリアル
    const hologramMaterial = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            uniform float uTime;

            // 乱数生成
            float random2D(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
            }

            void main() {
                // UV座標
                vUv = uv;
                vUv.y = 1.0 - vUv.y;

                // ポジション操作
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);

                // グリッチ（ランダム性強化）
                float glitchTime = uTime - modelPosition.y;
                float glitchStrength = sin(glitchTime * 1.5) + sin(glitchTime * 3.0) + sin(glitchTime * 6.0);
                glitchStrength /= 3.0;
                glitchStrength = smoothstep(0.3, 1.0, glitchStrength);
                glitchStrength *= 0.25;

                modelPosition.x += (random2D(modelPosition.xz + uTime) - 0.5) * glitchStrength;
                modelPosition.z += (random2D(modelPosition.zx + uTime) - 0.5) * glitchStrength;

                gl_Position = projectionMatrix * viewMatrix * modelPosition;

                // 法線情報
                vec4 modelNormal = modelMatrix * vec4(normal, 0.0);
                vNormal = modelNormal.xyz;
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            uniform sampler2D uTexture;

            void main() {
                // 法線の計算
                vec3 normal = normalize(vNormal);
                if (!gl_FrontFacing) normal *= -1.0;

                // テクスチャカラー取得
                vec4 textureColor = texture2D(uTexture, vUv);

                // ホログラムカラー
                vec3 hologramColor = vec3(0.5, 0.7, 0.2);

                // 最終色の合成
                vec3 finalColor = mix(textureColor.rgb, hologramColor, 0.0);

                gl_FragColor = vec4(finalColor, textureColor.a);
            }
        `,
        uniforms,
        transparent: true,
        side: THREE.DoubleSide
    });

    // テクスチャをユニフォームにセット
    const loader = new THREE.TextureLoader();
    loader.load('/works/textures/name-card.png', (texture) => {   
        texture.flipY = false;
        texture.encoding = THREE.sRGBEncoding;
        uniforms.uTexture.value = texture;
        uniforms.uTexture.needsUpdate = true;
        canvas.style.opacity = '1';
    });

    // PlaneGeometry 作成
    const cardGeometry = new THREE.PlaneGeometry(3, 2, 50, 50);

    // ガラス用メッシュ
    const glassMesh = new THREE.Mesh(cardGeometry, glassMaterial);

    // ホログラム用メッシュ
    const hologramMesh = new THREE.Mesh(cardGeometry, hologramMaterial);
    hologramMesh.position.z = 0.01;

    // グループ化してシーンに追加
    const cardGroup = new THREE.Group();
    cardGroup.add(glassMesh);
    cardGroup.add(hologramMesh);
    scene.add(cardGroup);

    // ライトの追加
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 10, 100);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    glassMaterial.envMapIntensity = 1.0; // 環境マップの反射強度
    glassMaterial.needsUpdate = true;

    // アニメーションループ
    const clock = new THREE.Clock();

    const maxRotationX = Math.PI;
    const minRotationX = -Math.PI;
    const maxRotationY = Math.PI;
    const minRotationY = -Math.PI;

    // 8の字の軌道に基づく振動パラメータ
    const frequencyX = 0.5;
    const frequencyY = 0.5;
    const amplitudeX = Math.PI / 4.0;  // 横方向の振幅
    const amplitudeY = Math.PI / 6.0;  // 縦方向の振幅

    // 最初の状態を正面から開始
    let initialTimeOffset = Math.PI;

    function animate() {
        const elapsedTime = clock.getElapsedTime();

        cardGroup.rotation.x = Math.max(minRotationX, Math.min(maxRotationX, amplitudeX * Math.sin(frequencyX * elapsedTime + initialTimeOffset)));
        cardGroup.rotation.y = Math.max(minRotationY, Math.min(maxRotationY, amplitudeY * Math.cos(frequencyY * elapsedTime + initialTimeOffset)));

        uniforms.uTime.value = elapsedTime;
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    animate();

    // Raycaster とマウス座標
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const targets = [glassMesh, hologramMesh];

    // レイをセットする処理
    const setRay = (event) => {
        // マウス座標を正規化 (-1 to 1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // カメラの前方 1 ユニット手前をレイの発射位置にする
        const rayOrigin = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z - 1.0);

        // マウス座標に基づく方向を計算
        const rayDirection = new THREE.Vector3();
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.direction.normalize();
        rayDirection.copy(raycaster.ray.direction);

        // カスタム発射位置からレイを投射
        raycaster.set(rayOrigin, rayDirection);

        return raycaster.intersectObjects(targets, false);
    };

    // カーソルを更新する処理
    const updateCursor = (intersects) => {
        if (intersects.length > 0) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'default';
        }
    };

    // クリック時の遷移処理
    const handleClick = async (event) => {
        // canvas上でクリックされたかチェック
        if (!canvas.contains(event.target)) {
            return;
        }

        const intersects = setRay(event);
        if (intersects.length > 0) {
            // 新しいページURL
            const currentUrl = window.location.pathname;
            const pathParts = currentUrl.split('/');
            const lastPath = pathParts.filter(Boolean).pop();
            const targetUrl = lastPath ? `/${lastPath}/skills-achievements.html` : '/skills-achievements.html';

            if (document.startViewTransition) {
                document.startViewTransition(() => {
                    document.body.classList.add("slide-out");
                    setTimeout(() => {
                        window.location.href = targetUrl;
                    }, 500);
                });
            } else {
                // フォールバック処理（非対応ブラウザ向け）
                document.body.classList.add("slide-out");
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 500);
            }
        }
    };

    // 画面全体でカーソルの変化を監視
    window.addEventListener("mousemove", (event) => {
        if (!canvas.contains(event.target)) {
            document.body.style.cursor = 'default';
            return;
        }
        const intersects = setRay(event);
        updateCursor(intersects);
    });

    // クリックイベント処理
    window.addEventListener("click", handleClick);

    hideLoading();
}

// ブラウザバック対応
let isVisibilityChanged = false;

// スマホ端末の判定
function isMobileDevice() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
}

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && isMobileDevice()) {
        // document.body.classList.remove("slide-out");
        window.location.reload(true);
        isVisibilityChanged = true;
    }
});

window.addEventListener("pageshow", (event) => {
    if (event.persisted && !isVisibilityChanged) {
        document.body.classList.remove("slide-out");
    }
    isVisibilityChanged = false;
});

// ウィンドウリサイズ対応
function updateViewportSize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function handleResize() {
    const width = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    updateViewportSize(width, height);
}

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
} else {
    window.addEventListener('resize', handleResize);
}

initializeWebGL();  // 初期化処理
