import { IPoint, IRect, RectExtensions } from '@foblex/core';
import { IDraggableItem } from '../i-draggable-item';
import { EFResizeHandleType, FNodeBase } from '../../f-node';
import { FFlowMediator } from '../../infrastructure';
import { GetNormalizedNodeRectRequest } from '../domain';
import { GetNodeResizeRestrictionsRequest, INodeResizeRestrictions } from './get-node-resize-restrictions';
import { ApplyChildResizeRestrictionsRequest } from './apply-child-resize-restrictions';
import { CalculateChangedSizeRequest } from './calculate-changed-size';
import { CalculateChangedPositionRequest } from './calculate-changed-position';
import { ApplyParentResizeRestrictionsRequest } from './apply-parent-resize-restrictions';

export class NodeResizeDragHandler implements IDraggableItem {

  private originalRect!: IRect;

  private restrictions!: INodeResizeRestrictions;

  private childRestrictions: (rect: IRect, restrictionsRect: IRect) => void = () => {};

  constructor(
    private fMediator: FFlowMediator,
    public fNode: FNodeBase,
    public fResizeHandleType: EFResizeHandleType,
  ) {
  }

  public initialize(): void {
    this.originalRect = this.fMediator.send<IRect>(new GetNormalizedNodeRectRequest(this.fNode));

    this.restrictions = this.fMediator.send<INodeResizeRestrictions>(new GetNodeResizeRestrictionsRequest(this.fNode, this.originalRect));
    if(this.restrictions.childRect) {
      this.childRestrictions = (rect: IRect, restrictionsRect: IRect) => {
        this.applyChildRestrictions(rect, restrictionsRect);
      };
    }
  }

  public move(difference: IPoint): void {
    const changedRect = this.changePosition(difference, this.changeSize(difference));

    this.childRestrictions(changedRect, this.restrictions.childRect!);
    this.applyParentRestrictions(changedRect, this.restrictions.parentRect);

    this.fNode.updatePosition(changedRect);
    this.fNode.updateSize(changedRect);
    this.fNode.redraw();
  }

  private changeSize(difference: IPoint): IRect {
    return this.fMediator.send<IRect>(
      new CalculateChangedSizeRequest(this.originalRect, difference, this.fResizeHandleType)
    );
  }

  private changePosition(difference: IPoint, changedRect: IRect): IRect {
    return this.fMediator.send<IRect>(
      new CalculateChangedPositionRequest(this.originalRect, changedRect, difference, this.fResizeHandleType)
    );
  }

  private applyChildRestrictions(rect: IRect, restrictionsRect: IRect): void {
    this.fMediator.send(
      new ApplyChildResizeRestrictionsRequest(rect, restrictionsRect)
    );
  }

  private applyParentRestrictions(rect: IRect, restrictionsRect: IRect): void {
    this.fMediator.send(
      new ApplyParentResizeRestrictionsRequest(rect, restrictionsRect)
    );
  }

  public complete(): void {
    this.fNode.sizeChange.emit(
      RectExtensions.initialize(
        this.fNode.position.x, this.fNode.position.y, this.fNode.size.width, this.fNode.size.height
      )
    );
  }
}
