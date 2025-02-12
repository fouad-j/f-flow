import { IHandler, ITransformModel, Point } from '@foblex/core';
import { Injectable } from '@angular/core';
import { CreateConnectionDragHandlerRequest } from './create-connection-drag-handler.request';
import { FComponentsStore } from '../../../../../f-storage';
import { FExecutionRegister, FFlowMediator } from '../../../../../infrastructure';
import { FDraggableDataContext } from '../../../../f-draggable-data-context';
import { CreateConnectionDragHandler } from '../../create-connection.drag-handler';

@Injectable()
@FExecutionRegister(CreateConnectionDragHandlerRequest)
export class CreateConnectionDragHandlerExecution
  implements IHandler<CreateConnectionDragHandlerRequest, void> {

  private get flowHost(): HTMLElement {
    return this.fComponentsStore.flowHost;
  }

  private get transform(): ITransformModel {
    return this.fComponentsStore.fCanvas!.transform;
  }

  constructor(
    private fComponentsStore: FComponentsStore,
    private fDraggableDataContext: FDraggableDataContext,
    private fMediator: FFlowMediator,
  ) {
  }

  public handle(request: CreateConnectionDragHandlerRequest): void {
    this.fComponentsStore.fTempConnection!.fOutputId = request.connector.id;
    this.fComponentsStore.fTempConnection!.initialize();

    this.fDraggableDataContext.onPointerDownScale = this.transform.scale;
    const positionRelativeToFlowComponent = Point.fromPoint(request.onPointerDownPosition).elementTransform(this.flowHost).div(this.transform.scale);
    this.fDraggableDataContext.onPointerDownPosition = positionRelativeToFlowComponent;

    const positionRelativeToCanvasComponent = Point.fromPoint(positionRelativeToFlowComponent).mult(this.transform.scale)
      .sub(this.transform.position).sub(this.transform.scaledPosition).div(this.transform.scale);

    this.fDraggableDataContext.draggableItems = [
      new CreateConnectionDragHandler(this.fMediator, this.fComponentsStore.fTempConnection!, positionRelativeToCanvasComponent)
    ];
  }
}
