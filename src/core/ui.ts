
interface GameStateRenderData {

}

interface RenderableState<RENDER_DATA extends GameStateRenderData> {
  isReadyToRender(): boolean;
  isDoneUpdating(): boolean;
  getRenderData(): RENDER_DATA;
}

interface StateRenderer<GRAPHICS_CONTEXT, RENDER_DATA extends GameStateRenderData> {
  getName(): string;
  isActiveOnStart(): boolean;
  renderData(context: GRAPHICS_CONTEXT, data: RENDER_DATA): void;
}
