///
/// Copyright © 2016-2026 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { WidgetContext } from '@home/models/widget-component.models';
import {
  LoadNodesCallback,
  NavTreeEditCallbacks,
  NodeSelectedCallback,
  NavTreeNode,
  NodesCallback
} from '@shared/components/nav-tree.component';
import { AssetInfo } from '@shared/models/asset.models';
import { Authority } from '@shared/models/authority.enum';
import { EntityType } from '@shared/models/entity-type.models';
import {
  AssetTreeNode,
  AssetTreeWidgetSettings,
  assetTreeWidgetDefaultSettings
} from './asset-tree-widget.models';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { PageLink } from '@shared/models/page/page-link';

@Component({
    selector: 'tb-asset-tree-widget',
    templateUrl: './asset-tree-widget.component.html',
    styleUrls: ['./asset-tree-widget.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class AssetTreeWidgetComponent extends PageComponent implements OnInit, OnDestroy {

  @Input()
  ctx!: WidgetContext;

  settings: AssetTreeWidgetSettings = assetTreeWidgetDefaultSettings;
  nodeEditCallbacks: NavTreeEditCallbacks = {};

  loadNodes: LoadNodesCallback = (node: NavTreeNode, cb: NodesCallback) => {
    if (node.id === '#') {
      console.log('[AssetTree] loadNodes called for root, nodesLoaded=' + this.nodesLoaded);
      if (this.nodesLoaded) {
        const roots = this.buildRootNodes();
        console.log('[AssetTree] root nodes:', roots.map(n => n.id.substring(0,8) + ',children=' + n.children));
        cb(roots);
      } else {
        cb([]);
      }
    } else {
      console.log('[AssetTree] loadNodes called for child:', node.id.substring(0,8));
      cb(this.buildChildNodes(node.id));
    }
  };

  onNodeSelected: NodeSelectedCallback = (node: NavTreeNode, event: Event) => {
    if (!node?.data?.assetInfo) return;
    const info = node.data.assetInfo as AssetInfo;
    if (!info || !this.ctx) return;
    const descriptors = this.ctx.actionsApi.getActionDescriptors('nodeSelected');
    if (descriptors.length) {
      this.ctx.actionsApi.handleWidgetAction(
        event, descriptors[0],
        info.id, info.name,
        { assetId: info.id?.id, assetName: info.name },
        info.label
      );
    }
  };

  private assetMap = new Map<string, AssetInfo>();
  private parentToChildren = new Map<string, string[]>();
  private childToParent = new Map<string, string>();
  private nodesLoaded = false;
  private destroy$ = new Subject<void>();

  constructor(protected store: Store<AppState>) {
    super(store);
  }

  ngOnInit(): void {
    if (this.ctx) {
      this.doInit();
    } else {
      setTimeout(() => this.doInit(), 0);
    }
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private doInit(): void {
    if (!this.ctx) return;
    this.ctx.$scope.assetTreeWidget = this;
    this.settings = { ...assetTreeWidgetDefaultSettings, ...(this.ctx.settings || {}) };
    this.loadAssetTree();
  }

  private buildChildNodes(parentId: string): AssetTreeNode[] {
    const childIds = this.parentToChildren.get(parentId) || [];
    const children = childIds
      .map(id => this.buildNode(id))
      .filter((n): n is AssetTreeNode => n !== null);
    if (this.settings.sortByName) {
      children.sort((a, b) => ((a.data?.assetInfo as any)?.name || '').localeCompare((b.data?.assetInfo as any)?.name || ''));
    }
    return children;
  }

  private buildNode(assetId: string): AssetTreeNode | null {
    const asset = this.assetMap.get(assetId);
    if (!asset) return null;
    const childIds = this.parentToChildren.get(assetId);
    const hasChildren = childIds && childIds.length > 0;
    return {
      id: assetId,
      icon: false,
      text: this.buildNodeText(asset),
      state: {
        opened: this.settings.autoExpandDepth === -1 ||
          (this.settings.autoExpandDepth > 0 && this.getDepth(assetId) < this.settings.autoExpandDepth),
        disabled: false
      },
      children: hasChildren ? true : false,
      data: {
        assetInfo: asset,
        childAssetIds: childIds || []
      }
    };
  }

  private escapeHtml(value: string): string {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(value));
    return div.innerHTML;
  }

  private buildNodeText(asset: AssetInfo): string {
    const icon = `<i class="material-icons node-icon">${this.escapeHtml(this.settings.assetIcon)}</i>`;
    let text = `<span class="tb-node-text">${this.escapeHtml(asset.name || '')}</span>`;
    if (this.settings.showAssetType && asset.type) {
      text += ` <span class="tb-asset-type">(${this.escapeHtml(asset.type)})</span>`;
    }
    return icon + text;
  }

  private buildRootNodes(): NavTreeNode[] {
    const rootNodes: AssetTreeNode[] = [];
    this.assetMap.forEach((asset, id) => {
      if (!this.childToParent.has(id)) {
        const node = this.buildNode(id);
        if (node) rootNodes.push(node);
      }
    });
    if (this.settings.sortByName) {
      rootNodes.sort((a, b) => ((a.data?.assetInfo as any)?.name || '').localeCompare((b.data?.assetInfo as any)?.name || ''));
    }
    return rootNodes;
  }

  private loadAssetTree(): void {
    const authority = this.ctx.currentUser?.authority;
    const customerId = this.ctx.currentUser?.customerId;
    const pageLink = new PageLink(10000);

    let assets$;
    if (authority === Authority.TENANT_ADMIN || authority === Authority.SYS_ADMIN) {
      assets$ = this.ctx.assetService.getTenantAssetInfos(pageLink, '',
        { ignoreErrors: false, ignoreLoading: true });
    } else if (authority === Authority.CUSTOMER_USER) {
      assets$ = this.ctx.assetService.getCustomerAssetInfos(customerId, pageLink, '',
        { ignoreErrors: true, ignoreLoading: true });
    } else {
      assets$ = this.ctx.assetService.getTenantAssetInfos(pageLink, '',
        { ignoreErrors: true, ignoreLoading: true });
    }

    assets$.pipe(
      takeUntil(this.destroy$),
      catchError((err) => { console.error('[AssetTree] loadAssetTree error', err); return of({ data: [] }); })
    ).subscribe((assetsPage: any) => {
      const assets: AssetInfo[] = assetsPage?.data || [];
      console.log('[AssetTree] Total assets loaded:', assets.length);
      for (const asset of assets) {
        if (asset.id?.id) {
          this.assetMap.set(asset.id.id, asset);
        }
      }
      // Load all Contains relations for all assets to build hierarchy
      this.loadAllRelations();
    });
  }

  private loadAllRelations(): void {
    const assetIds = Array.from(this.assetMap.keys());
    if (assetIds.length === 0) {
      this.finishLoading();
      return;
    }
    const requests = assetIds.map(assetId => {
      const entityId = this.assetMap.get(assetId)?.id;
      if (!entityId) return of([]);
      return this.ctx.entityRelationService.findByFromAndType(entityId, 'Contains',
        { ignoreErrors: true, ignoreLoading: true }).pipe(catchError(() => of([])));
    });
    forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe((results: any[]) => {
      for (let i = 0; i < assetIds.length; i++) {
        const fromId = assetIds[i];
        const relations = results[i] || [];
        for (const rel of relations) {
          if (rel.to?.entityType === EntityType.ASSET && rel.to?.id) {
            if (!this.parentToChildren.has(fromId)) {
              this.parentToChildren.set(fromId, []);
            }
            this.parentToChildren.get(fromId)!.push(rel.to.id);
            this.childToParent.set(rel.to.id, fromId);
            // Add child to map if not already there
            if (!this.assetMap.has(rel.to.id)) {
              this.assetMap.set(rel.to.id, {
                id: rel.to,
                name: rel.toName || rel.to.id,
                label: rel.toName || rel.to.id,
                assetProfileName: ''
              } as AssetInfo);
            }
          }
        }
      }
      this.finishLoading();
    });
  }

  private getDepth(assetId: string): number {
    let depth = 0;
    let current = assetId;
    while (this.childToParent.has(current)) {
      depth++;
      current = this.childToParent.get(current)!;
    }
    return depth;
  }

  private finishLoading(): void {
    this.nodesLoaded = true;
    this.ctx.detectChanges();
    if (this.nodeEditCallbacks.refreshNode) {
      this.nodeEditCallbacks.refreshNode('#');
    }
  }
}
