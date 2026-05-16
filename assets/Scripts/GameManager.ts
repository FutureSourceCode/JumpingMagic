import { _decorator, CCInteger, CCFloat, Component, instantiate, Label, Node, Prefab, Vec3 } from 'cc';
import { BLOCK_SIZE, PlayerController } from './PlayerController';
import { Watch } from './Watch';
import { CloudController } from './CloudController';

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

    @property({ type: CCInteger })
    public roadLength: number = 100;

    @property({ type: CCFloat, range: [0, 1] })
    public cloudSpawnRate: number = 0.3;

    private _road: BlockType[] = [];
    private _activeClouds: Map<number, Node> = new Map();

    @property({ type: Node })
    public startMenu: Node | null = null;

    @property({ type: PlayerController })
    public playerCtrl: PlayerController | null = null;

    @property({ type: Label })
    public stepsLabel: Label | null = null;

    @property({ type: Node })
    public watch: Node | null = null;

    public restartButton: Node = null;
    public continueButton: Node = null;
    public useTime: Node = null;

    // 记录游戏结束时的位置（用于继续游戏）
    private _endIndex: number = 0;

    start() {
        this.setCurState(GameState.GS_INIT);
        this.playerCtrl?.node.on('JumpEnd', this.onPlayerJumpEnd, this);
        this.useTime = this.startMenu.getChildByName('timelabel');
        this.restartButton = this.startMenu.getChildByName('Button').getChildByName('restart');
        this.restartButton.setPosition(195.994, 7.815);
        this.continueButton = this.startMenu.getChildByName('Button').getChildByName('continue');

        // 绑定按钮点击事件
        this.restartButton.on('click', this.onRestartButtonClicked, this);
        this.continueButton.on('click', this.onContinueButtonClicked, this);
    }

    init() {
        if (this.startMenu) {
            this.startMenu.active = true;
        }
        this.watch.getComponent(Watch).pauseBtn();
        this.node.getChildByName('blocks').removeAllChildren();

        this._activeClouds.forEach(cloud => cloud.destroy());
        this._activeClouds.clear();
        this.node.getChildByName('clouds')?.removeAllChildren();

        this.generateRoad();

        if (this.playerCtrl) {
            this.playerCtrl.setInputActive(false);
            this.playerCtrl.node.setPosition(Vec3.ZERO);
            this.playerCtrl.reset();
        }
    }

    setUseTime(label: string) {
        if (this.useTime && this.watch) {
            const watchLabel = this.watch.getChildByName('label')?.getComponent(Label);
            if (watchLabel) {
                this.useTime.getComponent(Label).string = label + watchLabel.string;
            }
        }
    }

    setCurState(value: GameState) {
        switch (value) {
            case GameState.GS_INIT:
                this.init();
                break;

            case GameState.GS_PLAYING:
                if (this.startMenu) this.startMenu.active = false;
                if (this.stepsLabel) this.stepsLabel.string = '0';
                this.watch.getComponent(Watch).resetBtn();

                setTimeout(() => {
                    if (this.playerCtrl) this.playerCtrl.setInputActive(true);
                }, 100);
                break;

            case GameState.GS_CONTINUE:
                if (this.startMenu) this.startMenu.active = false;
                // 继续计时
                this.watch.getComponent(Watch).startBtn();

                // ======================
                // 核心修改：找到前方最近实心方块
                // ======================
                let targetIndex = this._endIndex;
                for (let i = this._endIndex + 1; i < this._road.length; i++) {
                    if (this._road[i] === BlockType.BT_STONE) {
                        targetIndex = i;
                        break;
                    }
                }

                // 移动到实心方块
                this.playerCtrl.forceMoveToIndex(targetIndex);
                this.stepsLabel.string = targetIndex.toString();

                // ======================
                // 延迟1秒让云朵下落
                // ======================
                const cloud = this._activeClouds.get(targetIndex);
                if (cloud) {
                    setTimeout(() => {
                        const ctrl = cloud.getComponent(CloudController);
                        ctrl?.startFall();
                    }, 1000);
                }

                // 恢复玩家输入
                this.playerCtrl.setInputActive(true);
                break;

            case GameState.GS_END:
                this.watch.getComponent(Watch).pauseBtn();
                if (this.playerCtrl) this.playerCtrl.setInputActive(false);
                this.startMenu.active = true;
                this.restartButton.setPosition(56.8805, 7.815);
                this.continueButton.active = true;
                this.setUseTime('挑战失败！用时：');
                break;
        }
    }

    generateRoad() {
        this.node.getChildByName('blocks').removeAllChildren();
        this._road = [];
        this._road.push(BlockType.BT_STONE);

        for (let i = 1; i < this.roadLength; i++) {
            if (this._road[i - 1] === BlockType.BT_NONE) {
                this._road.push(BlockType.BT_STONE);
            } else {
                this._road.push(Math.floor(Math.random() * 2));
            }
        }

        for (let j = 0; j < this._road.length; j++) {
            const type = this._road[j];
            if (type === BlockType.BT_STONE) {
                const block = instantiate(this.blockPrefab);
                this.node.getChildByName('blocks').addChild(block);
                block.setPosition(j * BLOCK_SIZE, -58, 0);

                if (Math.random() < this.cloudSpawnRate && j > 0) {
                    this.spawnCloud(j);
                }
            }
        }
    }

    spawnCloud(index: number) {
        if (!this.cloudPrefab) return;
        const cloudNode = instantiate(this.cloudPrefab);
        this.node.getChildByName('clouds').addChild(cloudNode);
        cloudNode.setPosition(index * BLOCK_SIZE, 180, 0);

        const ctrl = cloudNode.getComponent(CloudController);
        if (ctrl) {
            ctrl.blockIndex = index;
            cloudNode.on('CloudFallDead', this.onCloudFallDead, this);
        }

        this._activeClouds.set(index, cloudNode);
    }

    onCloudFallDead(index: number) {
        this._endIndex = index; // 记录死亡位置
        if (this.playerCtrl && this.playerCtrl.getCurMoveIndex() === index) {
            this.setCurState(GameState.GS_END);
        }
        const cloud = this._activeClouds.get(index);
        if (cloud) {
            cloud.off('CloudFallDead', this.onCloudFallDead, this);
            cloud.destroy();
            this._activeClouds.delete(index);
        }
    }

    onPlayerJumpEnd(moveIndex: number) {
        if (this.stepsLabel) {
            this.stepsLabel.string = moveIndex.toString();
        }

        const cloud = this._activeClouds.get(moveIndex);
        if (cloud) {
            const ctrl = cloud.getComponent(CloudController);
            ctrl?.startFall();
        }

        this._activeClouds.forEach((cloud, idx) => {
            if (idx < moveIndex) {
                cloud.destroy();
                this._activeClouds.delete(idx);
            }
        });

        this.checkResult(moveIndex);

        if (moveIndex >= this.roadLength) {
            this.setUseTime('恭喜通关！用时：');
            this.setCurState(GameState.GS_INIT);
        }
    }

    checkResult(moveIndex: number) {
        if (moveIndex < this.roadLength) {
            if (this._road[moveIndex] == BlockType.BT_NONE) {
                this._endIndex = moveIndex; // 记录死亡位置
                this.setCurState(GameState.GS_END);
            }
        } else {
            this.setCurState(GameState.GS_INIT);
        }
    }

    onStartButtonClicked() {
        this.setCurState(GameState.GS_PLAYING);
    }

    // 重新开始按钮点击事件
    onRestartButtonClicked() {
        this.continueButton.active = false;
        this.setCurState(GameState.GS_INIT);
        setTimeout(() => {
            this.setCurState(GameState.GS_PLAYING);
        }, 100);
    }

    // 继续游戏按钮点击事件
    onContinueButtonClicked() {
        this.continueButton.active = false;
        this.restartButton.setPosition(195.994, 7.815);
        this.setCurState(GameState.GS_CONTINUE);
    }

    protected update(dt: number): void {
        if (!this.startMenu.active) {
            this.watch.getComponent(Watch).startBtn();
        }
    }
}