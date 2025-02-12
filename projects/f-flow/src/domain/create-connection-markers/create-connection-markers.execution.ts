import { Injectable } from '@angular/core';
import { CreateConnectionMarkersRequest } from './create-connection-markers-request';
import { FConnectionBase, FMarkerBase } from '../../f-connection';
import { FExecutionRegister, IExecution } from '../../infrastructure';
import { BrowserService } from '@foblex/platform';

@Injectable()
@FExecutionRegister(CreateConnectionMarkersRequest)
export class CreateConnectionMarkersExecution implements IExecution<CreateConnectionMarkersRequest, void> {

  constructor(
    private fBrowser: BrowserService
  ) {
  }

  public handle(request: CreateConnectionMarkersRequest): void {
    const element: SVGDefsElement = createSVGElement('defs', this.fBrowser);
    const fConnection = request.fConnection;

    fConnection.fMarkers.forEach((marker) => {

      const markerElement = this.createMarkerElement(marker, fConnection.fId);

      const clone = marker.hostElement.cloneNode(true) as HTMLElement;
      clone.setAttribute('height', `${ marker.height }`);
      clone.setAttribute('width', `${ marker.width }`);
      clone.removeAttribute('markerUnits');
      clone.style.display = 'unset';
      markerElement.append(clone);

      element.append(markerElement);
    });

    fConnection.fDefs.nativeElement.innerHTML = element.innerHTML;

    this.makeSafariCompatible(fConnection);
  }

  // Safari does not support markers on path elements if markers are defined after the path element
  private makeSafariCompatible(fConnection: FConnectionBase): void {
    fConnection.fPath.hostElement.replaceWith(fConnection.fPath.hostElement);
  }

  private createMarkerElement(marker: FMarkerBase, fConnectionId: string): SVGElement {
    const markerElement = createSVGElement('marker', this.fBrowser);

    markerElement.setAttribute('id', sanitizeElementId(marker.type + '-' + fConnectionId));

    markerElement.setAttribute('markerHeight', `${ marker.height }`);
    markerElement.setAttribute('markerWidth', `${ marker.width }`);
    markerElement.setAttribute('orient', `${ marker.orient }`);
    markerElement.setAttribute('refX', `${ marker.refX }`);
    markerElement.setAttribute('refY', `${ marker.refY }`);
    markerElement.setAttribute('markerUnits', `${ marker.markerUnits }`);

    return markerElement;
  }
}
function sanitizeElementId(id: string): string {
  if (!id.match(/^[a-zA-Z_]/)) {
    id = '_' + id;
  }
  return id.replace(/[^a-zA-Z0-9_\-:.]/g, '_');
}
function createSVGElement<K extends keyof SVGElementTagNameMap>(tag: K, fBrowser: BrowserService): SVGElementTagNameMap[K] {
  return fBrowser.document.createElementNS('http://www.w3.org/2000/svg', tag);
}
