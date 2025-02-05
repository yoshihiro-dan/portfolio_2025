document.addEventListener("DOMContentLoaded", () => {
    const starsContainer = document.querySelector(".stars");
    const button = document.querySelector("#chat_wakeup");

    const STAR_COUNT = 250;
    const MIN_SIZE = 1;
    const MAX_SIZE = 2;
    const MAX_ANIMATION_DELAY = 10;

    let stars = [];
    let isAnimating = false; // クリック制御用フラグ
    const isPC = () => {
        return !/Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
    };

    // 星を生成する関数
    const createStar = () => {
        const starEl = document.createElement("span");
        starEl.classList.add("star");
        const size = Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE;
        const animationDelay = `${Math.random() * MAX_ANIMATION_DELAY}s`;
        const position = getRandomPosition();

        Object.assign(starEl.style, {
            width: `${size}px`,
            height: `${size}px`,
            left: position.left,
            top: position.top,
            animationDelay,
            position: "absolute"
        });

        return starEl;
    };

    // ランダムな位置（パーセンテージで指定）
    const getRandomPosition = () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`
    });

    // 星の初期化
    const initializeStars = () => {
        isAnimating = true; // 星の配置中はボタン無効化
        starsContainer.innerHTML = ""; // 古い星をクリア
        stars = Array.from({ length: STAR_COUNT }).map(createStar);
        starsContainer.append(...stars);
        setTimeout(() => {
            isAnimating = false; // 星の配置完了後にボタンを再び有効化
        }, 500); // 星の描画が完了するまで待つ
    };

    // 現在の時刻を文字列で取得
    const getTimeString = () => {
        const now = new Date();
        return now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
    };

    // 星が時刻の中央に集まりながら消えるアニメーション
    const animateStarsToTimeCenter = () => {
        if (isAnimating) return; // すでにアニメーション中なら無視
        isAnimating = true; // アニメーション開始時にフラグをセット

        const timeElement = createTimeElement();
        const rect = timeElement.getBoundingClientRect();

        stars.forEach((star) => {
            const delay = `${Math.random() * 1.2}s`;
            const targetX = `${Math.random() * rect.width * 0.25 + rect.left * 1.50}px`;
            const targetY = `${Math.random() * rect.width * 0.25 + rect.top}px`;

            animateStar(star, targetX, targetY, delay);
        });

        setTimeout(() => showTime(timeElement), 1500);
    };

    // 星のアニメーション
    const animateStar = (star, targetX, targetY, delay) => {
        star.style.transition = `all 1.5s cubic-bezier(0.25, 0.8, 0.25, 1) ${delay}`;
        star.style.left = targetX;
        star.style.top = targetY;
        star.style.width = "0";
        star.style.height = "0";
        star.style.opacity = "0";
    };

    // 時刻の要素を作成
    const createTimeElement = () => {
        const timeElement = document.createElement("div");
        timeElement.classList.add("time");
        timeElement.textContent = getTimeString();
        Object.assign(timeElement.style, {
            position: "absolute",
            top: "10px",
            left: "10px",
            fontSize: "16px",
            fontFamily: "monospace, Courier, Courier New",
            color: "#fff",
            opacity: "0",
            transition: "opacity 2s ease-in-out"
        });

        starsContainer.appendChild(timeElement);
        return timeElement;
    };

    // 時刻を表示する
    const showTime = (timeElement) => {
        setTimeout(() => {
            timeElement.style.opacity = "1";
        }, 0);

        setTimeout(() => {
            timeElement.style.transition = "opacity 0.7s ease-in-out";
            timeElement.style.opacity = "0";

            setTimeout(() => {
                timeElement.remove();
                recreateStars();
            }, 700);
        }, 3000);
    };

    // 星を再配置
    const recreateStars = () => {
        initializeStars(); // 星の再配置時にも isAnimating を管理
    };

    // ボタンがクリックされた時に星を中央に集める（PC のみ）
    if (button !== null && isPC()) {
        button.addEventListener("click", animateStarsToTimeCenter);
    }

    // 初期化
    initializeStars();
});
