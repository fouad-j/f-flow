import { IPoint, IRect, Point } from '@foblex/core';
import { FComponentsStore } from '../../f-storage';
import { IDraggableItem } from '../../f-draggable';
import { FFlowMediator } from '../../infrastructure';
import { CalculateFlowPointFromMinimapPointRequest } from './calculate-flow-point-from-minimap-point';
import { FMinimapData } from './f-minimap-data';

export class FMinimapDragHandler implements IDraggableItem {

  private lastDifference: IPoint | null = null;

  constructor(
    private fComponentsStore: FComponentsStore,
    private fMediator: FFlowMediator,
    private flowRect: IRect,
    private canvasPosition: IPoint,
    private eventPoint: IPoint,
    private minimap: FMinimapData
  ) {
  }

  public initialize(): void {
    this.fComponentsStore.fCanvas?.hostElement.classList.add('f-scaled-animate');
  }

  public move(difference: IPoint): void {
    if (this.lastDifference && this.isSamePoint(difference, this.lastDifference)) {
      return;
    }

    this.lastDifference = difference;
    this.fComponentsStore.fCanvas!.setPosition(this.getNewPosition(Point.fromPoint(this.eventPoint).add(difference)));
    this.fComponentsStore.fCanvas!.redraw();
  }

  private isSamePoint(point1: IPoint, point2: IPoint): boolean {
    return point1.x === point2.x && point1.y === point2.y;
  }

  private getNewPosition(eventPoint: IPoint): IPoint {
    return this.fMediator.send<IPoint>(new CalculateFlowPointFromMinimapPointRequest(
      this.flowRect, this.canvasPosition, eventPoint, this.minimap
    ));
  }

  public complete(): void {
    this.fComponentsStore.fCanvas?.hostElement.classList.remove('f-scaled-animate');
    this.fComponentsStore.fCanvas!.completeDrag();
  }
}
