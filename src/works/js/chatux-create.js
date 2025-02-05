const currentUrl = window.location.pathname;
const pathParts = currentUrl.split('/');
const lastPath = pathParts.filter(Boolean).pop();
const infoUrl = lastPath ? `/${lastPath}/skills-achievements.html` : '/skills-achievements.html';

const chatux = new ChatUx();
const initParam = {
    renderMode: 'auto',
    api: {
        endpoint: 'https://script.google.com/macros/s/AKfycbxvhs6xvJ0tS4jP0_AgDPivRgualqUdg_hatE8JzYpVdLVVlFb2SAdVYWmXKOwUZqli/exec',
        method: 'GET',
        dataType: 'jsonp',
        escapeUserInput: true,
        errorResponse: {
            output: [
                {type: 'html', value: `ネットワークエラーが発生しました。しばらく待ってから再度アクセスしてください。<br>お急ぎの方は、リンクから<a href="${infoUrl}">スキル・実績一覧ページ</a>をご確認ください。`}
            ]
        }
    },
    bot: {
        //チャットUI起動時に自動的にサーバーに送るテキスト
        wakeupText: 'start',
        //ボット側のアイコン画像URL
        botPhoto: 'https://nisot.noor.jp/works/img/bot_icon_man.png',
        //ユーザー側のアイコン画像URL
        humanPhoto: 'https://nisot.noor.jp/works/img/bot_icon_pen.png',
        widget: {
            sendLabel: '送信',
            placeHolder: ''
        }
    },
    window: {
        //ウィンドウのタイトル
        title: 'About Me',
        //チャットウィンドウ左上のアイコンをクリックしたときにジャンプするURL
        infoUrl: infoUrl,
        size: {
            width: 350,//ウィンドウの幅
            height: 500,//ウィンドウの高さ
            minWidth: 300,//ウィンドウの最小幅
            minHeight: 300,//ウィンドウの最小高さ
            titleHeight: 50//ウィンドウのタイトルバー高さ
        },
        appearance: {
            //ウィンドウのボーダースタイル
            border: {
                shadow: '0 0 2px rgba(96, 111, 151, 1.0)',//影
                width: 0,//ボーダーの幅
                radius: 3,//ウィンドウの角丸半径
            },
            //ウィンドウのタイトルバーのスタイル
            titleBar: {
                fontSize: 14,
                color: 'white',
                background: '#1a2a48',
                leftMargin: 40,
                height: 40,
                buttonWidth: 36,
                buttonHeight: 16,
                buttonColor: 'white',
                buttons: [
                    //閉じるボタン
                    {
                        //閉じるボタンのアイコン(fontawesome)
                        fa: 'fas fa-times',
                        name: 'hideButton',
                        visible: true  //true:表示する
                    }
                ],
                buttonsOnLeft: [
                    //左上のinforUrlボタン
                    {
                        fa: 'fas fa-comment-alt',//specify font awesome icon
                        name: 'info',
                        visible: true  //true:表示する
                    }
                ],
            },
        }
    },
    wakeupButton: {
        right: 20,
        bottom: 20,
        size: 60,
        fontSize: 25//フォントサイズ
    },
    methods: {
        onServerResponse: (response) => {
            // console.log('#onServerResponse response=' + JSON.stringify(response));
            // DOMが描画されるタイミングを待つ
            setTimeout(() => {
                const optionButtons = document.querySelectorAll('.botui-actions-buttons-button');
                response.output.forEach((item) => {
                    if (item.type === 'option' && item.options) {
                        const options = item.options;
                        // ボタンとオプションの順番を対応付け
                        options.forEach((option, index) => {
                            const button = optionButtons[index];
                            if (button) {
                                if (option.disabled) {
                                    button.classList.add('disabled-option');
                                    button.setAttribute('disabled', true);
                                } else {
                                    button.classList.add('enabled-option');
                                }
                            }
                        });
                    }
                });       
            }, 500);
            return response;
        }
    },
};
chatux.init(initParam);
if(chatux.isMobileDevice()) {
    chatux.start(false);
} else {
    chatux.start(true);
    // console.log("run 1")
}