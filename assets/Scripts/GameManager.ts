import { _decorator, Component, instantiate, Label, Node, Prefab, Vec3, director, Color, AudioSource, AudioClip, Sprite } from 'cc';
import { BLOCK_SIZE, PlayerController } from './PlayerController';
import { Watch } from './Watch';
import { CloudController } from './CloudController';
import { RecordManager } from './RecordManager';
import { BgSwitch } from './BgSwitch';

const { ccclass, property } = _decorator;

enum BlockType {
    BT_NONE,
    BT_STONE,
};

enum GameState {
    GS_INIT,
    GS_PLAYING,
    GS_CONTINUE,
    GS_END,
};

@ccclass('GameManager')
export class GameManager extends Component {
    @property({ type: Prefab })
    public blockPrefab: Prefab | null = null;
    @property({ type: Prefab })
    public cloudPrefab: Prefab | null = null;

    @property({ type: Node })
    public startMenu: Node | null = null;
    @property({ type: PlayerController })
    public playerCtrl: PlayerController | null = null;
    @property({ type: Label })
    public stepsLabel: Label | null = null;
    @property({ type: Node })
    public watch: Node | null = null;
    @property({ type: RecordManager })
    public recordManager: RecordManager = null!;

    //背景
    @property({ type: BgSwitch })
    public bg: BgSwitch | null = null;

    //传送门预制体
    @property({ type: Prefab })
    public portal: Prefab = null!;


    @property({ type: AudioClip })
    public portalMusic: AudioClip = null!;

    public restartButton: Node = null!;
    public continueButton: Node = null!;
    public useTime: Node = null!;
    private _endIndex: number = 0;
    public isPause: boolean = false;
    private _killCloudIndex: number = -1;

    public cloudSpawnRate: number = 0.2;    // 初始概率
    public cloudFallSpeed: number = 100;   // 初始速度
    public readonly maxCloudRate = 0.4;    // 最高概率 0.4
    public readonly maxCloudSpeed = 500;   // 最高速度 500

    private bgMusic: AudioSource = null;

    private _road: BlockType[] = [];
    public _activeClouds: Map<number, Node> = new Map();

    private _isButtonLocked: boolean = false;
    // 每通关一关累加100的基数
    private baseStep: number = 0;

    //草块颜色列表：紫色、粉丝、红色、蓝色、绿色、白色
    private blockColorList: string[] = ['E991F5', 'F5BAEE', 'C64181', '41C1F3', '43CC17', 'FFFFFF']


    start() {

        //音乐播放器
        this.bgMusic = this.node.getComponent(AudioSource);


        if (!this.playerCtrl || !this.startMenu || !this.watch || !this.stepsLabel) {
            console.error("GameManager 关键组件未配置！");
            return;
        }

        this.playerCtrl.node.on('JumpEnd', this.onPlayerJumpEnd, this);

        this.useTime = this.startMenu.getChildByName('timelabel');
        const buttonRoot = this.startMenu.getChildByName('Button');
        if (!buttonRoot) {
            console.error("开始菜单按钮根节点未找到！");
            return;
        }
        this.restartButton = buttonRoot.getChildByName('restart')!;
        this.continueButton = buttonRoot.getChildByName('continue')!;

        this.restartButton.off('click', this.onRestartButtonClicked, this);
        this.restartButton.on('click', this.onRestartButtonClicked, this);
        this.continueButton.off('click', this.onContinueButtonClicked, this);
    }

    initGame() {
        if (this.startMenu) this.startMenu.active = true;
        this.watch?.getComponent(Watch)?.pauseBtn();

        if (this.playerCtrl) {
            this.playerCtrl.setInputActive(false);
            this.playerCtrl.node.setPosition(Vec3.ZERO);
            this.playerCtrl.reset();
        }

        this.restartButton.setPosition(195.994, 7.815);
        this.continueButton.active = false;

        const titleLabel = this.startMenu.getChildByName('Title')?.getComponent(Label);
        if (titleLabel) titleLabel.string = '魔法跃行';
    }

    setUseTime(isSuccess: boolean) {
        if (!this.useTime || !this.watch || !this.stepsLabel) return;

        const watchLabel = this.watch.getChildByName('label')?.getComponent(Label);
        if (!watchLabel) return;

        const steps = this.stepsLabel.string || '0';
        const time = watchLabel.string || '00:00.00';
        const prefix = isSuccess ? '恭喜通关！' : '挑战失败！';
        this.useTime.getComponent(Label).string = `${prefix} 步数：${steps} 用时：${time}`;
    }
    private saveStepStr: string = "0";
    setCurState(value: GameState) {
        this._isButtonLocked = false;

        switch (value) {
            case GameState.GS_INIT:
                this.initGame();
                break;

            case GameState.GS_PLAYING:
                if (this.startMenu) this.startMenu.active = false;
                this.isPause = false;
                setTimeout(() => {
                    this.watch?.getComponent(Watch)?.startBtn();
                    if (this.playerCtrl) this.playerCtrl.setInputActive(true);
                }, 100);
                break;

            case GameState.GS_CONTINUE:
                if (this.startMenu) this.startMenu.active = false;
                this.watch?.getComponent(Watch)?.startBtn();

                let safeIndex = this._endIndex;
                for (let i = this._endIndex + 1; i < this._road.length; i++) {
                    if (this._road[i] === BlockType.BT_STONE) {
                        const cloudNode = this._activeClouds.get(i);
                        if (!cloudNode) {
                            safeIndex = i;
                            break;
                        }
                        const ctrl = cloudNode.getComponent(CloudController);
                        if (ctrl.isFalling || ctrl._isLanded) {
                            continue;
                        }
                        safeIndex = i;
                        break;
                    }
                }

                if (this.playerCtrl) {
                    this.playerCtrl.forceMoveToIndex(safeIndex);
                    let realStep = this.baseStep + safeIndex;
                    this.stepsLabel.string = realStep.toString();
                }

                if (this._killCloudIndex > -1) {
                    const killCloud = this._activeClouds.get(this._killCloudIndex);
                    if (killCloud && killCloud.isValid) {
                        const cloudCtrl = killCloud.getComponent(CloudController);
                        if (cloudCtrl) {
                            cloudCtrl.startFall();
                        }
                    }
                    this._killCloudIndex = -1;
                }

                const cloud = this._activeClouds.get(safeIndex);
                if (cloud) {
                    setTimeout(() => {
                        const ctrl = cloud.getComponent(CloudController);
                        ctrl?.startFall();
                    }, 1000);
                }

                if (this.playerCtrl) this.playerCtrl.setInputActive(true);
                break;

            case GameState.GS_END:
                this.watch?.getComponent(Watch)?.pauseBtn();
                if (this.playerCtrl) this.playerCtrl.setInputActive(false);

                setTimeout(() => {
                    if (this.startMenu) this.startMenu.active = true;
                }, 150);

                this.restartButton.setPosition(56.8805, 7.815);
                this.continueButton.active = true;
                this.setUseTime(false);
                break;
        }
    }

    public triggerGameOver() {
        if (!this.playerCtrl) return;
        this._endIndex = this.playerCtrl.getCurMoveIndex();
        let nowTime = "00:00.00";
        const timeLab = this.watch?.getChildByName("label")?.getComponent(Label);
        if (timeLab) nowTime = timeLab.string;
        const realTotalSteps = this.baseStep + this._endIndex;

        if (this.recordManager) {
            this.recordManager.updateRecord(realTotalSteps, nowTime);
        }

        this.setCurState(GameState.GS_END);
    }

    //生成草块
    public roadLength: number = 102;
    generateRoad() {
        if (!this.blockPrefab || !this.cloudPrefab || !this.portal) {
            console.error("预制体未配置！");
            return;
        }

        const blockParent = this.node.getChildByName('blocks');
        const cloudParent = this.node.getChildByName('clouds');
        if (!blockParent || !cloudParent) {
            console.error("道路/云块父节点未找到！");
            return;
        }

        blockParent.removeAllChildren();
        cloudParent.removeAllChildren();
        this._activeClouds.forEach((node) => {
            if (node.isValid) node.destroy();
        });
        this._activeClouds.clear();

        this._road = [];
        this._road.push(BlockType.BT_STONE);
        for (let i = 1; i < this.roadLength; i++) {
            if (i === 100 || i === 99) {
                this._road.push(BlockType.BT_STONE);
            }
            else if (i == 101) {
                this._road.push(BlockType.BT_NONE);
            }
            else {
                this._road.push(this._road[i - 1] === BlockType.BT_NONE ? BlockType.BT_STONE : Math.floor(Math.random() * 2));
            }
        }

        // 按背景索引取色
        const bgIndex = this.bg ? this.bg.getCurrentIndex() : 0;
        const colorHex = this.blockColorList[bgIndex % this.blockColorList.length];
        const blockColor = this.hexToColor(colorHex);

        for (let j = 0; j < this._road.length; j++) {
            const type = this._road[j];
            if (type === BlockType.BT_STONE) {
                const block = instantiate(this.blockPrefab);
                blockParent.addChild(block);
                block.setPosition(j * BLOCK_SIZE, -58, 0);

                // 设置草块颜色
                const sprite = block.getComponent(Sprite);
                if (sprite) sprite.color = blockColor;

                if (Math.random() < this.cloudSpawnRate && j > 0 && j !== 100 && j !== 99) {
                    this.spawnCloud(j);
                }
            }
        }

        // 传送门
        const portalNode = instantiate(this.portal);
        blockParent.addChild(portalNode);
        portalNode.setPosition(100 * BLOCK_SIZE, 32, 0);
    }

    // 16进制颜色转换
    hexToColor(hex: string): Color {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return new Color(r, g, b, 255);
    }

    spawnCloud(index: number) {
        if (!this.cloudPrefab) return;

        const cloudNode = instantiate(this.cloudPrefab);
        const cloudParent = this.node.getChildByName('clouds');
        if (!cloudParent) return;

        cloudParent.addChild(cloudNode);
        cloudNode.setPosition(index * BLOCK_SIZE, 500, 0);

        const ctrl = cloudNode.getComponent(CloudController);
        if (ctrl) {
            ctrl.blockIndex = index;
            ctrl.gameManager = this;
            ctrl.blockY = 0;
            ctrl.fallSpeed = this.cloudFallSpeed;
        }
        this._activeClouds.set(index, cloudNode);
    }

    onPlayerJumpEnd(moveIndex: number) {
        if (moveIndex < 0 || moveIndex >= this.roadLength) return;

        if (this.stepsLabel) {
            let total = this.baseStep + moveIndex;
            this.stepsLabel.string = total.toString();
        }

        this._activeClouds.forEach((cloudNode, idx) => {
            if (!cloudNode.isValid) {
                this._activeClouds.delete(idx);
                return;
            }

            const dis = idx - moveIndex;
            if (dis >= 0 && dis <= 2) {
                const ctrl = cloudNode.getComponent(CloudController);
                if (ctrl && !ctrl.isFalling && !ctrl._isLanded) {
                    ctrl.startFall();
                }
            }
        });

        this.checkCloudAndBlockOverlap(moveIndex);

        if (moveIndex >= this.roadLength - 2) {
            this.onBgSwitch();
            return;
        }

        this.checkResult(moveIndex);
    }

    checkCloudAndBlockOverlap(moveIndex: number) {
        if (moveIndex < 0 || moveIndex >= this.roadLength) return;
        const hasBlock = this._road[moveIndex] === BlockType.BT_STONE;
        const cloudNode = this._activeClouds.get(moveIndex);
        const hasLandedCloud = cloudNode && cloudNode.isValid && cloudNode.getComponent(CloudController)?._isLanded;

        if (hasBlock && hasLandedCloud) {
            this._endIndex = moveIndex;
            cloudNode?.getComponent(CloudController)?.playHitPlayerSound();
            this.triggerGameOver();
        }
    }

    checkResult(moveIndex: number) {
        if (moveIndex < this.roadLength && this._road[moveIndex] === BlockType.BT_NONE) {
            this._endIndex = moveIndex;
            this.triggerGameOver();
        }
    }

    onStartGameBtn() {
        this.generateRoad();
        this.setCurState(GameState.GS_PLAYING);
    }

    public getCurPlayerIndex(): number {
        return this.playerCtrl?.getCurMoveIndex() || 0;
    }

    onRestartButtonClicked() {
        this.bg?.switchToIndexImmediately(0);
        this.baseStep = 0;

        // 重置难度 
        this.cloudSpawnRate = 0.2;
        this.cloudFallSpeed = 100;

        if (this._isButtonLocked) return;
        this._isButtonLocked = true;

        this.continueButton.active = false;

        if (this.playerCtrl) {
            this.playerCtrl.node.setPosition(Vec3.ZERO);
            this.playerCtrl.reset();
        }

        if (this.stepsLabel) this.stepsLabel.string = '0';
        this.watch?.getComponent(Watch)?.resetBtn();

        this.generateRoad();
        this.setCurState(GameState.GS_PLAYING);
    }

    onContinueButtonClicked() {
        if (this._isButtonLocked) return;
        this._isButtonLocked = true;

        if (this.isPause) {
            this.isPause = false;
            director.resume();
            const titleLabel = this.startMenu?.getChildByName('Title')?.getComponent(Label);
            if (titleLabel) titleLabel.string = '魔法跃行';
            this.startMenu!.active = false;
            this.watch?.getComponent(Watch)?.startBtn();
            this.playerCtrl?.setInputActive(true);
        } else {
            const titleLabel = this.startMenu?.getChildByName('Title')?.getComponent(Label);
            if (titleLabel) titleLabel.string = '魔法跃行';
            this.restartButton.active = true;
            this.continueButton.active = false;
            this.restartButton.setPosition(195.994, 7.815);
            this.setCurState(GameState.GS_CONTINUE);
        }
    }

    //切换背景
    onBgSwitch() {
        this.baseStep += 100;
        this.node.getComponent(AudioSource)?.playOneShot(this.portalMusic, 1);
        this.bg?.nextBackground();

        // 每次+0.1，最高0.4
        this.cloudSpawnRate = Math.min(this.cloudSpawnRate + 0.1, this.maxCloudRate);
        this.cloudFallSpeed = Math.min(this.cloudFallSpeed + 50, this.maxCloudSpeed);

        if (this.playerCtrl) {
            this.playerCtrl.node.setPosition(Vec3.ZERO);
            this.playerCtrl.reset();
        }

        this.generateRoad();
        this.setCurState(GameState.GS_PLAYING);
    }

    onDestroy() {
        this.playerCtrl?.node.off('JumpEnd', this.onPlayerJumpEnd, this);
        this.restartButton.off('click', this.onRestartButtonClicked, this);
        this.continueButton.off('click', this.onContinueButtonClicked, this);
    }

    public setKillCloudIndex(index: number) {
        this._killCloudIndex = index;
    }

    protected update(dt: number): void { }
}