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

import { NavTreeNode } from '@shared/components/nav-tree.component';
import { AssetInfo } from '@shared/models/asset.models';

export interface AssetTreeWidgetSettings {
  /** jstree built-in search bar */
  showSearch: boolean;
  /** Auto-expand nodes to this depth level (0 = none, -1 = all) */
  autoExpandDepth: number;
  /** Icon for asset nodes (Material Icons name) */
  assetIcon: string;
  /** Show asset type as subtitle */
  showAssetType: boolean;
  /** Sort nodes by name ascending */
  sortByName: boolean;
}

export const assetTreeWidgetDefaultSettings: AssetTreeWidgetSettings = {
  showSearch: true,
  autoExpandDepth: 10,
  assetIcon: 'domain',
  showAssetType: true,
  sortByName: true
};

export interface AssetTreeNode extends NavTreeNode {
  data?: {
    assetInfo?: AssetInfo;
    childAssetIds?: string[];
  };
}
