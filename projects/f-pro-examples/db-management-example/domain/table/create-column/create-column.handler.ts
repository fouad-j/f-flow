import { GuidExtensions, IHandler } from '@foblex/core';
import { CreateColumnRequest } from './create-column.request';
import { IDatabaseStorage } from '../../database.storage';
import { ITableStorageModel } from '../i-table-storage-model';
import { ETableColumnType } from '../e-table-column-type';

export class CreateColumnHandler implements IHandler<CreateColumnRequest> {

  constructor(
    private storage: IDatabaseStorage
  ) {
  }

  public handle(request: CreateColumnRequest): void {
    const table = this.findTable(request.tableId);
    table.columns.push({
      id: GuidExtensions.generate(),
      name: 'column_' + (table.columns.length + 1),
      type: ETableColumnType.INT
    });
  }

  private findTable(id: string): ITableStorageModel {
    const result = this.storage.tables.find((x) => x.id === id);
    if (!result) {
      throw new Error(`Table with id ${ id } not found`);
    }
    return result;
  }
}
