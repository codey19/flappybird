import BaseScene from "./BaseScene";

const PIPES_TO_RENDER = 4;

class PlayScene extends BaseScene {
    constructor(config) {
        super('PlayScene', {...config, canGoBack: true});
        this.bird = null; 
        this.pipes = null;

        this.pipeHorizontalDistance = 0;
        this.flapVelocity = 300;
        this.pipeVelocity = 150;

        this.score = 0;
        this.scoreText = '';

        this.isPaused = false;
        this.currentDifficulty = 'easy';
        this.difficulties = {
            'easy': {
                pipeHorizontalDistanceRange: [300, 350],
                pipeVerticalDistanceRange: [450, 600]
            },
            'normal': {
                pipeHorizontalDistanceRange: [280, 330],
                pipeVerticalDistanceRange: [350, 500]
            },
            'hard': {
                pipeHorizontalDistanceRange: [250, 310],
                pipeVerticalDistanceRange: [250, 400]
            },
        };
    }

    create() {
        this.currentDifficulty = 'easy';
        super.create();
        this.createBird();
        this.createPipes();
        this.createColliders();
        this.createScore();
        this.createPause();
        this.handleInputs();
        this.listenToEvents();
    }

    update() {
        // 60fps, 60 times/sec, 
        this.checkGameStatus();
        this.recylePipes();
    }
        
    createBG() {
        this.add.image(0, 0, 'sky').setOrigin(0);
    }

    createBird() {
        this.bird = this.physics.add.sprite(this.config.startPosition.x, this.config.startPosition.y, 'bird').setOrigin(0);
        this.bird.body.gravity.y = 400;    
    }

    createPipes() {
        this.pipes = this.physics.add.group();
        for (let i=0; i<PIPES_TO_RENDER; i++) {
            // const upperPipe = this.physics.add.sprite(0, 0, 'pipe').setOrigin(0, 1);
            const upperPipe = this.pipes.create(0, 0, 'pipe').setImmovable(true).setOrigin(0,1);
            const lowerPipe = this.pipes.create(0, 0, 'pipe').setImmovable(true).setOrigin(0,0);
            this.placePipe(upperPipe, lowerPipe);
        }
        this.pipes.setVelocityX(-this.pipeVelocity);
    }

    createColliders() {
        this.physics.add.collider(this.bird, this.pipes, this.gameOver, null, this);
    }

    createScore() {
        this.score = 0; 
        const bestScore = localStorage.getItem('bestScore');

        this.scoreText = this.add.text(16, 16, `Score: ${0}`, {fontSize: '32px', fill: '#000'});
        this.add.text(16, 52, `Best Score: ${bestScore || 0}`, { fontSize: '18px', fill: '#000'});
    }

    createPause() {
        this.isPaused = false;
        const pauseButton = this.add.image(this.config.width - 10, this.config.height - 10, 'pause')
                                .setScale(3).setOrigin(1).setInteractive();
        pauseButton.on('pointerdown', ()=>{
            this.isPaused = true;
            this.physics.pause();
            this.scene.pause();
            this.scene.launch('PauseScene');
        })
    }

    handleInputs() {
        // bird.body.velocity.x = velocity;
        // debugger
        this.input.on(Phaser.Input.Events.POINTER_DOWN, function() { 
            console.log('pressing mouse button!'); 
            this.flap();
        }, this); 
        this.input.keyboard.on('keydown-SPACE', function() {
            console.log('key space down!'); 
            this.flap();
        }, this);
    }
    
    listenToEvents() {
        if (this.pauseEvent) { return; }
        this.pauseEvent = this.events.on('resume', () => {
            this.initialTime = 3;
            this.countDownText = this.add.text(...this.screenCenter, 'Resume flying in ' + this.initialTime, this.fontOptions).setOrigin(0.5);
            this.timeEvent = this.time.addEvent({
                delay: 1000, 
                callback: this.countDown, 
                callbackScope: this, 
                loop: true
            });
        });
    }

    countDown() {
        this.initialTime--;
        this.countDownText.setText('Resume flying in ' + this.initialTime);
        if (this.initialTime <= 0) {
            this.isPaused = false;
            this.countDownText.setText('');
            this.physics.resume();
            this.timeEvent.remove();
        }
    }

    checkGameStatus() {
        if (this.bird.getBounds().bottom >= this.config.height || this.bird.y <= 0) {
            this.bird.y = (this.bird.y > 0) ? this.config.height - this.bird.height : 0;
            this.gameOver();
        }        
    }

    flap() {
        if (this.isPaused) { return ; }
        this.bird.body.velocity.y = - this.flapVelocity;
    }
      
    getRightMostPipe() {
        let rightMostX = 0;
        this.pipes.getChildren().forEach(function(pipe) {
          rightMostX = Math.max(pipe.x, rightMostX);
        });
        return rightMostX;
     }
      
    placePipe(uPipe, lPipe) {
        const difficulty = this.difficulties[this.currentDifficulty];
        const rightMostX = this.getRightMostPipe();
        const pipeVerticalDistance = Phaser.Math.Between(...difficulty.pipeVerticalDistanceRange);
        const pipeVerticalPosition = Phaser.Math.Between(0 + 20, this.config.height - 20 - pipeVerticalDistance);
        const pipeHorizontalDistance = Phaser.Math.Between(...difficulty.pipeHorizontalDistanceRange);

        uPipe.x = rightMostX + pipeHorizontalDistance;
        uPipe.y = pipeVerticalPosition;
        lPipe.x = uPipe.x;
        lPipe.y = uPipe.y + pipeVerticalDistance;  
        uPipe.body.velocity.x = - this.pipeVelocity;
        lPipe.body.velocity.x = - this.pipeVelocity;    
    }
      
    recylePipes() {
        const tempPipes = [];
        this.pipes.getChildren().forEach(pipe => {
          if (pipe.getBounds().right <= 0) {
            tempPipes.push(pipe);
            if (tempPipes.length === 2) {
                this.placePipe(...tempPipes);
                this.increaseScore();
                this.saveBestScore();
                this.increaseDifficulty();
            }
          }
        });
    }

    increaseDifficulty() {
        if (this.score <= 10) {
            this.currentDifficulty = 'easy';
        }
        if (this.score <= 20) {
            this.currentDifficulty = 'normal';
        }
        if (this.score <= 30) {
            this.currentDifficulty = 'hard';
        }

    }

    increaseScore() {
        this.score ++;
        this.scoreText.setText(`Score: ${this.score}`);
    }

    saveBestScore() {
        const bestScoreText = localStorage.getItem('bestScore');
        const bestScore = bestScoreText && parseInt(bestScoreText, 10);
        if (!bestScore || this.score > bestScore) {
            localStorage.setItem('bestScore', this.score);
        }
    }

    gameOver() {
        // this.bird.x = this.config.startPosition.x;
        // this.bird.y = this.config.startPosition.y;
        // this.bird.body.velocity.y = 0;
        this.physics.pause();
        this.bird.setTint(0xd63ea6);
        this.saveBestScore();
        this.time.addEvent({delay: 1000, callback: ()=>{ this.scene.restart(); }, loop: false});
    }

}

export default  PlayScene;