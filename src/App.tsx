import { h, Component } from 'preact';
import * as PIXI from 'pixi.js';
import ndarray = require('ndarray');
import './App.css';
import 'material-design-icons/iconfont/material-icons.css';
import 'mdi/css/materialdesignicons.css';
import 'mdi/fonts/materialdesignicons-webfont.ttf';
import 'mdi/fonts/materialdesignicons-webfont.woff';
import 'mdi/fonts/materialdesignicons-webfont.woff2';

type CSSProperties = { [attr: string]: string | number | undefined };

interface Coordinates {
  x: number;
  y: number;
}

const WIDTH = 5;
const HEIGHT = 5;
const BOX_GUTTER = 1;

interface IconProps {
  className?: string;
  name?: string;
  style?: CSSProperties;
}

const Icon = ({ name, style, className, ...other }: IconProps) => (
  <i
    style={{ ...{ fontFamily: 'Material Design Icons' }, ...style }}
    className={['material-icons', `mdi-${name}`, `${className}`].filter(Boolean).join(' ')}
    {...other}
  />
);

const generateField = (numRows: number, numCols: number, random: number = 0): ndarray =>
  ndarray(
    new Array(numRows * numCols).fill(null).map(() => Math.random() < random ? 1 : 0),
    [numRows, numCols]
  );

function createNewGeneration(prev: ndarray, next: ndarray): ndarray {
  var nx = prev.shape[0],
      ny = prev.shape[1];

  for (var i = 1; i < nx - 1; ++i) {
    for (var j = 1; j < ny - 1; ++j) {
      var n = 0;
      for (var dx = -1; dx <= 1; ++dx) {
        for (var dy = -1; dy <= 1; ++dy) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          n += prev.get(i + dx, j + dy);
        }
      }
      next.set(i, j, (prev.get(i, j) && (n === 2 || n === 3) || n === 3 ? 1 : 0));
    }
  }

  return next;
}

interface IconButtonProps {
  name: string;
  onClick: any; // tslint:disable-line no-any
}

const IconButton = ({ name, onClick }: IconButtonProps) => (
  <button className="button" onClick={onClick}>
    <Icon name={name} />
  </button>
);

interface SurfaceProps {
  numRows?: number;
  numCols?: number;
  gutters?: boolean;
  play?: boolean;
  random?: number;
  reset?: boolean;
  step?: boolean;
}

class Surface extends Component<SurfaceProps, {}> {
  field: ndarray = ndarray([]);
  renderer?: PIXI.WebGLRenderer | PIXI.CanvasRenderer;
  stage?: PIXI.Container;
  graphics?: PIXI.Graphics;
  cursorGraphics?: PIXI.Graphics;
  mouse?: Coordinates;

  get height() {
    return this.base ? this.base.clientHeight : 100;
  }

  get width() {
    return this.base ? this.base.clientWidth : 100;
  }

  get numRows() {
    return this.props.numRows || Math.floor(this.height / HEIGHT) || 50;
  }

  get numCols() {
    return this.props.numCols || Math.floor(this.width / WIDTH) || 50;
  }

  init() {
    const { random } = this.props;

    this.renderer = PIXI.autoDetectRenderer(this.width, this.height);
    if (this.base) { this.base.appendChild(this.renderer.view); }
    this.stage = new PIXI.Container();
    this.field = generateField(this.numRows, this.numCols, random);
    this.graphics = new PIXI.Graphics();
    this.stage.addChild(this.graphics);

    this.draw();
    this.update();
  }

  draw() {
    const { gutters } = this.props;
    const boxWidth = this.width / this.numCols;
    const boxHeight = this.height / this.numRows;
    const boxGutter = !gutters || boxWidth < 5 || boxHeight < 5 ?  0 : BOX_GUTTER;

    if (this.graphics) {
      this.graphics.clear();

      for (let r = 0; r < this.numRows; r++) {
        for (let c = 0; c < this.numCols; c++) {
          if (this.graphics && this.field.get(r, c)) {
            this.graphics.beginFill(0xFEFEFE);
            this.graphics.drawRect(
              c * boxWidth + boxGutter,
              r * boxHeight + boxGutter,
              boxWidth - boxGutter * 2,
              boxHeight - boxGutter * 2
            );
          }
        }
      }

      if (window.innerWidth > 768 && this.mouse) {
        const r = Math.floor(this.mouse.y / (this.height / this.numRows));
        const c = Math.floor(this.mouse.x / (this.width / this.numCols));

        const mouseSize = 2;
        this.graphics.lineStyle(mouseSize, 0xFFFF00, 1);
        this.graphics.beginFill(0x000000, 0);
        this.graphics.drawRect(
          c * boxWidth - mouseSize / 2 + 1,
          r * boxHeight - mouseSize / 2 + 1,
          boxWidth + mouseSize - 2,
          boxHeight + mouseSize - 2
        );
      }
    }
  }

  step() { this.field = createNewGeneration(this.field, generateField(this.numRows, this.numCols)); }

  update() {
    requestAnimationFrame(() => this.update());
    if (this.props.play) { this.step(); }
    this.draw();
    if (this.renderer && this.stage) { this.renderer.render(this.stage); }
  };

  destroy() {
    this.field.data = [];
    this.graphics = undefined;
    this.stage = undefined;
    if (this.base && this.renderer) { this.base.removeChild(this.renderer.view); }
    this.renderer = undefined;
  }

  // tslint:disable-next-line no-any
  toggleState(e: any) {
    if (!this.base) { return; }
    const r = Math.floor(e.offsetY / (this.height / this.numRows));
    const c = Math.floor(e.offsetX / (this.width / this.numCols));
    this.field.set(r, c, this.field.get(r, c) ? 0 : 1);
  }

  componentDidMount() {
    if (this.base) {
      this.init();
    }
  }

  componentWillReceiveProps(next: SurfaceProps) {
    if (next.numRows !== this.props.numRows
     || next.numCols !== this.props.numCols) {
      setTimeout(
        () => {
          this.destroy();
          this.init(); // TOOD: fix this!  not working at all
        },
        150,
      );
    } else if (next.step && !this.props.step) {
      this.step();
    } else if (next.reset && !this.props.reset) {
      this.destroy();
      this.init();
    }
  }

  shouldComponentUpdate() {
    return false;
  }

  componentWillUnmount() {
    this.destroy();
  }

  render() {
    return (
      <div
        style={{ width: '100%', height: '100%' }}
        onClick={e => this.toggleState(e)}
        // tslint:disable-next-line no-any
        onMouseMove={(e: any) => { this.mouse = { x: e.offsetX, y: e.offsetY }; }}
        onMouseOut={() => { this.mouse = undefined; }}
      />
    );
  }
}

interface LabState {
  play: boolean;
  step: boolean;
  reset: boolean;
  numRows: number;
  numCols: number;
  gutters: boolean;
}

class Lab extends Component<{}, LabState> {
  state = {
    play: false,
    step: false,
    reset: false,
    numRows: Math.floor((window.innerHeight - 40) / WIDTH),
    numCols: Math.floor(window.innerWidth / HEIGHT),
    gutters: true,
  };

  // tslint:disable-next-line no-any
  updateState(state: any) {
    this.setState({ ...this.state, ...state });
  }

  // tslint:disable-next-line no-any
  setAndReset(prop: string, tempValue: any, newOldValue?: any) {
    const oldValue = typeof newOldValue !== 'undefined' ? newOldValue : this.state[prop];
    this.updateState({ [prop]: tempValue });
    setTimeout(() => this.updateState({ [prop]: oldValue }), 250);
  }

  componentDidMount() {
    // window.addEventListener('resize', () => setTimeout(() => this.forceUpdate(), 150));
  }

  render() {
    const { numCols, numRows, gutters, play, reset, step } = this.state;
    return (
      <div className="container">
        <div className="surface">
          <Surface
            numCols={numCols}
            numRows={numRows}
            gutters={gutters}
            random={0.25}
            play={play}
            reset={reset}
            step={step}
          />
        </div>
        <div className="toolbar">
          <IconButton
            name={!this.state.play ? 'play' : 'stop'}
            onClick={() => this.updateState({ play: !this.state.play })}
          />
          <IconButton name="step-forward" onClick={() => this.setAndReset('step', true, false)} />
          <IconButton name="refresh" onClick={() => this.setAndReset('reset', true, false)} />
          <IconButton
            name={!this.state.gutters ? 'border-none' : 'border-outside'}
            onClick={() => this.updateState({ gutters: !this.state.gutters })}
          />
          <input
            type="number"
            value={numRows.toString()}
            min={10}
            max={1000}
            // tslint:disable-next-line no-any
            onChange={(e: any) => this.updateState({ numRows: parseInt(e.target.value, 10) })}
          />
          <span className="toolbar-text">x</span>
          <input
            type="number"
            value={numCols.toString()}
            min={10}
            max={1000}
            // tslint:disable-next-line no-any
            onChange={(e: any) => this.updateState({ numCols: parseInt(e.target.value, 10) })}
          />
        </div>
      </div>
    );
  }
}

export default class App extends Component<null, null> {
  render() {
    return <Lab />;
  }
}
