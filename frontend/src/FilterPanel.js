import React, { useState } from 'react';

const FilterPanel = ({
  selectedNamespace,
  namespaces,
  onNamespaceChange,
  resourceTypes,
  selectedResourceTypes,
  onResourceTypesChange,
  connectionTypes,
  selectedConnectionTypes,
  onConnectionTypesChange,
  showPodToPod,
  onShowPodToPodChange,
  showPVC,
  onShowPVCChange,
  searchTerm,
  onSearchChange,
  onExport,
  onReset,
  layerOrder,
  onLayerOrderChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const resourceTypeOptions = [
    { value: 'Deployment', label: 'Deployments', color: '#3b82f6' },
    { value: 'StatefulSet', label: 'StatefulSets', color: '#a855f7' },
    { value: 'Service', label: 'Services', color: '#10b981' },
    { value: 'Pod', label: 'Pods', color: '#059669' },
    { value: 'ConfigMap', label: 'ConfigMaps', color: '#eab308' },
    { value: 'Secret', label: 'Secrets', color: '#ef4444' },
    { value: 'Ingress', label: 'Ingress', color: '#6366f1' },
    { value: 'PVC', label: 'PVCs', color: '#6b7280' },
    { value: 'DaemonSet', label: 'DaemonSets', color: '#f97316' },
  ];

  const connectionTypeOptions = [
    { value: 'exposes', label: 'Exposes', color: '#10b981', desc: 'Deployment → Service' },
    { value: 'manages', label: 'Manages', color: '#f59e0b', desc: 'Deployment → Pod' },
    { value: 'routes-to', label: 'Routes To', color: '#06b6d4', desc: 'Service → Pod' },
    { value: 'exposed-by', label: 'Exposed By', color: '#3b82f6', desc: 'Service → Ingress' },
    { value: 'uses-secret', label: 'Uses Secret', color: '#ef4444', desc: 'Deployment → Secret' },
    { value: 'uses', label: 'Uses PVC', color: '#8b5cf6', desc: 'Deployment → PVC' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>🔍</span> Filters & Controls
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Namespace Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Namespace:
            </label>
            <select
              value={selectedNamespace}
              onChange={onNamespaceChange}
              className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Namespaces</option>
              {namespaces.map((ns) => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Search Resources:
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name..."
              className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Resource Type Filters */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Resource Types:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {resourceTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedResourceTypes.includes(option.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onResourceTypesChange([...selectedResourceTypes, option.value]);
                      } else {
                        onResourceTypesChange(selectedResourceTypes.filter(t => t !== option.value));
                      }
                    }}
                    className="rounded"
                  />
                  <span
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: option.color }}
                  ></span>
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Connection Type Filters */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Connection Types:
            </label>
            <div className="space-y-1">
              {connectionTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedConnectionTypes.includes(option.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onConnectionTypesChange([...selectedConnectionTypes, option.value]);
                      } else {
                        onConnectionTypesChange(selectedConnectionTypes.filter(t => t !== option.value));
                      }
                    }}
                    className="rounded"
                  />
                  <span
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: option.color }}
                  ></span>
                  <span className="text-sm flex-1">{option.label}</span>
                  <span className="text-xs text-gray-500">{option.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="border-t pt-3">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Advanced Options:
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPodToPod}
                  onChange={(e) => onShowPodToPodChange(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Show Pod-to-Pod Connections</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPVC}
                  onChange={(e) => onShowPVCChange(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Highlight PVC Mappings</span>
              </label>
            </div>
          </div>

          {/* Layer Ordering */}
          <div className="border-t pt-3">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Layer Order (Drag to Reorder):
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {layerOrder.map((layer, index) => (
                <div
                  key={layer}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                >
                  <span className="text-xs text-gray-500 w-6">{index + 1}</span>
                  <span className="flex-1 text-sm font-medium">{layer}</span>
                  <button
                    onClick={() => {
                      if (index > 0) {
                        const newOrder = [...layerOrder];
                        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                        onLayerOrderChange(newOrder);
                      }
                    }}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => {
                      if (index < layerOrder.length - 1) {
                        const newOrder = [...layerOrder];
                        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                        onLayerOrderChange(newOrder);
                      }
                    }}
                    disabled={index === layerOrder.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                // Reset to default order
                onLayerOrderChange(['Ingress', 'Service', 'Deployment', 'StatefulSet', 'DaemonSet', 'Pod', 'ConfigMap', 'Secret', 'PVC']);
              }}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Reset to Default Order
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t">
            <button
              onClick={onExport}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              📥 Export
            </button>
            <button
              onClick={onReset}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              🔄 Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;

